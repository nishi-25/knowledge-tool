import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..schemas import CommentIn
from ..store import get_comments_store, get_articles_store
from ..auth import get_current_user
from ..membership import resolve_current_project, is_owner

router = APIRouter(tags=["comments"])


@router.get("/api/articles/{article_id}/comments")
def list_comments(article_id: int, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    comments = [c for c in get_comments_store(project["id"]).list() if c["articleId"] == article_id]
    comments.sort(key=lambda c: c["createdAt"])
    return comments


@router.post("/api/articles/{article_id}/comments")
def add_comment(article_id: int, payload: CommentIn, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    if get_articles_store(project["id"]).read(str(article_id)) is None:
        raise HTTPException(status_code=404, detail="記事が見つかりません")
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="コメントを入力してください")
    comment = {
        "id": uuid.uuid4().hex,
        "articleId": article_id,
        "author": user["displayName"],
        "authorId": user["id"],
        "text": text,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    get_comments_store(project["id"]).write(comment["id"], comment)
    return comment


@router.delete("/api/comments/{comment_id}")
def delete_comment(comment_id: str, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    comments_store = get_comments_store(project["id"])
    existing = comments_store.read(comment_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="コメントが見つかりません")
    if existing.get("authorId") != user["id"] and not is_owner(project, user):
        raise HTTPException(status_code=403, detail="このコメントを削除する権限がありません")
    comments_store.delete(comment_id)
    return {"ok": True}
