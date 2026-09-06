import time
from typing import Any, Optional

import requests

from .base import StorageAdapter

TOKEN_URL = "https://api.box.com/oauth2/token"
API_BASE = "https://api.box.com/2.0"
UPLOAD_BASE = "https://upload.box.com/api/2.0"


class BoxStorage(StorageAdapter):
    """Box のフォルダに1アイテム=1ファイル（JSON）として保存するアダプター。

    認証は Box のカスタムアプリの「サーバー認証（Client Credentials Grant）」を使用する。
    Box 開発者コンソールでアプリを作成し、Client ID / Client Secret / Enterprise ID を
    取得し、対象フォルダをそのアプリのサービスアカウントと共有しておく必要がある。
    """

    def __init__(self, client_id: str, client_secret: str, enterprise_id: str, folder_id: str, name_prefix: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.enterprise_id = enterprise_id
        self.folder_id = folder_id
        self.name_prefix = name_prefix
        self._token = None
        self._token_expires_at = 0

    def _access_token(self) -> str:
        if self._token and time.time() < self._token_expires_at - 30:
            return self._token
        res = requests.post(TOKEN_URL, data={
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "box_subject_type": "enterprise",
            "box_subject_id": self.enterprise_id,
        }, timeout=15)
        res.raise_for_status()
        payload = res.json()
        self._token = payload["access_token"]
        self._token_expires_at = time.time() + payload.get("expires_in", 3600)
        return self._token

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._access_token()}"}

    def _filename(self, item_id: str) -> str:
        return f"{self.name_prefix}{item_id}.json"

    def _find_file(self, filename: str) -> Optional[dict]:
        res = requests.get(
            f"{API_BASE}/folders/{self.folder_id}/items",
            headers=self._headers(),
            params={"fields": "name,id", "limit": 1000},
            timeout=15,
        )
        res.raise_for_status()
        for entry in res.json().get("entries", []):
            if entry.get("type") == "file" and entry.get("name") == filename:
                return entry
        return None

    def list(self) -> list[dict[str, Any]]:
        res = requests.get(
            f"{API_BASE}/folders/{self.folder_id}/items",
            headers=self._headers(),
            params={"fields": "name,id", "limit": 1000},
            timeout=15,
        )
        res.raise_for_status()
        items = []
        for entry in res.json().get("entries", []):
            name = entry.get("name", "")
            if entry.get("type") == "file" and name.startswith(self.name_prefix) and name.endswith(".json"):
                content = requests.get(f"{API_BASE}/files/{entry['id']}/content", headers=self._headers(), timeout=15)
                content.raise_for_status()
                items.append(content.json())
        return items

    def read(self, item_id: str) -> Optional[dict[str, Any]]:
        existing = self._find_file(self._filename(item_id))
        if existing is None:
            return None
        res = requests.get(f"{API_BASE}/files/{existing['id']}/content", headers=self._headers(), timeout=15)
        res.raise_for_status()
        return res.json()

    def write(self, item_id: str, data: dict[str, Any]) -> None:
        filename = self._filename(item_id)
        import json as _json
        content = _json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        existing = self._find_file(filename)
        if existing is not None:
            res = requests.post(
                f"{UPLOAD_BASE}/files/{existing['id']}/content",
                headers=self._headers(),
                files={"file": (filename, content, "application/json")},
                timeout=30,
            )
        else:
            attributes = {"name": filename, "parent": {"id": self.folder_id}}
            res = requests.post(
                f"{UPLOAD_BASE}/files/content",
                headers=self._headers(),
                data={"attributes": _json.dumps(attributes)},
                files={"file": (filename, content, "application/json")},
                timeout=30,
            )
        res.raise_for_status()

    def delete(self, item_id: str) -> None:
        existing = self._find_file(self._filename(item_id))
        if existing is None:
            return
        res = requests.delete(f"{API_BASE}/files/{existing['id']}", headers=self._headers(), timeout=15)
        if res.status_code not in (204, 404):
            res.raise_for_status()
