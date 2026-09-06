import json
from pathlib import Path
from typing import Any, Optional

from .base import StorageAdapter


class LocalFileStorage(StorageAdapter):
    """ローカルファイルシステムに1アイテム=1JSONファイルとして保存するアダプター。"""

    def __init__(self, directory: Path):
        self.directory = directory
        self.directory.mkdir(parents=True, exist_ok=True)

    def _path(self, item_id: str) -> Path:
        return self.directory / f"{item_id}.json"

    def list(self) -> list[dict[str, Any]]:
        items = []
        for p in sorted(self.directory.glob("*.json")):
            items.append(json.loads(p.read_text(encoding="utf-8")))
        return items

    def read(self, item_id: str) -> Optional[dict[str, Any]]:
        p = self._path(item_id)
        if not p.exists():
            return None
        return json.loads(p.read_text(encoding="utf-8"))

    def write(self, item_id: str, data: dict[str, Any]) -> None:
        self._path(item_id).write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    def delete(self, item_id: str) -> None:
        p = self._path(item_id)
        if p.exists():
            p.unlink()
