import json
from typing import Any, Optional

import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request as GoogleAuthRequest

DRIVE_API = "https://www.googleapis.com/drive/v3"
DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3"

from .base import StorageAdapter


class GDriveStorage(StorageAdapter):
    """Google ドライブのフォルダに1アイテム=1ファイル（JSON）として保存するアダプター。

    認証は Google Cloud のサービスアカウント（JSONキー）を使用する。対象フォルダを
    サービスアカウントのメールアドレスと共有（編集者権限）しておく必要がある。
    """

    def __init__(self, service_account_json: str, folder_id: str, name_prefix: str):
        info = json.loads(service_account_json)
        self._credentials = service_account.Credentials.from_service_account_info(
            info, scopes=["https://www.googleapis.com/auth/drive"]
        )
        self.folder_id = folder_id
        self.name_prefix = name_prefix

    def _access_token(self) -> str:
        if not self._credentials.valid:
            self._credentials.refresh(GoogleAuthRequest())
        return self._credentials.token

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._access_token()}"}

    def _filename(self, item_id: str) -> str:
        return f"{self.name_prefix}{item_id}.json"

    def _find_file(self, filename: str) -> Optional[dict]:
        q = f"'{self.folder_id}' in parents and name = '{filename}' and trashed = false"
        res = requests.get(f"{DRIVE_API}/files", headers=self._headers(), params={"q": q, "fields": "files(id,name)"}, timeout=15)
        res.raise_for_status()
        files = res.json().get("files", [])
        return files[0] if files else None

    def list(self) -> list[dict[str, Any]]:
        q = f"'{self.folder_id}' in parents and trashed = false"
        res = requests.get(f"{DRIVE_API}/files", headers=self._headers(), params={"q": q, "fields": "files(id,name)"}, timeout=15)
        res.raise_for_status()
        items = []
        for f in res.json().get("files", []):
            name = f.get("name", "")
            if name.startswith(self.name_prefix) and name.endswith(".json"):
                content = requests.get(f"{DRIVE_API}/files/{f['id']}", headers=self._headers(), params={"alt": "media"}, timeout=15)
                content.raise_for_status()
                items.append(content.json())
        return items

    def read(self, item_id: str) -> Optional[dict[str, Any]]:
        existing = self._find_file(self._filename(item_id))
        if existing is None:
            return None
        res = requests.get(f"{DRIVE_API}/files/{existing['id']}", headers=self._headers(), params={"alt": "media"}, timeout=15)
        res.raise_for_status()
        return res.json()

    def write(self, item_id: str, data: dict[str, Any]) -> None:
        filename = self._filename(item_id)
        content = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        existing = self._find_file(filename)
        if existing is not None:
            res = requests.patch(
                f"{DRIVE_UPLOAD_API}/files/{existing['id']}",
                headers={**self._headers(), "Content-Type": "application/json"},
                params={"uploadType": "media"},
                data=content,
                timeout=30,
            )
        else:
            metadata = {"name": filename, "parents": [self.folder_id]}
            res = requests.post(
                f"{DRIVE_UPLOAD_API}/files",
                headers=self._headers(),
                params={"uploadType": "multipart"},
                files={
                    "metadata": ("metadata", json.dumps(metadata), "application/json"),
                    "file": (filename, content, "application/json"),
                },
                timeout=30,
            )
        res.raise_for_status()

    def delete(self, item_id: str) -> None:
        existing = self._find_file(self._filename(item_id))
        if existing is None:
            return
        res = requests.delete(f"{DRIVE_API}/files/{existing['id']}", headers=self._headers(), timeout=15)
        if res.status_code not in (204, 404):
            res.raise_for_status()
