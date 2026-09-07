import csv
import hmac
import io
import secrets
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, File, HTTPException, Request, Response, UploadFile

from ..admin_store import (
    ADMIN_SENTINEL_ID,
    ADMIN_SESSION_COOKIE,
    get_admin_config,
    save_admin_config,
    support_requests_store,
)
from ..auth import create_session_token, find_user_by_email, hash_password, users_store, verify_password, verify_session_token
from ..config import APP_MODE
from ..email_settings import get_email_config, save_email_config
from ..email_utils import EmailDisabledError, EmailNotConfiguredError, send_email, send_test_email, try_send_notification
from ..membership import get_member, owner_count
from ..rate_limit import enforce_rate_limit
from ..schemas import (
    AdminBulkIdsIn,
    AdminChangePasswordIn,
    AdminCreateUserIn,
    AdminEmailSettingsIn,
    AdminEmailTestIn,
    AdminLoginIn,
    AdminLoginSettingsIn,
    AdminMoveArticleIn,
    AdminProjectUpdateIn,
    AdminSendEmailIn,
    AdminSetupIn,
)
from ..store import get_articles_store, get_comments_store, get_folders_store, get_tags_store, projects_index_store


def _block_in_desktop_mode() -> None:
    if APP_MODE == "desktop":
        raise HTTPException(status_code=404, detail="デスクトップ版では利用できません")


router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(_block_in_desktop_mode)])

COOKIE_MAX_AGE = 30 * 86400


def get_current_admin(kv_admin_session: Optional[str] = Cookie(default=None)) -> None:
    if not kv_admin_session or verify_session_token(kv_admin_session) != ADMIN_SENTINEL_ID:
        raise HTTPException(status_code=401, detail="管理者ログインが必要です")


def _require_project(project_id: str) -> dict:
    project = projects_index_store.read(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    return project


def _present_member(project: dict, m: dict) -> dict:
    u = users_store.read(m["userId"])
    return {
        **m,
        "displayName": u["displayName"] if u else "(削除されたユーザー)",
        "email": u["email"] if u else "",
    }


# --- 認証・初回セットアップ -------------------------------------------------

def _set_admin_cookie(response: Response) -> None:
    token = create_session_token(ADMIN_SENTINEL_ID)
    response.set_cookie(
        key=ADMIN_SESSION_COOKIE, value=token, max_age=COOKIE_MAX_AGE,
        httponly=True, samesite="lax", path="/",
    )


@router.get("/status")
def admin_status():
    return {"configured": bool(get_admin_config().get("configured"))}


@router.post("/setup")
def admin_setup(payload: AdminSetupIn, request: Request, response: Response):
    enforce_rate_limit(request, "admin-setup", max_attempts=10, window_seconds=60)
    cfg = get_admin_config()
    if cfg.get("configured"):
        raise HTTPException(status_code=409, detail="管理者アカウントは既に設定されています")
    expected_token = cfg.get("setupToken") or ""
    if not expected_token or not hmac.compare_digest(payload.setupToken.strip(), expected_token):
        raise HTTPException(status_code=403, detail="初期設定トークンが正しくありません。サーバーの起動ログを確認してください")
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="ユーザー名を入力してください")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="パスワードは8文字以上にしてください")
    cfg["username"] = username
    cfg["passwordHash"] = hash_password(payload.password)
    cfg["configured"] = True
    cfg.pop("setupToken", None)
    save_admin_config(cfg)
    _set_admin_cookie(response)
    return {"ok": True}


@router.post("/login")
def admin_login(payload: AdminLoginIn, request: Request, response: Response):
    enforce_rate_limit(request, "admin-login", max_attempts=10, window_seconds=60)
    cfg = get_admin_config()
    if not cfg.get("configured"):
        raise HTTPException(status_code=400, detail="管理者アカウントが未設定です。先に初期設定を行ってください")
    if payload.username != cfg.get("username") or not verify_password(payload.password, cfg["passwordHash"]):
        raise HTTPException(status_code=401, detail="ユーザー名またはパスワードが正しくありません")
    _set_admin_cookie(response)
    return {"ok": True}


