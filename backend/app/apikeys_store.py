import hashlib
import secrets
from datetime import datetime, timezone

from .config import LOCAL_ROOT
from .storage.local_file import LocalFileStorage

# APIキーはプロジェクトが選んだ保存先（S3等）に関わらず、常にこのマシン上の
# LOCAL_ROOT に置く。アクセス制御そのものであり、記事コンテンツとは性質が
# 異なるため（projects_index_store と同様の扱い）。
_index_store = LocalFileStorage(LOCAL_ROOT / "api_keys_index")  # doc_id = sha256(raw key)


def _project_keys_store(project_id: str):
    return LocalFileStorage(LOCAL_ROOT / "projects" / project_id / "apikeys")


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def create_api_key(project_id: str, label: str) -> tuple[str, dict]:
    raw_key = "kv_live_" + secrets.token_urlsafe(24)
    key_hash = _hash_key(raw_key)
    key_id = secrets.token_hex(8)
    now = datetime.now(timezone.utc).isoformat()
    meta = {"id": key_id, "label": label.strip() or "無題のAPIキー", "createdAt": now, "lastUsedAt": None}
    _project_keys_store(project_id).write(key_id, {**meta, "keyHash": key_hash})
    _index_store.write(key_hash, {"projectId": project_id, "keyId": key_id})
    return raw_key, meta


def list_api_keys(project_id: str) -> list[dict]:
    items = _project_keys_store(project_id).list()
    return sorted(
        [{"id": i["id"], "label": i["label"], "createdAt": i["createdAt"], "lastUsedAt": i.get("lastUsedAt")} for i in items],
        key=lambda i: i["createdAt"],
        reverse=True,
    )


def revoke_api_key(project_id: str, key_id: str) -> bool:
    store = _project_keys_store(project_id)
    meta = store.read(key_id)
    if meta is None:
        return False
    _index_store.delete(meta["keyHash"])
    store.delete(key_id)
    return True


def resolve_project_id_from_key(raw_key: str) -> str | None:
    if not raw_key:
        return None
    entry = _index_store.read(_hash_key(raw_key))
    if entry is None:
        return None
    project_id = entry["projectId"]
    key_id = entry["keyId"]
    proj_store = _project_keys_store(project_id)
    meta = proj_store.read(key_id)
    if meta is not None:
        meta["lastUsedAt"] = datetime.now(timezone.utc).isoformat()
        proj_store.write(key_id, meta)
    return project_id
