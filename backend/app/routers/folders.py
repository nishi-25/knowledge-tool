from fastapi import APIRouter, Depends, HTTPException

from ..schemas import FolderIn
from ..store import get_folders_store, get_articles_store, slugify
from ..auth import get_current_user
from ..membership import resolve_current_project, require_owner

router = APIRouter(prefix="/api/folders", tags=["folders"])

DEFAULT_ICON = "bi bi-folder2"
DEFAULT_COLOR = "#64748b"
DEFAULT_TINT = "#f1f5f9"


def _with_counts(pid: str):
    articles = get_articles_store(pid).list()
    folders = get_folders_store(pid).list()
    for f in folders:
        f["count"] = sum(1 for a in articles if a["folder"] == f["id"])
    return folders


@router.get("")
def list_folders(user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    return _with_counts(project["id"])


@router.post("")
def add_folder(payload: FolderIn, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    pid = project["id"]
    folders_store = get_folders_store(pid)
    label = payload.label.strip()
    if not label:
        return _with_counts(pid)
    existing = folders_store.list()
    if any(f["label"] == label for f in existing):
        return _with_counts(pid)
    folder_id = slugify(label, {f["id"] for f in existing})
    folders_store.write(folder_id, {
        "id": folder_id, "label": label, "icon": DEFAULT_ICON,
        "color": DEFAULT_COLOR, "tint": DEFAULT_TINT, "builtin": False,
    })
    return _with_counts(pid)


@router.put("/{folder_id}")
def rename_folder(folder_id: str, payload: FolderIn, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    pid = project["id"]
    folders_store = get_folders_store(pid)
    existing = folders_store.read(folder_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="フォルダが見つかりません")
    label = payload.label.strip()
    if not label:
        raise HTTPException(status_code=400, detail="フォルダ名を入力してください")
    existing["label"] = label
    folders_store.write(folder_id, existing)
    return _with_counts(pid)


@router.delete("/{folder_id}")
def delete_folder(folder_id: str, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    pid = project["id"]
    folders_store = get_folders_store(pid)
    if folders_store.read(folder_id) is None:
        raise HTTPException(status_code=404, detail="フォルダが見つかりません")
    folders_store.delete(folder_id)
    # このフォルダに属していた記事は「フォルダなし」に戻す（記事自体は削除しない）
    articles_store = get_articles_store(pid)
    for a in articles_store.list():
        if a.get("folder") == folder_id:
            a["folder"] = None
            articles_store.write(str(a["id"]), a)
    return _with_counts(pid)