@router.post("/logout")
def admin_logout(response: Response):
    response.delete_cookie(ADMIN_SESSION_COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
def admin_me(_: None = Depends(get_current_admin)):
    return {"loggedIn": True, "username": get_admin_config().get("username")}


@router.post("/change-password")
def change_password(payload: AdminChangePasswordIn, _: None = Depends(get_current_admin)):
    cfg = get_admin_config()
    if not verify_password(payload.currentPassword, cfg["passwordHash"]):
        raise HTTPException(status_code=400, detail="現在のパスワードが正しくありません")
    if len(payload.newPassword) < 8:
        raise HTTPException(status_code=400, detail="新しいパスワードは8文字以上にしてください")
    cfg["passwordHash"] = hash_password(payload.newPassword)
    save_admin_config(cfg)
    return {"ok": True}


# --- ログイン機能の有効化／無効化 -------------------------------------------

@router.get("/login-settings")
def get_login_settings(_: None = Depends(get_current_admin)):
    return {"loginEnabled": get_admin_config().get("loginEnabled", True)}


@router.put("/login-settings")
def update_login_settings(payload: AdminLoginSettingsIn, _: None = Depends(get_current_admin)):
    cfg = get_admin_config()
    cfg["loginEnabled"] = payload.loginEnabled
    save_admin_config(cfg)
    return {"loginEnabled": cfg["loginEnabled"]}


# --- 全ユーザーの管理 -------------------------------------------------------

def _public_user(u: dict) -> dict:
    return {"id": u["id"], "email": u["email"], "displayName": u["displayName"], "createdAt": u.get("createdAt")}


def _create_user_record(email: str, display_name: str, password: str) -> dict:
    email = email.strip().lower()
    if not email or "@" not in email:
        raise ValueError("メールアドレスを正しく入力してください")
    if not display_name.strip():
        raise ValueError("表示名を入力してください")
    if len(password) < 6:
        raise ValueError("パスワードは6文字以上にしてください")
    if find_user_by_email(email) is not None:
        raise ValueError("このメールアドレスは既に登録されています")
    user_id = uuid.uuid4().hex
    user = {
        "id": user_id,
        "email": email,
        "displayName": display_name.strip(),
        "passwordHash": hash_password(password),
        "currentProjectId": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    users_store.write(user_id, user)
    return user


@router.get("/users")
def list_all_users(_: None = Depends(get_current_admin)):
    users = users_store.list()
    users.sort(key=lambda u: u.get("createdAt", ""), reverse=True)
    return [_public_user(u) for u in users]


@router.post("/users")
def create_user(payload: AdminCreateUserIn, _: None = Depends(get_current_admin)):
    try:
        user = _create_user_record(payload.email, payload.displayName, payload.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _public_user(user)


def _delete_user_record(user_id: str) -> bool:
    if users_store.read(user_id) is None:
        return False
    users_store.delete(user_id)
    # 各プロジェクトのメンバー一覧からも削除し、参照切れを残さない
    for project in projects_index_store.list():
        members = project.get("members", [])
        if any(m["userId"] == user_id for m in members):
            project["members"] = [m for m in members if m["userId"] != user_id]
            projects_index_store.write(project["id"], project)
    return True


@router.delete("/users/{user_id}")
def delete_user(user_id: str, _: None = Depends(get_current_admin)):
    if not _delete_user_record(user_id):
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    return {"ok": True}


@router.post("/users/bulk-delete")
def bulk_delete_users(payload: AdminBulkIdsIn, _: None = Depends(get_current_admin)):
    deleted_count = sum(1 for uid in payload.ids if _delete_user_record(uid))
    return {"deletedCount": deleted_count}


@router.get("/users/import-template")
def download_user_import_template(_: None = Depends(get_current_admin)):
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["email", "displayName", "password"])
    writer.writerow(["taro.yamada@example.com", "山田太郎", "password123"])
    csv_bytes = ("\ufeff" + buf.getvalue()).encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="user_import_template.csv"'},
    )


@router.get("/users/export")
def export_users(_: None = Depends(get_current_admin)):
    users = users_store.list()
    users.sort(key=lambda u: u.get("createdAt", ""))
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["email", "displayName", "createdAt"])
    for u in users:
        writer.writerow([u.get("email", ""), u.get("displayName", ""), u.get("createdAt", "")])
    csv_bytes = ("\ufeff" + buf.getvalue()).encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="users_export.csv"'},
    )


