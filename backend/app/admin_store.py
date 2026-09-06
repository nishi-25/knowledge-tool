from .config import LOCAL_ROOT
from .storage.local_file import LocalFileStorage

_admin_store = LocalFileStorage(LOCAL_ROOT / "admin")

ADMIN_SENTINEL_ID = "__admin__"
ADMIN_SESSION_COOKIE = "kv_admin_session"


def _default_config() -> dict:
    # 初回起動時は未設定。最初にアドミン画面を開いた人がユーザー名・パスワードを決める。
    return {"configured": False, "username": None, "passwordHash": None, "loginEnabled": True}


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
