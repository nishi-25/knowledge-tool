import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..schemas import ProjectCreateIn, StorageConfig
from ..seed import STORAGE_OPTIONS
from ..storage_factory import mask_storage_config, resolved_local_path, test_storage_config
from ..store import (
    projects_index_store,
    get_articles_store,
    get_folders_store,
    get_tags_store,
    get_comments_store,
    slugify,
)
from ..auth import get_current_user, users_store, public_user
from ..email_utils import send_notification_if_enabled
from ..membership import get_member, resolve_current_project, require_owner, is_owner, owner_count

router = APIRouter(prefix="/api/projects", tags=["project"])


def _present_project(project: dict, user: dict) -> dict:
    member = get_member(project, user["id"])
    role = member.get("role") if member else None

    result = {
        "id": project["id"],
        "name": project["name"],
        "storageProvider": project.get("storageProvider", "local"),
        "role": role,
        "createdAt": project.get("createdAt"),
    }
    if project.get("storageProvider", "local") == "local":
        result["resolvedPath"] = resolved_local_path(project, project["id"])

    if role == "owner":
        # 保存先の詳細設定（バケット名・フォルダID等、シークレットはmask_storage_configで除去済み）は
        # オーナーのみが必要とする情報のため、メンバーには返さない。
        masked = mask_storage_config(project)
        for key, value in masked.items():
            if key not in ("id", "name", "members", "ownerId", "inviteToken"):
                result[key] = value

    return result


def _my_projects(user: dict) -> list[dict]:
    projects = projects_index_store.list()
    mine = []
    for p in projects:
        member = get_member(p, user["id"])
        if member and member.get("status") == "approved":
            mine.append(p)
    mine.sort(key=lambda p: p["createdAt"])
    return mine


def _project_owner_name(project: dict) -> str:
    owner_id = project.get("ownerId")
    owner_user = users_store.read(owner_id) if owner_id else None
    if owner_user is None:
        first_owner = next((m for m in project.get("members", []) if m.get("role") == "owner"), None)
        owner_user = users_store.read(first_owner["userId"]) if first_owner else None
    return owner_user["displayName"] if owner_user else "不明なユーザー"


@router.get("")
def list_projects(user: dict = Depends(get_current_user)):
    result = []
    for p in _my_projects(user):
        presented = _present_project(p, user)
        presented["active"] = p["id"] == user.get("currentProjectId")
        result.append(presented)
    return result


@router.get("/current")
def get_current_project(user: dict = Depends(get_current_user)):
    pid = user.get("currentProjectId")
    if not pid:
        return {"configured": False}
    project = projects_index_store.read(pid)
    if project is None:
        return {"configured": False}
    member = get_member(project, user["id"])
    if not member or member.get("status") != "approved":
        return {"configured": False}
    return {"configured": True, **_present_project(project, user), "active": True}


