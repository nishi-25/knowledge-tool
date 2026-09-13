from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..auth import get_current_user
from ..membership import resolve_current_project, require_owner
from ..apikeys_store import (
    create_api_key,
    list_api_keys,
    revoke_api_key,
    create_account_api_key,
    list_account_api_keys,
    revoke_account_api_key,
)

router = APIRouter(prefix="/api/apikeys", tags=["apikeys"])
account_router = APIRouter(prefix="/api/account-apikeys", tags=["account-apikeys"])


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


# --- アカウントAPIキー（ユーザー本人が所有する全プロジェクトの作成・名称変更・削除に
# 使う。特定のプロジェクトに紐づかないため、オーナー権限のチェックは行わない） -----------

@account_router.get("")
def list_account_keys(user: dict = Depends(get_current_user)):
    return list_account_api_keys(user["id"])


@account_router.post("")
def create_account_key(payload: ApiKeyIn, user: dict = Depends(get_current_user)):
    raw_key, meta = create_account_api_key(user["id"], payload.label)
    return {**meta, "key": raw_key}


@account_router.delete("/{key_id}")
def delete_account_key(key_id: str, user: dict = Depends(get_current_user)):
    if not revoke_account_api_key(user["id"], key_id):
        raise HTTPException(status_code=404, detail="APIキーが見つかりません")
    return {"ok": True}
