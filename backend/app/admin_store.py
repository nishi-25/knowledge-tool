import secrets

from .config import LOCAL_ROOT
from .storage.local_file import LocalFileStorage

_admin_store = LocalFileStorage(LOCAL_ROOT / "admin")
support_requests_store = LocalFileStorage(LOCAL_ROOT / "support_requests")

ADMIN_SENTINEL_ID = "__admin__"
ADMIN_SESSION_COOKIE = "kv_admin_session"


def _default_config() -> dict:
    # 初回起動時は未設定。最初にアドミン画面を開いた人がユーザー名・パスワードを決めるが、
    # 悪意のある第三者が先に初期設定を済ませてしまわないよう、サーバー起動時にログへ
    # 出力される setupToken の入力を必須にする（docker compose logs backend で確認できる）。
    return {
        "configured": False,
        "username": None,
        "passwordHash": None,
        "loginEnabled": True,
        "setupToken": secrets.token_urlsafe(16),
    }


def get_admin_config() -> dict:
    cfg = _admin_store.read("config")
    if cfg is None:
        cfg = _default_config()
        _admin_store.write("config", cfg)
    return cfg


def save_admin_config(cfg: dict) -> None:
    _admin_store.write("config", cfg)


def is_login_enabled() -> bool:
    return get_admin_config().get("loginEnabled", True)


def print_setup_token_if_needed() -> None:
    cfg = get_admin_config()
    if cfg.get("configured"):
        return
    token = cfg.get("setupToken")
    if not token:
        # 旧バージョンのconfigにsetupTokenが無い場合は発行して保存する
        token = secrets.token_urlsafe(16)
        cfg["setupToken"] = token
        save_admin_config(cfg)
    print("=" * 60, flush=True)
    print("[Knowledge View] 管理者アカウントが未設定です。", flush=True)
    print(f"[Knowledge View] 初期設定トークン: {token}", flush=True)
    print("[Knowledge View] /admin を開き、このトークンを入力して設定してください。", flush=True)
    print("=" * 60, flush=True)
