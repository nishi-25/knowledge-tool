import hmac
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response

from ..admin_store import (
    ADMIN_SENTINEL_ID,
    ADMIN_SESSION_COOKIE,
    get_admin_config,
    save_admin_config,
)
from ..auth import create_session_token, hash_password, users_store, verify_password, verify_session_token
from ..config import APP_MODE
from ..membership import get_member, owner_count
from ..rate_limit import enforce_rate_limit
from ..schemas import AdminChangePasswordIn, AdminLoginIn, AdminLoginSettingsIn, AdminMoveArticleIn, AdminSetupIn
from ..store import get_articles_store, get_folders_store, projects_index_store


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


@router.post("/projects/{project_id}/members/{user_id}/approve")
def admin_approve_member(project_id: str, user_id: str, _: None = Depends(get_current_admin)):
    project = _require_project(project_id)
    member = get_member(project, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="申請が見つかりません")
    member["status"] = "approved"
    projects_index_store.write(project_id, project)
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
