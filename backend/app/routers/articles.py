from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from ..schemas import ArticleIn
from ..store import get_articles_store, strip_html, next_article_id
from ..auth import get_current_user, users_store
from ..email_utils import send_notification_if_enabled
from ..membership import resolve_current_project, require_owner
from ..html_sanitize import sanitize_body_html

router = APIRouter(prefix="/api/articles", tags=["articles"])


@router.get("")
def list_articles(q: str = "", folder: str = "", tag: str = "", favorites_only: bool = False, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    articles = get_articles_store(project["id"]).list()
    ql = q.strip().lower()
    if favorites_only:
        articles = [a for a in articles if a["favorite"]]
    if ql:
        articles = [a for a in articles if ql in a["title"].lower() or ql in a["excerpt"].lower()]
    if folder:
        articles = [a for a in articles if a["folder"] == folder]
    if tag:
        articles = [a for a in articles if tag in a["tags"]]
    articles.sort(key=lambda a: a["updated"], reverse=True)
    return articles


@router.get("/{article_id}")
def get_article(article_id: int, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    a = get_articles_store(project["id"]).read(str(article_id))
    if a is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    return a


@router.post("")
def create_article(payload: ArticleIn, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    articles_store = get_articles_store(project["id"])
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

    for m in project.get("members", []):
        if m.get("status") != "approved" or m["userId"] == user["id"]:
            continue
        member_user = users_store.read(m["userId"])
        if not member_user:
            continue
        send_notification_if_enabled(
            "articleCreated",
            member_user["email"],
            f'【Knowledge View】新しい記事が作成されました：{article["title"]}',
            f'{member_user["displayName"]} 様\n\n「{project["name"]}」に新しい記事が作成されました。\n\nタイトル：{article["title"]}\n作成者：{user["displayName"]}',
        )

    return article


@router.put("/{article_id}")
def update_article(article_id: int, payload: ArticleIn, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    articles_store = get_articles_store(project["id"])
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
        "excerpt": body_text[:60] or existing.get("excerpt", ""),
        "bodyHtml": safe_body_html,
    })
    articles_store.write(str(article_id), existing)
    return existing


@router.post("/{article_id}/favorite")
def toggle_favorite(article_id: int, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    articles_store = get_articles_store(project["id"])
    existing = articles_store.read(str(article_id))
    if existing is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    existing["favorite"] = not existing["favorite"]
    articles_store.write(str(article_id), existing)
    return existing
