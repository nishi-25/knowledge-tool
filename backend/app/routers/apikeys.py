from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..auth import get_current_user
from ..membership import resolve_current_project, require_owner
from ..apikeys_store import create_api_key, list_api_keys, revoke_api_key

router = APIRouter(prefix="/api/apikeys", tags=["apikeys"])


class ApiKeyIn(BaseModel):
    label: str = ""


@router.get("")
def list_keys(user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    return list_api_keys(project["id"])


@router.post("")
def create_key(payload: ApiKeyIn, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    raw_key, meta = create_api_key(project["id"], payload.label)
    return {**meta, "key": raw_key}


@router.delete("/{key_id}")
def delete_key(key_id: str, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    require_owner(project, user)
    if not revoke_api_key(project["id"], key_id):
        raise HTTPException(status_code=404, detail="APIキーが見つかりません")
    return {"ok": True}
