from fastapi import APIRouter, Depends

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
