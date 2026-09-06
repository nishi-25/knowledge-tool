from typing import Optional

from fastapi import HTTPException

from .store import projects_index_store


def get_member(project: dict, user_id: str) -> Optional[dict]:
    return next((m for m in project.get("members", []) if m["userId"] == user_id), None)


def resolve_current_project(user: dict) -> dict:
    pid = user.get("currentProjectId")
    if not pid:
        raise HTTPException(status_code=400, detail="プロジェクトが選択されていません")
    project = projects_index_store.read(pid)
    if project is None:
        raise HTTPException(status_code=400, detail="プロジェクトが選択されていません")
    member = get_member(project, user["id"])
    if not member or member.get("status") != "approved":
        raise HTTPException(status_code=403, detail="このプロジェクトへのアクセス権がありません")
    return project


def require_owner(project: dict, user: dict) -> None:
    member = get_member(project, user["id"])
    if not member or member.get("role") != "owner":
        raise HTTPException(status_code=403, detail="オーナーのみ実行できます")


def is_owner(project: dict, user: dict) -> bool:
    member = get_member(project, user["id"])
    return bool(member and member.get("role") == "owner")


def owner_count(project: dict) -> int:
    return sum(1 for m in project.get("members", []) if m.get("role") == "owner")
