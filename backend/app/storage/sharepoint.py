import json
import time
from typing import Any, Optional
from urllib.parse import urlparse

import requests

from .base import StorageAdapter

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


def resolve_site_id(tenant_id: str, client_id: str, client_secret: str, site_url: str) -> str:
    """SharePointサイトのURLからMicrosoft GraphのサイトIDを解決する（接続テスト・初回設定時に使用）。"""
    token = _fetch_token(tenant_id, client_id, client_secret)
    parsed = urlparse(site_url)
    hostname = parsed.netloc
    site_path = parsed.path.strip("/")
    res = requests.get(
        f"{GRAPH_BASE}/sites/{hostname}:/{site_path}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    res.raise_for_status()
    return res.json()["id"]


def _fetch_token(tenant_id: str, client_id: str, client_secret: str) -> str:
    res = requests.post(
        f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "https://graph.microsoft.com/.default",
        },
        timeout=15,
    )
    res.raise_for_status()
    return res.json()["access_token"]


class SharePointStorage(StorageAdapter):
    """SharePoint Online のドキュメントライブラリに1アイテム=1ファイル（JSON）として保存するアダプター。

    認証は Azure AD アプリ登録の「クライアント資格情報フロー」（アプリケーション権限
    Sites.ReadWrite.All を管理者同意済みにしたもの）を使用する。
    """

    def __init__(self, tenant_id: str, client_id: str, client_secret: str, site_id: str, folder_path: str, name_prefix: str):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.site_id = site_id
        self.folder_path = folder_path.strip("/")
        self.name_prefix = name_prefix
        self._token = None
        self._token_expires_at = 0

    def _access_token(self) -> str:
        if self._token and time.time() < self._token_expires_at - 30:
            return self._token
        self._token = _fetch_token(self.tenant_id, self.client_id, self.client_secret)
        self._token_expires_at = time.time() + 3500
        return self._token

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._access_token()}"}

    def _item_path(self, filename: str) -> str:
        return f"{self.folder_path}/{filename}" if self.folder_path else filename

    def _children_url(self) -> str:
        if self.folder_path:
            return f"{GRAPH_BASE}/sites/{self.site_id}/drive/root:/{self.folder_path}:/children"
        return f"{GRAPH_BASE}/sites/{self.site_id}/drive/root/children"

    def _content_url(self, filename: str) -> str:
        return f"{GRAPH_BASE}/sites/{self.site_id}/drive/root:/{self._item_path(filename)}:/content"

    def _filename(self, item_id: str) -> str:
        return f"{self.name_prefix}{item_id}.json"

    def list(self) -> list[dict[str, Any]]:
        res = requests.get(self._children_url(), headers=self._headers(), timeout=15)
        res.raise_for_status()
        items = []
        for entry in res.json().get("value", []):
            name = entry.get("name", "")
            if "file" in entry and name.startswith(self.name_prefix) and name.endswith(".json"):
                content = requests.get(self._content_url(name), headers=self._headers(), timeout=15)
                content.raise_for_status()
                items.append(content.json())
        return items

    def read(self, item_id: str) -> Optional[dict[str, Any]]:
        res = requests.get(self._content_url(self._filename(item_id)), headers=self._headers(), timeout=15)
        if res.status_code == 404:
            return None
        res.raise_for_status()
        return res.json()

    def write(self, item_id: str, data: dict[str, Any]) -> None:
        content = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        res = requests.put(
            self._content_url(self._filename(item_id)),
            headers={**self._headers(), "Content-Type": "application/json"},
            data=content,
            timeout=30,
        )
        res.raise_for_status()

    def delete(self, item_id: str) -> None:
        res = requests.delete(
            f"{GRAPH_BASE}/sites/{self.site_id}/drive/root:/{self._item_path(self._filename(item_id))}",
            headers=self._headers(),
            timeout=15,
        )
        if res.status_code not in (204, 404):
            res.raise_for_status()
