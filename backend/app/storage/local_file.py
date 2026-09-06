import json
import os
import re
from pathlib import Path
from typing import Any, Optional

from .base import StorageAdapter

_SAFE_ITEM_ID_RE = re.compile(r"^[A-Za-z0-9_-]+$")


class LocalFileStorage(StorageAdapter):
    """ローカルファイルシステムに1アイテム=1JSONファイルとして保存するアダプター。"""

    def __init__(self, directory: Path):
        self.directory = directory
        self.directory.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(self.directory, 0o700)
        except OSError:
            pass

    def _path(self, item_id: str) -> Path:
        # item_idはAPIのパスパラメータ経由でクライアントから渡ることがあるため、
        # ディレクトリトラバーサル（"../"や"\"を含むIDなど）を防ぐ。
        if not _SAFE_ITEM_ID_RE.match(item_id or ""):
            raise ValueError(f"不正なitem_idです: {item_id!r}")
        return self.directory / f"{item_id}.json"

    def list(self) -> list[dict[str, Any]]:
        items = []
        for p in sorted(self.directory.glob("*.json")):
            items.append(json.loads(p.read_text(encoding="utf-8")))
        return items

    def read(self, item_id: str) -> Optional[dict[str, Any]]:
        try:
            p = self._path(item_id)
        except ValueError:
            return None
        if not p.exists():
            return None
        return json.loads(p.read_text(encoding="utf-8"))

    def write(self, item_id: str, data: dict[str, Any]) -> None:
        path = self._path(item_id)
        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        try:
            # 認証情報・パスワードハッシュ等を含むため、所有者のみ読める権限にする
            os.chmod(path, 0o600)
        except OSError:
            pass

    def delete(self, item_id: str) -> None:
        try:
            p = self._path(item_id)
        except ValueError:
            return
        if p.exists():
            p.unlink()
