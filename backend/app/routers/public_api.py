import secrets
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from ..schemas import (
    AccountProjectCreateIn,
    ArticleIn,
    FolderIn,
    ProjectRenameIn,
    PublicCommentIn,
)
from ..store import (
    delete_project_record,
    get_article_revisions_store,
    get_articles_store,
    get_comments_store,
    get_folders_store,
    get_tags_store,
    next_article_id,
    projects_index_store,
    slugify,
    strip_html,
)
from ..apikeys_store import resolve_project_id_from_key, resolve_user_id_from_account_key
from ..auth import users_store
from ..email_utils import send_notification_if_enabled
from ..html_sanitize import sanitize_body_html
from ..config import APP_MODE, APP_VERSION
from ..membership import get_member, owner_count
from ..notifications_store import notify_user
from ..rate_limit import enforce_rate_limit
from ..storage_factory import test_storage_config
from .articles import _save_revision
from .folders import DEFAULT_ICON, DEFAULT_COLOR, DEFAULT_TINT

router = APIRouter(prefix="/api/v1", tags=["public-api"])


def require_api_key(request: Request, x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> str:
    project_id = resolve_project_id_from_key(x_api_key or "")
    if not project_id:
        # 無効なキーでの連打（総当たり・スパム）をIP単位で抑止する。
        enforce_rate_limit(request, "public-api-invalid-key", max_attempts=20, window_seconds=60)
        raise HTTPException(status_code=401, detail="APIキーが無効です。X-API-Keyヘッダーを確認してください")
    # 有効なキー（＝プロジェクト）単位でレート制限する。同一IP配下に複数の正規
    # 利用者がいても公平に制限され、漏洩したキー1本が暴走した場合の影響も
    # そのキーが属するプロジェクトに閉じ込められる。
    enforce_rate_limit(request, "public-api", max_attempts=120, window_seconds=60, identity=project_id)
    return project_id


def require_account_api_key(request: Request, x_account_api_key: str | None = Header(default=None, alias="X-Account-API-Key")) -> str:
    user_id = resolve_user_id_from_account_key(x_account_api_key or "")
    if not user_id:
        enforce_rate_limit(request, "public-api-invalid-account-key", max_attempts=20, window_seconds=60)
        raise HTTPException(status_code=401, detail="アカウントAPIキーが無効です。X-Account-API-Keyヘッダーを確認してください")
    enforce_rate_limit(request, "public-api-account", max_attempts=120, window_seconds=60, identity=user_id)
    return user_id


def _load_project(project_id: str) -> dict:
    project = projects_index_store.read(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    return project


@router.get("/version")
def get_version():
    """インストールされているバージョンを確認する用のエンドポイント。APIキー不要。"""
    return {"version": APP_VERSION, "mode": APP_MODE}


# --- 記事 ----------------------------------------------------------------

@router.get("/articles")
def list_articles(project_id: str = Depends(require_api_key)):
    return get_articles_store(project_id).list()


@router.get("/articles/{article_id}")
def get_article(article_id: int, project_id: str = Depends(require_api_key)):
    a = get_articles_store(project_id).read(str(article_id))
    if a is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    return a


@router.post("/articles")
def create_article(payload: ArticleIn, project_id: str = Depends(require_api_key)):
    articles_store = get_articles_store(project_id)
    safe_body_html = sanitize_body_html(payload.bodyHtml)
    body_text = strip_html(safe_body_html)
    article = {
        "id": next_article_id(articles_store),
        "title": payload.title.strip(),
        "folder": payload.folder or None,
        "tags": payload.tags,
        "updated": date.today().isoformat(),
        "views": 0,
        "favorite": False,
        "excerpt": body_text[:60],
        "bodyHtml": safe_body_html,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    articles_store.write(str(article["id"]), article)
    return article


@router.put("/articles/{article_id}")
def update_article(article_id: int, payload: ArticleIn, project_id: str = Depends(require_api_key)):
    articles_store = get_articles_store(project_id)
    existing = articles_store.read(str(article_id))
    if existing is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    _save_revision(project_id, existing)
    safe_body_html = sanitize_body_html(payload.bodyHtml)
    body_text = strip_html(safe_body_html)
    existing.update({
        "title": payload.title.strip(),
        "folder": payload.folder or None,
        "tags": payload.tags,
        "updated": date.today().isoformat(),
        "excerpt": body_text[:60],
        "bodyHtml": safe_body_html,
    })
    articles_store.write(str(article_id), existing)
    return existing


@router.delete("/articles/{article_id}")
def delete_article(article_id: int, project_id: str = Depends(require_api_key)):
    articles_store = get_articles_store(project_id)
    if articles_store.read(str(article_id)) is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    articles_store.delete(str(article_id))
    return {"ok": True}


@router.post("/articles/{article_id}/favorite")
def toggle_favorite(article_id: int, project_id: str = Depends(require_api_key)):
    articles_store = get_articles_store(project_id)
    existing = articles_store.read(str(article_id))
    if existing is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    existing["favorite"] = not existing["favorite"]
    articles_store.write(str(article_id), existing)
    return existing


@router.get("/articles/{article_id}/revisions")
def list_revisions(article_id: int, project_id: str = Depends(require_api_key)):
    if get_articles_store(project_id).read(str(article_id)) is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    revisions = [r for r in get_article_revisions_store(project_id).list() if r["articleId"] == article_id]
    revisions.sort(key=lambda r: r["savedAt"], reverse=True)
    return revisions


@router.post("/articles/{article_id}/revisions/{revision_id}/restore")
def restore_revision(article_id: int, revision_id: str, project_id: str = Depends(require_api_key)):
    articles_store = get_articles_store(project_id)
    existing = articles_store.read(str(article_id))
    if existing is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    revisions_store = get_article_revisions_store(project_id)
    revision = revisions_store.read(revision_id)
    if revision is None or revision["articleId"] != article_id:
        raise HTTPException(status_code=404, detail="版が見つかりません")
    # 復元自体も取り消せるよう、復元前の状態を新しい版として保存してから上書きする
    _save_revision(project_id, existing)
    existing.update({
        "title": revision.get("title", existing["title"]),
        "folder": revision.get("folder"),
        "tags": revision.get("tags", []),
        "bodyHtml": revision.get("bodyHtml", ""),
        "excerpt": strip_html(revision.get("bodyHtml", ""))[:60],
        "updated": date.today().isoformat(),
    })
    articles_store.write(str(article_id), existing)
    return existing


# --- フォルダ --------------------------------------------------------------

@router.get("/folders")
def list_folders(project_id: str = Depends(require_api_key)):
    return get_folders_store(project_id).list()


@router.post("/folders")
def create_folder(payload: FolderIn, project_id: str = Depends(require_api_key)):
    folders_store = get_folders_store(project_id)
    label = payload.label.strip()
    if not label:
        raise HTTPException(status_code=400, detail="フォルダ名を入力してください")
    existing = folders_store.list()
    parent = payload.parent or None
    if parent is not None and not any(f["id"] == parent for f in existing):
        raise HTTPException(status_code=404, detail="親フォルダが見つかりません")
    match = next((f for f in existing if f["label"] == label and f.get("parent") == parent), None)
    if match:
        return match
    folder_id = slugify(label, {f["id"] for f in existing})
    folder = {
        "id": folder_id, "label": label, "icon": DEFAULT_ICON,
        "color": DEFAULT_COLOR, "tint": DEFAULT_TINT, "builtin": False, "parent": parent,
    }
    folders_store.write(folder_id, folder)
    return folder


@router.delete("/folders/{folder_id}")
def delete_folder(folder_id: str, project_id: str = Depends(require_api_key)):
    folders_store = get_folders_store(project_id)
    target = folders_store.read(folder_id)
    if target is None:
        raise HTTPException(status_code=404, detail="フォルダが見つかりません")
    parent_of_deleted = target.get("parent")
    folders_store.delete(folder_id)
    # 子フォルダは削除せず、削除したフォルダの親へ繰り上げる（無ければ最上位へ）。
    for f in folders_store.list():
        if f.get("parent") == folder_id:
            f["parent"] = parent_of_deleted
            folders_store.write(f["id"], f)
    articles_store = get_articles_store(project_id)
    for a in articles_store.list():
        if a.get("folder") == folder_id:
            a["folder"] = parent_of_deleted
            articles_store.write(str(a["id"]), a)
    return {"ok": True}


# --- タグ（読み取りのみ。記事のtagsフィールド経由で追加・削除される） -------------

@router.get("/tags")
def list_tags(project_id: str = Depends(require_api_key)):
    return get_tags_store(project_id).list()


# --- コメント --------------------------------------------------------------

@router.get("/articles/{article_id}/comments")
def list_comments(article_id: int, project_id: str = Depends(require_api_key)):
    comments = [c for c in get_comments_store(project_id).list() if c["articleId"] == article_id]
    comments.sort(key=lambda c: c["createdAt"])
    return comments


@router.post("/articles/{article_id}/comments")
def add_comment(article_id: int, payload: PublicCommentIn, project_id: str = Depends(require_api_key)):
    article = get_articles_store(project_id).read(str(article_id))
    if article is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="コメントを入力してください")
    author = payload.author.strip() or "外部API"
    comment = {
        "id": uuid.uuid4().hex,
        "articleId": article_id,
        "author": author,
        "authorId": None,
        "text": text,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    get_comments_store(project_id).write(comment["id"], comment)
    author_id = article.get("createdBy")
    if author_id:
        notify_user(
            author_id, "commentAdded", f'「{article["title"]}」にコメントが投稿されました',
            body=f'{author}: {text[:80]}', link={"projectId": project_id, "articleId": article_id},
        )
    return comment


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: str, project_id: str = Depends(require_api_key)):
    comments_store = get_comments_store(project_id)
    if comments_store.read(comment_id) is None:
        raise HTTPException(status_code=404, detail="コメントが見つかりません")
    comments_store.delete(comment_id)
    return {"ok": True}


# --- メンバー管理 -----------------------------------------------------------

def _present_member(m: dict) -> dict:
    member_user = users_store.read(m["userId"])
    return {
        **m,
        "displayName": member_user["displayName"] if member_user else "(削除されたユーザー)",
        "email": member_user["email"] if member_user else "",
    }


@router.get("/members")
def list_members(project_id: str = Depends(require_api_key)):
    project = _load_project(project_id)
    return [_present_member(m) for m in project.get("members", [])]


@router.get("/members/requests")
def list_pending_requests(project_id: str = Depends(require_api_key)):
    project = _load_project(project_id)
    return [_present_member(m) for m in project.get("members", []) if m.get("status") == "pending"]


@router.post("/members/invite")
def create_invite(project_id: str = Depends(require_api_key)):
    project = _load_project(project_id)
    if not project.get("inviteToken"):
        project["inviteToken"] = secrets.token_urlsafe(20)
        projects_index_store.write(project_id, project)
    return {"token": project["inviteToken"]}


@router.post("/members/{user_id}/approve")
def approve_member(user_id: str, project_id: str = Depends(require_api_key)):
    project = _load_project(project_id)
    member = get_member(project, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="申請が見つかりません")
    member["status"] = "approved"
    projects_index_store.write(project_id, project)
    approved_user = users_store.read(user_id)
    if approved_user:
        send_notification_if_enabled(
            "memberApproved", approved_user["email"],
            f'【Knowledge View】「{project["name"]}」への参加が承認されました',
            f'{approved_user["displayName"]} 様\n\n「{project["name"]}」への参加申請が承認されました。\nアプリからログインしてご利用ください。',
        )
        notify_user(user_id, "memberApproved", f'「{project["name"]}」への参加が承認されました', link={"projectId": project_id})
    return {"ok": True}


@router.post("/members/{user_id}/reject")
def reject_member(user_id: str, project_id: str = Depends(require_api_key)):
    project = _load_project(project_id)
    member = get_member(project, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="申請が見つかりません")
    member["status"] = "rejected"
    projects_index_store.write(project_id, project)
    return {"ok": True}


@router.post("/members/{user_id}/remove")
def remove_member(user_id: str, project_id: str = Depends(require_api_key)):
    project = _load_project(project_id)
    target = get_member(project, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")
    if target.get("role") == "owner" and owner_count(project) <= 1:
        raise HTTPException(status_code=400, detail="最後のオーナーは削除できません")
    project["members"] = [m for m in project.get("members", []) if m["userId"] != user_id]
    projects_index_store.write(project_id, project)
    return {"ok": True}


@router.post("/members/{user_id}/promote")
def promote_member(user_id: str, project_id: str = Depends(require_api_key)):
    project = _load_project(project_id)
    member = get_member(project, user_id)
    if member is None or member.get("status") != "approved":
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")
    member["role"] = "owner"
    projects_index_store.write(project_id, project)
    return {"ok": True}


@router.post("/members/{user_id}/demote")
def demote_member(user_id: str, project_id: str = Depends(require_api_key)):
    project = _load_project(project_id)
    member = get_member(project, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")
    if member.get("role") == "owner" and owner_count(project) <= 1:
        raise HTTPException(status_code=400, detail="最後のオーナーを降格することはできません")
    member["role"] = "member"
    projects_index_store.write(project_id, project)
    return {"ok": True}


# --- アカウントAPIキー：プロジェクトの作成・名称変更・削除 ---------------------
# プロジェクトAPIキー（X-API-Key）は「あるプロジェクトの中」でしか使えないため、
# プロジェクト自体の作成・削除には、ユーザーアカウントに紐づく別種のキー
# （X-Account-API-Key）を使う。こちらは自分が所有する全プロジェクトを操作できる
# ぶん権限が強いため、設定画面の「アカウントAPIキー」から別途発行する。

def _present_account_project(p: dict) -> dict:
    return {
        "id": p["id"],
        "name": p["name"],
        "storageProvider": p.get("storageProvider", "local"),
        "createdAt": p.get("createdAt"),
    }


@router.get("/account/projects")
def account_list_projects(user_id: str = Depends(require_account_api_key)):
    result = []
    for p in projects_index_store.list():
        member = get_member(p, user_id)
        if member and member.get("status") == "approved":
            result.append(_present_account_project(p))
    return result


@router.post("/account/projects")
def account_create_project(payload: AccountProjectCreateIn, user_id: str = Depends(require_account_api_key)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="プロジェクト名を入力してください")
    # アカウントAPIキーでは、外部ストレージの認証情報を扱わずに済むローカルストレージのみ作成できる。
    # AWS S3等の保存先が必要な場合はアプリ画面から作成してください。
    ok, message, resolved_config = test_storage_config({"provider": "local", "dataRoot": "local"})
    if not ok:
        raise HTTPException(status_code=400, detail=f"保存先への接続確認に失敗しました: {message}")
    existing_ids = {p["id"] for p in projects_index_store.list()}
    project_id = slugify(name, existing_ids)
    project = {
        "id": project_id,
        "name": name,
        "ownerId": user_id,
        "members": [{"userId": user_id, "role": "owner", "status": "approved", "requestedAt": datetime.now(timezone.utc).isoformat()}],
        "inviteToken": None,
        "storageProvider": resolved_config.get("provider", "local"),
        **{k: v for k, v in resolved_config.items() if k != "provider"},
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    projects_index_store.write(project_id, project)
    get_articles_store(project_id)
    get_folders_store(project_id)
    get_tags_store(project_id)
    get_comments_store(project_id)
    return _present_account_project(project)


def _require_owned_project(project_id: str, user_id: str) -> dict:
    project = _load_project(project_id)
    member = get_member(project, user_id)
    if not member or member.get("role") != "owner":
        raise HTTPException(status_code=403, detail="このプロジェクトのオーナーのみ実行できます")
    return project


@router.put("/account/projects/{project_id}")
def account_rename_project(project_id: str, payload: ProjectRenameIn, user_id: str = Depends(require_account_api_key)):
    project = _require_owned_project(project_id, user_id)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="プロジェクト名を入力してください")
    project["name"] = name
    projects_index_store.write(project_id, project)
    return _present_account_project(project)


@router.delete("/account/projects/{project_id}")
def account_delete_project(project_id: str, user_id: str = Depends(require_account_api_key)):
    _require_owned_project(project_id, user_id)
    delete_project_record(project_id)
    return {"ok": True}
