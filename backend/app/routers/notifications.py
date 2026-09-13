from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..notifications_store import list_notifications, unread_count, mark_read, mark_all_read

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def get_notifications(user: dict = Depends(get_current_user)):
    return list_notifications(user["id"])


@router.get("/unread-count")
def get_unread_count(user: dict = Depends(get_current_user)):
    return {"count": unread_count(user["id"])}


@router.post("/{notification_id}/read")
def read_notification(notification_id: str, user: dict = Depends(get_current_user)):
    if not mark_read(user["id"], notification_id):
        raise HTTPException(status_code=404, detail="通知が見つかりません")
    return {"ok": True}


@router.post("/read-all")
def read_all_notifications(user: dict = Depends(get_current_user)):
    mark_all_read(user["id"])
    return {"ok": True}
