import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import Cookie, Header, HTTPException

from .config import APP_MODE, LOCAL_ROOT
from .storage.local_file import LocalFileStorage

users_store = LocalFileStorage(LOCAL_ROOT / "users")

SESSION_COOKIE_NAME = "kv_session"
SESSION_DAYS_VALID = 30
_SECRET_KEY_FILE = LOCAL_ROOT / "session_secret.key"

LOCAL_DESKTOP_USER_ID = "local"


def _get_or_create_local_desktop_user() -> dict:
    """デスクトップモード（KV_MODE=desktop）では、ログイン不要の固定ローカルユーザーを
    自動的に用意する。プロジェクト・メンバーシップ周りの既存ロジックはそのまま使い回せる。"""
    user = users_store.read(LOCAL_DESKTOP_USER_ID)
    if user is None:
        user = {
            "id": LOCAL_DESKTOP_USER_ID,
            "email": "local@device",
            "displayName": "You",
            "passwordHash": "",
            "currentProjectId": None,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        users_store.write(LOCAL_DESKTOP_USER_ID, user)
    return user


def _get_secret_key() -> bytes:
    if _SECRET_KEY_FILE.exists():
        return _SECRET_KEY_FILE.read_bytes()
    LOCAL_ROOT.mkdir(parents=True, exist_ok=True)
    key = secrets.token_bytes(32)
    _SECRET_KEY_FILE.write_bytes(key)
    try:
        # このファイルを読めるとどのユーザーIDでもセッションを偽造できるため、所有者のみ読める権限にする
        os.chmod(_SECRET_KEY_FILE, 0o600)
    except OSError:
        pass
    return key


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    iterations = 260_000
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iterations, salt_b64, hash_b64 = stored.split("$")
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False


def create_session_token(user_id: str) -> str:
    payload = {"uid": user_id, "exp": time.time() + SESSION_DAYS_VALID * 86400}
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = hmac.new(_get_secret_key(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"


def verify_session_token(token: str) -> Optional[str]:
    try:
        payload_b64, sig = token.split(".")
        expected_sig = hmac.new(_get_secret_key(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        if payload["exp"] < time.time():
            return None
        return payload["uid"]
    except Exception:
        return None


def find_user_by_email(email: str) -> Optional[dict]:
    email = email.strip().lower()
    for user in users_store.list():
        if user.get("email") == email:
            return user
    return None


def _extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return authorization[7:].strip() or None


def get_current_user(
    kv_session: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    if APP_MODE == "desktop":
        return _get_or_create_local_desktop_user()

    token = kv_session or _extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="ログインが必要です")
    uid = verify_session_token(token)
    if not uid:
        raise HTTPException(status_code=401, detail="セッションが無効です。再度ログインしてください")
    user = users_store.read(uid)
    if user is None:
        raise HTTPException(status_code=401, detail="ユーザーが見つかりません")
    return user


def get_current_user_optional(
    kv_session: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
) -> Optional[dict]:
    if APP_MODE == "desktop":
        return _get_or_create_local_desktop_user()

    token = kv_session or _extract_bearer_token(authorization)
    if not token:
        return None
    uid = verify_session_token(token)
    if not uid:
        return None
    return users_store.read(uid)


def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "displayName": user["displayName"],
        "mustChangePassword": bool(user.get("mustChangePassword")),
    }