@router.post("/users/import")
async def import_users(file: UploadFile = File(...), _: None = Depends(get_current_admin)):
    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="ファイルの文字コードを読み取れませんでした（UTF-8で保存してください）")

    reader = csv.DictReader(io.StringIO(text))
    required = {"email", "displayName", "password"}
    if reader.fieldnames is None or not required.issubset(set(reader.fieldnames)):
        raise HTTPException(status_code=400, detail="CSVの列は email,displayName,password にしてください")

    created = []
    skipped = []
    for i, row in enumerate(reader, start=2):  # 1行目はヘッダー
        email = (row.get("email") or "").strip()
        display_name = (row.get("displayName") or "").strip()
        password = row.get("password") or ""
        if not email and not display_name and not password:
            continue  # 空行はスキップ
        try:
            user = _create_user_record(email, display_name, password)
            created.append({"email": user["email"], "displayName": user["displayName"]})
        except ValueError as e:
            skipped.append({"row": i, "email": email, "reason": str(e)})

    return {"createdCount": len(created), "created": created, "skippedCount": len(skipped), "skipped": skipped}


# --- 全プロジェクトの閲覧・管理 ---------------------------------------------

@router.get("/projects")
def list_all_projects(_: None = Depends(get_current_admin)):
    projects = projects_index_store.list()
    projects.sort(key=lambda p: p.get("createdAt", ""), reverse=True)
    result = []
    for p in projects:
        owner = next((m for m in p.get("members", []) if m.get("role") == "owner"), None)
        owner_user = users_store.read(owner["userId"]) if owner else None
        result.append({
            "id": p["id"],
            "name": p["name"],
            "storageProvider": p.get("storageProvider", "local"),
            "ownerName": owner_user["displayName"] if owner_user else "不明なユーザー",
            "memberCount": sum(1 for m in p.get("members", []) if m.get("status") == "approved"),
            "pendingCount": sum(1 for m in p.get("members", []) if m.get("status") == "pending"),
            "createdAt": p.get("createdAt"),
        })
    return result


@router.get("/projects/{project_id}")
def get_project_detail(project_id: str, _: None = Depends(get_current_admin)):
    project = _require_project(project_id)
    members = [_present_member(project, m) for m in project.get("members", [])]
    articles = [
        {"id": a["id"], "title": a["title"], "folder": a.get("folder"), "updated": a.get("updated")}
        for a in get_articles_store(project_id).list()
    ]
    articles.sort(key=lambda a: a.get("updated") or "", reverse=True)
    folders = get_folders_store(project_id).list()
    return {
        "id": project["id"],
        "name": project["name"],
        "storageProvider": project.get("storageProvider", "local"),
        "members": members,
        "articles": articles,
        "folders": folders,
    }


@router.put("/projects/{project_id}")
def rename_project(project_id: str, payload: AdminProjectUpdateIn, _: None = Depends(get_current_admin)):
    project = _require_project(project_id)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="プロジェクト名を入力してください")
    project["name"] = name
    projects_index_store.write(project_id, project)
    return {"ok": True}


