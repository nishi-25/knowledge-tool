from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..store import get_articles_store, get_folders_store, get_tags_store, strip_html, slugify, next_article_id
from ..auth import get_current_user
from ..membership import resolve_current_project, require_owner
from ..html_sanitize import sanitize_body_html
from .folders import DEFAULT_ICON, DEFAULT_COLOR, DEFAULT_TINT

router = APIRouter(prefix="/api", tags=["data-io"])

PROJECT_EXPORT_TYPE = "knowledge-view-project-export"
ARTICLE_EXPORT_TYPE = "knowledge-view-article-export"
EXPORT_VERSION = 1


def _folder_label_map(pid: str) -> dict[str, str]:
    return {f["id"]: f["label"] for f in get_folders_store(pid).list()}


def _export_article(a: dict, folder_labels: dict[str, str]) -> dict:
    return {
        "title": a["title"],
        "folder": folder_labels.get(a.get("folder")) if a.get("folder") else None,
        "tags": a.get("tags", []),
        "bodyHtml": a.get("bodyHtml", ""),
        "bodyText": strip_html(a.get("bodyHtml", "")),
        "updated": a.get("updated"),
        "favorite": bool(a.get("favorite")),
    }


def _resolve_or_create_folder(pid: str, label: str | None) -> str | None:
    if not label or not label.strip():
        return None
    label = label.strip()
    folders_store = get_folders_store(pid)
    existing = folders_store.list()
    match = next((f for f in existing if f["label"] == label), None)
    if match:
        return match["id"]
    folder_id = slugify(label, {f["id"] for f in existing})
    folders_store.write(folder_id, {
        "id": folder_id, "label": label, "icon": DEFAULT_ICON,
        "color": DEFAULT_COLOR, "tint": DEFAULT_TINT, "builtin": False,
    })
    return folder_id


def _ensure_tags(pid: str, labels: list[str]) -> None:
    tags_store = get_tags_store(pid)
    existing = tags_store.list()
    existing_labels = {t["label"] for t in existing}
    existing_ids = {t["id"] for t in existing}
    for label in labels:
        label = (label or "").strip()
        if not label or label in existing_labels:
            continue
        tag_id = slugify(label, existing_ids)
        tags_store.write(tag_id, {"id": tag_id, "label": label, "builtin": False})
        existing_labels.add(label)
        existing_ids.add(tag_id)


def _import_one_article(pid: str, item: dict) -> dict:
    title = (item.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="記事のtitleは必須です")
    tags = [t for t in (item.get("tags") or []) if isinstance(t, str) and t.strip()]
    _ensure_tags(pid, tags)
    folder_id = _resolve_or_create_folder(pid, item.get("folder"))
    body_html = sanitize_body_html(item.get("bodyHtml") or "")
    body_text = strip_html(body_html)
    articles_store = get_articles_store(pid)
    article = {
        "id": next_article_id(articles_store),
        "title": title,
        "folder": folder_id,
        "tags": tags,
        "updated": item.get("updated") or date.today().isoformat(),
        "views": 0,
        "favorite": bool(item.get("favorite")),
        "excerpt": body_text[:60],
        "bodyHtml": body_html,
    }
    articles_store.write(str(article["id"]), article)
    return article


# --- エクスポート -------------------------------------------------------

@router.get("/export/project")
def export_project(user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    pid = project["id"]
    folder_labels = _folder_label_map(pid)
    folders = get_folders_store(pid).list()
    tags = get_tags_store(pid).list()
    articles = get_articles_store(pid).list()
    return {
        "type": PROJECT_EXPORT_TYPE,
        "version": EXPORT_VERSION,
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "project": {"name": project.get("name")},
        "folders": [{"label": f["label"], "icon": f.get("icon"), "color": f.get("color"), "tint": f.get("tint")} for f in folders],
        "tags": [{"label": t["label"]} for t in tags],
        "articles": [_export_article(a, folder_labels) for a in articles],
    }


@router.get("/export/articles/{article_id}")
def export_article(article_id: int, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    pid = project["id"]
    a = get_articles_store(pid).read(str(article_id))
    if a is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    return {
        "type": ARTICLE_EXPORT_TYPE,
        "version": EXPORT_VERSION,
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "article": _export_article(a, _folder_label_map(pid)),
    }


# --- インポート ---------------------------------------------------------

class ImportProjectIn(BaseModel):
    type: str | None = None
    version: int | None = None
    folders: list[dict] = Field(default_factory=list)
    tags: list[dict] = Field(default_factory=list)
    articles: list[dict] = Field(default_factory=list)


class ImportArticleIn(BaseModel):
    type: str | None = None
    version: int | None = None
    article: dict


@router.post("/import/project")
def import_project(payload: ImportProjectIn, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    pid = project["id"]

    for f in payload.folders:
        label = (f.get("label") or "").strip()
        if label:
            _resolve_or_create_folder(pid, label)
    _ensure_tags(pid, [t.get("label") for t in payload.tags if t.get("label")])

    imported = [_import_one_article(pid, item) for item in payload.articles]
    return {"importedArticles": len(imported), "articles": imported}


@router.post("/import/article")
def import_article(payload: ImportArticleIn, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    return _import_one_article(project["id"], payload.article)
