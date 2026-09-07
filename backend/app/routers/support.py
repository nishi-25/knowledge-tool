import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from ..admin_store import support_requests_store
from ..rate_limit import enforce_rate_limit
from ..schemas import ForgotPasswordIn, ForgotUsernameIn

router = APIRouter(prefix="/api/support", tags=["support"])


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordIn, request: Request):
    enforce_rate_limit(request, "forgot-password", max_attempts=5, window_seconds=300)
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="メールアドレスを正しく入力してください")
    req_id = uuid.uuid4().hex
    support_requests_store.write(req_id, {
        "id": req_id,
        "type": "password",
        "email": email,
        "note": "",
        "status": "pending",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "resolvedAt": None,
    })
    return {"ok": True}


@router.post("/forgot-username")
def forgot_username(payload: ForgotUsernameIn, request: Request):
    enforce_rate_limit(request, "forgot-username", max_attempts=5, window_seconds=300)
    req_id = uuid.uuid4().hex
    support_requests_store.write(req_id, {
        "id": req_id,
        "type": "username",
        "email": "",
        "note": payload.note.strip()[:500],
        "status": "pending",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "resolvedAt": None,
    })
    return {"ok": True}
