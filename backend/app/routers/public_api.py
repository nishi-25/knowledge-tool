from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException

from ..schemas import ArticleIn, FolderIn
from ..store import get_articles_store, get_folders_store, get_tags_store, strip_html, next_article_id, slugify
from ..apikeys_store import resolve_project_id_from_key
from ..html_sanitize import sanitize_body_html
from ..config import APP_MODE, APP_VERSION
from .folders import DEFAULT_ICON, DEFAULT_COLOR, DEFAULT_TINT

router = APIRouter(prefix="/api/v1", tags=["public-api"])


def require_api_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> str:
    project_id = resolve_project_id_from_key(x_api_key or "")
    if not project_id:
        raise HTTPException(status_code=401, detail="APIキーが無効です。X-API-Keyヘッダーを確認してください")
    return project_id


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
    }
    articles_store.write(str(article["id"]), article)
    return article


@router.put("/articles/{article_id}")
def update_article(article_id: int, payload: ArticleIn, project_id: str = Depends(require_api_key)):
    articles_store = get_articles_store(project_id)
    existing = articles_store.read(str(article_id))
    if existing is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
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
    match = next((f for f in existing if f["label"] == label), None)
    if match:
        return match
    folder_id = slugify(label, {f["id"] for f in existing})
    folder = {
        "id": folder_id, "label": label, "icon": DEFAULT_ICON,
        "color": DEFAULT_COLOR, "tint": DEFAULT_TINT, "builtin": False,
    }
    folders_store.write(folder_id, folder)
    return folder


@router.delete("/folders/{folder_id}")
def delete_folder(folder_id: str, project_id: str = Depends(require_api_key)):
    folders_store = get_folders_store(project_id)
    if folders_store.read(folder_id) is None:
        raise HTTPException(status_code=404, detail="フォルダが見つかりません")
    folders_store.delete(folder_id)
    articles_store = get_articles_store(project_id)
    for a in articles_store.list():
        if a.get("folder") == folder_id:
            a["folder"] = None
            articles_store.write(str(a["id"]), a)
    return {"ok": True}


# --- タグ（読み取りのみ。記事のtagsフィールド経由で追加・削除される） -------------

@router.get("/tags")
def list_tags(project_id: str = Depends(require_api_key)):
    return get_tags_store(project_id).list()
