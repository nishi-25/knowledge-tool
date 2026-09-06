from abc import ABC, abstractmethod
from typing import Any, Optional


class StorageAdapter(ABC):
    """保存先アダプターの共通インターフェース。

    ローカルストレージ／AWS S3／Google ドライブ／SharePoint Online／Box など、
    保存先の種別によらず同じインターフェースでコレクション（記事・フォルダ・タグ等）
    を読み書きできるようにする。UI・APIレイヤーはアダプターの種別を意識しない。
    """

    @abstractmethod
    def list(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def read(self, item_id: str) -> Optional[dict[str, Any]]: ...

    @abstractmethod
    def write(self, item_id: str, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def delete(self, item_id: str) -> None: ...
