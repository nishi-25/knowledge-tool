from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user, users_store
from ..membership import get_member
from ..store import projects_index_store

router = APIRouter(prefix="/api/invites", tags=["invites"])


def _find_project_by_token(token: str) -> dict:
    for project in projects_index_store.list():
        if project.get("inviteToken") == token:
            return project
    raise HTTPException(status_code=404, detail="招待リンクが無効です")


@router.get("/{token}")
def get_invite(token: str, user: dict = Depends(get_current_user)):
    project = _find_project_by_token(token)
    owner = users_store.read(project.get("ownerId", ""))
    member = get_member(project, user["id"])
    return {
        "projectName": project["name"],
        "ownerName": owner["displayName"] if owner else "不明なユーザー",
        "status": member.get("status") if member else "none",
    }


@router.post("/{token}/request")
def request_access(token: str, user: dict = Depends(get_current_user)):
    project = _find_project_by_token(token)
    member = get_member(project, user["id"])
    if member is not None:
        if member.get("status") == "rejected":
            member["status"] = "pending"
            member["requestedAt"] = datetime.now(timezone.utc).isoformat()
            projects_index_store.write(project["id"], project)
        return {"status": member.get("status")}

    project.setdefault("members", []).append({
        "userId": user["id"],
        "role": "member",
        "status": "pending",
        "requestedAt": datetime.now(timezone.utc).isoformat(),
    })
    projects_index_store.write(project["id"], project)
    return {"status": "pending"}
