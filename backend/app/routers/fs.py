from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..config import BROWSE_ROOT, is_within_browse_root
from ..auth import get_current_user
from ..membership import get_member
from ..store import projects_index_store

router = APIRouter(prefix="/api/fs", tags=["fs"])


class MkdirIn(BaseModel):
    path: str
    name: str


def _resolve_in_browse_root(path_str: Optional[str]) -> Path:
    base = BROWSE_ROOT.resolve()
    target = Path(path_str).resolve() if path_str else base
    if not is_within_browse_root(target):
        raise HTTPException(status_code=400, detail="許可されていないパスです")
    return target


def _require_storage_setup_access(user: dict) -> None:
    """ホストのファイルシステムをブラウズできるのは、プロジェクト作成（保存先の設定）に
    携わる立場の人だけに限定する：まだ一つもプロジェクトを持たない新規ユーザー（作成中）か、
    いずれかのプロジェクトのオーナー（保存先変更）。他人のプロジェクトの閲覧専用メンバーには
    ホストの全ドライブを探索できてしまう権限を渡さない。"""
    projects = projects_index_store.list()
    memberships = [get_member(p, user["id"]) for p in projects]
    memberships = [m for m in memberships if m]
    if not memberships:
        return  # まだどのプロジェクトにも参加していない＝作成フローの途中
    if any(m.get("role") == "owner" for m in memberships):
        return
    raise HTTPException(status_code=403, detail="この操作を行う権限がありません")


@router.get("/browse")
def browse(path: Optional[str] = Query(default=None), user: dict = Depends(get_current_user)):
    _require_storage_setup_access(user)
    if not BROWSE_ROOT.exists():
        raise HTTPException(status_code=404, detail="参照可能なフォルダがありません")
    target = _resolve_in_browse_root(path)
    if not target.exists() or not target.is_dir():
        raise HTTPException(status_code=404, detail="フォルダが見つかりません")

    entries = []
    try:
        for entry in sorted(target.iterdir(), key=lambda p: p.name.lower()):
            try:
                if entry.is_dir():
                    entries.append({"name": entry.name, "path": str(entry)})
            except OSError:
                continue
    except PermissionError:
        pass

    base = BROWSE_ROOT.resolve()
    parent = str(target.parent) if target != base else None
    return {"currentPath": str(target), "parentPath": parent, "entries": entries}


@router.post("/mkdir")
def make_dir(payload: MkdirIn, user: dict = Depends(get_current_user)):
    _require_storage_setup_access(user)
    parent = _resolve_in_browse_root(payload.path)
    name = payload.name.strip()
    if not name or "/" in name or "\\" in name:
        raise HTTPException(status_code=400, detail="フォルダ名が不正です")
    new_dir = parent / name
    if not is_within_browse_root(new_dir):
        raise HTTPException(status_code=400, detail="許可されていないパスです")
    new_dir.mkdir(exist_ok=True)
    return {"name": new_dir.name, "path": str(new_dir)}