def _delete_project_record(project_id: str) -> bool:
    if projects_index_store.read(project_id) is None:
        return False
    for store in (
        get_articles_store(project_id),
        get_folders_store(project_id),
        get_tags_store(project_id),
        get_comments_store(project_id),
    ):
        for item in store.list():
            store.delete(str(item["id"]))
    projects_index_store.delete(project_id)
    return True


@router.delete("/projects/{project_id}")
def delete_project(project_id: str, _: None = Depends(get_current_admin)):
    if not _delete_project_record(project_id):
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    return {"ok": True}


@router.post("/projects/bulk-delete")
def bulk_delete_projects(payload: AdminBulkIdsIn, _: None = Depends(get_current_admin)):
    deleted_count = sum(1 for pid in payload.ids if _delete_project_record(pid))
    return {"deletedCount": deleted_count}


@router.post("/projects/{project_id}/members/{user_id}/approve")
def admin_approve_member(project_id: str, user_id: str, _: None = Depends(get_current_admin)):
    project = _require_project(project_id)
    member = get_member(project, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="申請が見つかりません")
    member["status"] = "approved"
    projects_index_store.write(project_id, project)
    approved_user = users_store.read(user_id)
    if approved_user:
        try_send_notification(
            approved_user["email"],
            f'【Knowledge View】「{project["name"]}」への参加が承認されました',
            f'{approved_user["displayName"]} 様\n\n「{project["name"]}」への参加申請が承認されました。\nアプリからログインしてご利用ください。',
        )
    return {"ok": True}


@router.post("/projects/{project_id}/members/{user_id}/reject")
def admin_reject_member(project_id: str, user_id: str, _: None = Depends(get_current_admin)):
    project = _require_project(project_id)
    member = get_member(project, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="申請が見つかりません")
    member["status"] = "rejected"
    projects_index_store.write(project_id, project)
    return {"ok": True}


