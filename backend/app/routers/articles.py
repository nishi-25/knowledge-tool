import time
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..schemas import ArticleIn
from ..store import get_articles_store, get_article_revisions_store, strip_html, next_article_id
from ..auth import get_current_user, users_store
from ..email_utils import send_notification_if_enabled
from ..membership import resolve_current_project, require_owner
from ..html_sanitize import sanitize_body_html
from ..notifications_store import notify_user

router = APIRouter(prefix="/api/articles", tags=["articles"])

MAX_REVISIONS_PER_ARTICLE = 20


def _save_revision(pid: str, article: dict) -> None:
    """update前の状態を履歴として保存する。1記事あたり直近N件のみ保持する。"""
    revisions_store = get_article_revisions_store(pid)
    article_id = article["id"]
    revision_id = f"{article_id}_{int(time.time() * 1000)}"
    revisions_store.write(revision_id, {
        "id": revision_id,
        "articleId": article_id,
        "savedAt": datetime.now(timezone.utc).isoformat(),
        "title": article.get("title", ""),
        "folder": article.get("folder"),
        "tags": article.get("tags", []),
        "bodyHtml": article.get("bodyHtml", ""),
    })
    own = sorted(
        (r for r in revisions_store.list() if r["articleId"] == article_id),
        key=lambda r: r["savedAt"],
    )
    for old in own[:-MAX_REVISIONS_PER_ARTICLE]:
        revisions_store.delete(old["id"])


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


@router.post("/{article_id}/view")
def increment_view(article_id: int, user: dict = Depends(get_current_user)):
    """記事を開いたタイミングでフロントエンドから呼ぶ。閲覧数を1増やす。
    一覧取得(list_articles)はキャッシュされた一覧を返すだけで実際に開いた
    ことにはならないため、専用のエンドポイントとして分けている。"""
    project = resolve_current_project(user)
    articles_store = get_articles_store(project["id"])
    a = articles_store.read(str(article_id))
    if a is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    a["views"] = a.get("views", 0) + 1
    articles_store.write(str(article_id), a)
    return {"views": a["views"]}


@router.post("")
def create_article(payload: ArticleIn, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    articles_store = get_articles_store(project["id"])
    safe_body_html = sanitize_body_html(payload.bodyHtml)
    body_text = strip_html(safe_body_html)
    now = datetime.now(timezone.utc).isoformat()
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
        "createdAt": now,
        "createdBy": user["id"],
        "createdByName": user["displayName"],
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
        notify_user(
            m["userId"], "articleCreated", f'新しい記事が作成されました：{article["title"]}',
            body=f'作成者：{user["displayName"]}', link={"projectId": project["id"], "articleId": article["id"]},
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
    _save_revision(project["id"], existing)
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


@router.get("/{article_id}/revisions")
def list_revisions(article_id: int, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    if get_articles_store(project["id"]).read(str(article_id)) is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    revisions = [r for r in get_article_revisions_store(project["id"]).list() if r["articleId"] == article_id]
    revisions.sort(key=lambda r: r["savedAt"], reverse=True)
    return revisions


@router.post("/{article_id}/revisions/{revision_id}/restore")
def restore_revision(article_id: int, revision_id: str, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    articles_store = get_articles_store(project["id"])
    existing = articles_store.read(str(article_id))
    if existing is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    revisions_store = get_article_revisions_store(project["id"])
    revision = revisions_store.read(revision_id)
    if revision is None or revision["articleId"] != article_id:
        raise HTTPException(status_code=404, detail="版が見つかりません")
    # 復元自体も取り消せるよう、復元前の状態を新しい版として保存してから上書きする
    _save_revision(project["id"], existing)
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


@router.delete("/{article_id}")
def delete_article(article_id: int, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    articles_store = get_articles_store(project["id"])
    if articles_store.read(str(article_id)) is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    articles_store.delete(str(article_id))
    return {"ok": True}


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
