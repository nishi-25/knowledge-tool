from .config import LOCAL_ROOT
from .storage.local_file import LocalFileStorage

_email_store = LocalFileStorage(LOCAL_ROOT / "email")

# 通知の種類ごとに送信有無を切り替えられるようにする。
# キーを追加する場合は、実際に送信箇所を実装したうえでここにも既定値を追加すること。
DEFAULT_NOTIFICATIONS = {
    "accountRegistered": True,   # 新規アカウント登録時にユーザー本人へ
    "memberApproved": True,      # プロジェクト参加が承認されたときにユーザー本人へ
    "passwordReset": True,       # パスワードリセット（新しいパスワードの設定）完了時にユーザー本人へ
    "articleCreated": True,      # プロジェクトに新しい記事が作成されたときに他のメンバーへ
}


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
        "notifications": dict(DEFAULT_NOTIFICATIONS),
    }


def get_email_config() -> dict:
    cfg = _email_store.read("config")
    if cfg is None:
        cfg = _default_config()
        _email_store.write("config", cfg)
        return cfg
    # 旧バージョンで保存された設定に notifications が無い場合は既定値で補う
    if "notifications" not in cfg:
        cfg["notifications"] = dict(DEFAULT_NOTIFICATIONS)
        save_email_config(cfg)
    return cfg


def save_email_config(cfg: dict) -> None:
    _email_store.write("config", cfg)