@router.post("/projects/{project_id}/members/{user_id}/remove")
def admin_remove_member(project_id: str, user_id: str, _: None = Depends(get_current_admin)):
    project = _require_project(project_id)
    target = get_member(project, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")
    if target.get("role") == "owner" and owner_count(project) <= 1:
        raise HTTPException(status_code=400, detail="最後のオーナーは削除できません")
    project["members"] = [m for m in project.get("members", []) if m["userId"] != user_id]
    projects_index_store.write(project_id, project)
    return {"ok": True}


@router.post("/projects/{project_id}/members/{user_id}/promote")
def admin_promote_member(project_id: str, user_id: str, _: None = Depends(get_current_admin)):
    project = _require_project(project_id)
    member = get_member(project, user_id)
    if member is None or member.get("status") != "approved":
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")
    member["role"] = "owner"
    projects_index_store.write(project_id, project)
    return {"ok": True}


@router.post("/projects/{project_id}/members/{user_id}/demote")
def admin_demote_member(project_id: str, user_id: str, _: None = Depends(get_current_admin)):
    project = _require_project(project_id)
    member = get_member(project, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")
    if member.get("role") == "owner" and owner_count(project) <= 1:
        raise HTTPException(status_code=400, detail="最後のオーナーを降格することはできません")
    member["role"] = "member"
    projects_index_store.write(project_id, project)
    return {"ok": True}


@router.delete("/projects/{project_id}/articles/{article_id}")
def admin_delete_article(project_id: str, article_id: str, _: None = Depends(get_current_admin)):
    _require_project(project_id)
    articles_store = get_articles_store(project_id)
    if articles_store.read(article_id) is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    articles_store.delete(article_id)
    return {"ok": True}


@router.put("/projects/{project_id}/articles/{article_id}/move")
def admin_move_article(project_id: str, article_id: str, payload: AdminMoveArticleIn, _: None = Depends(get_current_admin)):
    _require_project(project_id)
    articles_store = get_articles_store(project_id)
    existing = articles_store.read(article_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    existing["folder"] = payload.folder or None
    articles_store.write(article_id, existing)
    return existing


# --- パスワード／ユーザー名の問い合わせ対応 -----------------------------------

@router.get("/support-requests")
def list_support_requests(_: None = Depends(get_current_admin)):
    reqs = support_requests_store.list()
    reqs.sort(key=lambda r: r.get("createdAt", ""), reverse=True)
    result = []
    for r in reqs:
        user = find_user_by_email(r["email"]) if r.get("email") else None
        result.append({
            **r,
            "displayName": user["displayName"] if user else None,
            "userExists": user is not None,
        })
    return result


@router.post("/support-requests/{request_id}/resolve")
def resolve_support_request(request_id: str, _: None = Depends(get_current_admin)):
    req = support_requests_store.read(request_id)
    if req is None:
        raise HTTPException(status_code=404, detail="リクエストが見つかりません")
    req["status"] = "resolved"
    req["resolvedAt"] = datetime.now(timezone.utc).isoformat()
    support_requests_store.write(request_id, req)
    return {"ok": True}


@router.post("/support-requests/{request_id}/issue-temp-password")
def issue_temp_password(request_id: str, _: None = Depends(get_current_admin)):
    req = support_requests_store.read(request_id)
    if req is None:
        raise HTTPException(status_code=404, detail="リクエストが見つかりません")
    if req.get("type") != "password":
        raise HTTPException(status_code=400, detail="このリクエストはパスワード再発行の対象ではありません")
    user = find_user_by_email(req["email"])
    if user is None:
        raise HTTPException(status_code=404, detail="該当するユーザーが見つかりません")
    temp_password = secrets.token_urlsafe(9)
    user["passwordHash"] = hash_password(temp_password)
    user["mustChangePassword"] = True
    users_store.write(user["id"], user)
    req["status"] = "resolved"
    req["resolvedAt"] = datetime.now(timezone.utc).isoformat()
    support_requests_store.write(request_id, req)
    return {"ok": True, "tempPassword": temp_password, "email": user["email"]}


# --- メール設定 --------------------------------------------------------------

@router.get("/email-settings")
def get_email_settings(_: None = Depends(get_current_admin)):
    cfg = get_email_config()
    return {**cfg, "smtpPassword": "********" if cfg.get("smtpPassword") else ""}


@router.put("/email-settings")
def update_email_settings(payload: AdminEmailSettingsIn, _: None = Depends(get_current_admin)):
    cfg = get_email_config()
    cfg["enabled"] = payload.enabled
    cfg["smtpHost"] = payload.smtpHost.strip()
    cfg["smtpPort"] = payload.smtpPort
    cfg["smtpUsername"] = payload.smtpUsername.strip()
    # マスク値がそのまま送り返された場合は、保存済みのパスワードを上書きしない
    if payload.smtpPassword and payload.smtpPassword != "********":
        cfg["smtpPassword"] = payload.smtpPassword
    cfg["useTls"] = payload.useTls
    cfg["fromAddress"] = payload.fromAddress.strip()
    cfg["fromName"] = payload.fromName.strip()
    save_email_config(cfg)
    return {"ok": True}


@router.post("/email-settings/test")
def test_email_settings(payload: AdminEmailTestIn, _: None = Depends(get_current_admin)):
    try:
        send_test_email(payload.toEmail)
    except EmailNotConfiguredError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"送信に失敗しました: {e}")
    return {"ok": True}


@router.post("/users/send-email")
def send_email_to_users(payload: AdminSendEmailIn, _: None = Depends(get_current_admin)):
    if not payload.subject.strip() or not payload.body.strip():
        raise HTTPException(status_code=400, detail="件名と本文を入力してください")
    sent = []
    failed = []
    for uid in payload.userIds:
        user = users_store.read(uid)
        if user is None:
            continue
        try:
            send_email(user["email"], payload.subject, payload.body)
            sent.append(user["email"])
        except (EmailDisabledError, EmailNotConfiguredError) as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception:
            failed.append(user["email"])
    return {"sentCount": len(sent), "sent": sent, "failedCount": len(failed), "failed": failed}