@router.post("")
def create_project(payload: ProjectCreateIn, user: dict = Depends(get_current_user)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="プロジェクト名を入力してください")

    config = payload.storageConfig.model_dump()
    ok, message, resolved_config = test_storage_config(config)
    if not ok:
        raise HTTPException(status_code=400, detail=f"保存先への接続確認に失敗しました: {message}")

    existing_ids = {p["id"] for p in projects_index_store.list()}
    project_id = slugify(name, existing_ids)
    project = {
        "id": project_id,
        "name": name,
        "ownerId": user["id"],
        "members": [{"userId": user["id"], "role": "owner", "status": "approved", "requestedAt": datetime.now(timezone.utc).isoformat()}],
        "inviteToken": None,
        "storageProvider": resolved_config.get("provider", "local"),
        **{k: v for k, v in resolved_config.items() if k != "provider"},
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    projects_index_store.write(project_id, project)
    # データディレクトリ／保存先を実際に使える状態にしておく
    get_articles_store(project_id)
    get_folders_store(project_id)
    get_tags_store(project_id)
    get_comments_store(project_id)

    user["currentProjectId"] = project_id
    users_store.write(user["id"], user)

    return {**_present_project(project, user), "active": True}


@router.get("/discoverable")
def list_discoverable_projects(user: dict = Depends(get_current_user)):
    result = []
    for p in projects_index_store.list():
        member = get_member(p, user["id"])
        if member and member.get("status") == "approved":
            continue
        result.append({
            "id": p["id"],
            "name": p["name"],
            "ownerName": _project_owner_name(p),
            "memberCount": sum(1 for m in p.get("members", []) if m.get("status") == "approved"),
            "myStatus": member.get("status") if member else None,
        })
    result.sort(key=lambda x: x["name"])
    return result


@router.post("/{project_id}/request")
def request_join_project(project_id: str, user: dict = Depends(get_current_user)):
    project = projects_index_store.read(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
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


@router.post("/{project_id}/activate")
def activate_project(project_id: str, user: dict = Depends(get_current_user)):
    project = projects_index_store.read(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    member = get_member(project, user["id"])
    if not member or member.get("status") != "approved":
        raise HTTPException(status_code=403, detail="このプロジェクトへのアクセス権がありません")
    user["currentProjectId"] = project_id
    users_store.write(user["id"], user)
    return {"ok": True}


@router.post("/storage-test")
def storage_test(payload: StorageConfig, user: dict = Depends(get_current_user)):
    ok, message, resolved_config = test_storage_config(payload.model_dump())
    return {"ok": ok, "message": message, "resolvedConfig": mask_storage_config(resolved_config)}


@router.put("/current/storage")
def update_current_storage(payload: StorageConfig, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    ok, message, resolved_config = test_storage_config(payload.model_dump())
    if not ok:
        raise HTTPException(status_code=400, detail=f"保存先への接続確認に失敗しました: {message}")

    project["storageProvider"] = resolved_config.get("provider", "local")
    for k, v in resolved_config.items():
        if k != "provider":
            project[k] = v
    projects_index_store.write(project["id"], project)
    return {**_present_project(project, user), "active": True}


@router.get("/storage-options")
def get_storage_options():
    return STORAGE_OPTIONS


# --- メンバー招待・承認 -----------------------------------------------------

@router.post("/current/invite")
def create_invite(user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    if not project.get("inviteToken"):
        project["inviteToken"] = secrets.token_urlsafe(20)
        projects_index_store.write(project["id"], project)
    return {"token": project["inviteToken"]}


@router.get("/current/members")
def list_members(user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    result = []
    for m in project.get("members", []):
        member_user = users_store.read(m["userId"])
        result.append({
            **m,
            "displayName": member_user["displayName"] if member_user else "(削除されたユーザー)",
            "email": member_user["email"] if member_user else "",
        })
    return result


@router.get("/current/requests")
def list_pending_requests(user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    result = []
    for m in project.get("members", []):
        if m.get("status") == "pending":
            member_user = users_store.read(m["userId"])
            result.append({
                **m,
                "displayName": member_user["displayName"] if member_user else "(削除されたユーザー)",
                "email": member_user["email"] if member_user else "",
            })
    return result


@router.post("/current/requests/{user_id}/approve")
def approve_request(user_id: str, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    member = get_member(project, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="申請が見つかりません")
    member["status"] = "approved"
    projects_index_store.write(project["id"], project)
    approved_user = users_store.read(user_id)
    if approved_user:
        send_notification_if_enabled(
            "memberApproved",
            approved_user["email"],
            f'【Knowledge View】「{project["name"]}」への参加が承認されました',
            f'{approved_user["displayName"]} 様\n\n「{project["name"]}」への参加申請が承認されました。\nアプリからログインしてご利用ください。',
        )
    return {"ok": True}


@router.post("/current/requests/{user_id}/reject")
def reject_request(user_id: str, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    member = get_member(project, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="申請が見つかりません")
    member["status"] = "rejected"
    projects_index_store.write(project["id"], project)
    return {"ok": True}


@router.post("/current/members/{user_id}/remove")
def remove_member(user_id: str, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    target = get_member(project, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")
    if target.get("role") == "owner" and owner_count(project) <= 1:
        raise HTTPException(status_code=400, detail="最後のオーナーは削除できません")
    project["members"] = [m for m in project.get("members", []) if m["userId"] != user_id]
    projects_index_store.write(project["id"], project)
    return {"ok": True}


@router.post("/current/members/{user_id}/promote")
def promote_member(user_id: str, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    member = get_member(project, user_id)
    if member is None or member.get("status") != "approved":
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")
    member["role"] = "owner"
    projects_index_store.write(project["id"], project)
    return {"ok": True}


@router.post("/current/members/{user_id}/demote")
def demote_member(user_id: str, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    member = get_member(project, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")
    if member.get("role") == "owner" and owner_count(project) <= 1:
        raise HTTPException(status_code=400, detail="最後のオーナーを降格することはできません")
    member["role"] = "member"
    projects_index_store.write(project["id"], project)
    return {"ok": True}
