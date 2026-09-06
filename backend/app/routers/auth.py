import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response

from ..auth import (
    users_store,
    hash_password,
    verify_password,
    create_session_token,
    find_user_by_email,
    get_current_user,
    public_user,
    SESSION_COOKIE_NAME,
)
from ..schemas import SignupIn, LoginIn
from ..admin_store import is_login_enabled

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_MAX_AGE = 30 * 86400


def _set_session_cookie(response: Response, user_id: str) -> str:
    token = create_session_token(user_id)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        path="/",
    )
    return token


@router.post("/signup")
def signup(payload: SignupIn, response: Response):
    if not is_login_enabled():
        raise HTTPException(status_code=403, detail="現在、新規登録・ログインは無効化されています")
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="メールアドレスを正しく入力してください")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="パスワードは6文字以上にしてください")
    if not payload.displayName.strip():
        raise HTTPException(status_code=400, detail="表示名を入力してください")
    if find_user_by_email(email) is not None:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")

    user_id = uuid.uuid4().hex
    user = {
        "id": user_id,
        "email": email,
        "displayName": payload.displayName.strip(),
        "passwordHash": hash_password(payload.password),
        "currentProjectId": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    users_store.write(user_id, user)
    token = _set_session_cookie(response, user_id)
    return {**public_user(user), "token": token}


@router.post("/login")
def login(payload: LoginIn, response: Response):
    if not is_login_enabled():
        raise HTTPException(status_code=403, detail="現在、新規登録・ログインは無効化されています")
    user = find_user_by_email(payload.email)
    if user is None or not verify_password(payload.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")
    token = _set_session_cookie(response, user["id"])
    return {**public_user(user), "token": token}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return public_user(user)
