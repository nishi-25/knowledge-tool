import uuid
from datetime import datetime, timezone

from .config import LOCAL_ROOT
from .storage.local_file import LocalFileStorage

# 通知はユーザーに紐づき、どのプロジェクトを見ているかに関係なく届くべきなので
# プロジェクトの保存先（S3等）ではなく、常にこのマシンのLOCAL_ROOT配下に置く。
MAX_NOTIFICATIONS_PER_USER = 200


def _store(user_id: str):
    return LocalFileStorage(LOCAL_ROOT / "notifications" / user_id)


def notify_user(user_id: str, kind: str, title: str, body: str = "", link: dict | None = None) -> None:
    store = _store(user_id)
    notif_id = uuid.uuid4().hex
    store.write(notif_id, {
        "id": notif_id,
        "kind": kind,
        "title": title,
        "body": body,
        "link": link,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "read": False,
    })
    items = store.list()
    if len(items) > MAX_NOTIFICATIONS_PER_USER:
        items.sort(key=lambda n: n["createdAt"])
        for old in items[: len(items) - MAX_NOTIFICATIONS_PER_USER]:
            store.delete(old["id"])


def list_notifications(user_id: str) -> list[dict]:
    items = _store(user_id).list()
    items.sort(key=lambda n: n["createdAt"], reverse=True)
    return items


def unread_count(user_id: str) -> int:
    return sum(1 for n in _store(user_id).list() if not n.get("read"))


def mark_read(user_id: str, notification_id: str) -> bool:
    store = _store(user_id)
    n = store.read(notification_id)
    if n is None:
        return False
    n["read"] = True
    store.write(notification_id, n)
    return True


def mark_all_read(user_id: str) -> None:
    store = _store(user_id)
    for n in store.list():
        if not n.get("read"):
            n["read"] = True
            store.write(n["id"], n)
