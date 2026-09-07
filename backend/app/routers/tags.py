from fastapi import APIRouter, Depends, HTTPException

from ..schemas import TagIn
from ..store import get_tags_store, get_articles_store, slugify
from ..auth import get_current_user
from ..membership import resolve_current_project, require_owner

router = APIRouter(prefix="/api/tags", tags=["tags"])


def _with_counts(pid: str):
    articles = get_articles_store(pid).list()
    counts: dict[str, int] = {}
    for a in articles:
        for t in a["tags"]:
            counts[t] = counts.get(t, 0) + 1
    tags = get_tags_store(pid).list()
    for t in tags:
        t["count"] = counts.get(t["label"], 0)
    return sorted(tags, key=lambda t: (-t["count"], t["label"]))


@router.get("")
def list_tags(user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    return _with_counts(project["id"])


@router.post("")
def add_tag(payload: TagIn, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    pid = project["id"]
    tags_store = get_tags_store(pid)
    label = payload.label.strip()
    if not label:
        return _with_counts(pid)
    existing = tags_store.list()
    if any(t["label"] == label for t in existing):
        return _with_counts(pid)
    tag_id = slugify(label, {t["id"] for t in existing})
    tags_store.write(tag_id, {"id": tag_id, "label": label, "builtin": False})
    return _with_counts(pid)


@router.put("/{tag_id}")
def rename_tag(tag_id: str, payload: TagIn, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    pid = project["id"]
    tags_store = get_tags_store(pid)
    existing = tags_store.read(tag_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="タグが見つかりません")
    new_label = payload.label.strip()
    if not new_label:
        raise HTTPException(status_code=400, detail="タグ名を入力してください")
    old_label = existing["label"]
    existing["label"] = new_label
    tags_store.write(tag_id, existing)
    # 記事側が保持しているのはタグのラベル文字列そのものなので、名称変更に合わせて置き換える
    if old_label != new_label:
        articles_store = get_articles_store(pid)
        for a in articles_store.list():
            if old_label in a.get("tags", []):
                a["tags"] = [new_label if t == old_label else t for t in a["tags"]]
                articles_store.write(str(a["id"]), a)
    return _with_counts(pid)


@router.delete("/{tag_id}")
def delete_tag(tag_id: str, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    pid = project["id"]
    tags_store = get_tags_store(pid)
    existing = tags_store.read(tag_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="タグが見つかりません")
    label = existing["label"]
    tags_store.delete(tag_id)
    articles_store = get_articles_store(pid)
    for a in articles_store.list():
        if label in a.get("tags", []):
            a["tags"] = [t for t in a["tags"] if t != label]
            articles_store.write(str(a["id"]), a)
    return _with_counts(pid)
