from .config import LOCAL_ROOT
from .storage.local_file import LocalFileStorage

_email_store = LocalFileStorage(LOCAL_ROOT / "email")


def _default_config() -> dict:
    return {
        "enabled": False,
        "smtpHost": "",
        "smtpPort": 587,
        "smtpUsername": "",
        "smtpPassword": "",
        "useTls": True,
        "fromAddress": "",
        "fromName": "Knowledge View",
    }


def get_email_config() -> dict:
    cfg = _email_store.read("config")
    if cfg is None:
        cfg = _default_config()
        _email_store.write("config", cfg)
    return cfg


def save_email_config(cfg: dict) -> None:
    _email_store.write("config", cfg)
