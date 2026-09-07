import smtplib
from email.mime.text import MIMEText

from .email_settings import get_email_config


class EmailDisabledError(Exception):
    pass


class EmailNotConfiguredError(Exception):
    pass


def _send_via_smtp(cfg: dict, to_email: str, subject: str, body: str) -> None:
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    from_name = cfg.get("fromName") or "Knowledge View"
    msg["From"] = f'{from_name} <{cfg["fromAddress"]}>'
    msg["To"] = to_email
    with smtplib.SMTP(cfg["smtpHost"], int(cfg["smtpPort"]), timeout=10) as server:
        if cfg.get("useTls"):
            server.starttls()
        if cfg.get("smtpUsername"):
            server.login(cfg["smtpUsername"], cfg.get("smtpPassword") or "")
        server.sendmail(cfg["fromAddress"], [to_email], msg.as_string())


def send_email(to_email: str, subject: str, body: str) -> None:
    """アプリからのメール送信。メール機能が無効の場合は何もしない（呼び出し元の処理は継続させる）。"""
    cfg = get_email_config()
    if not cfg.get("enabled"):
        raise EmailDisabledError("メール送信機能は無効になっています")
    if not cfg.get("smtpHost") or not cfg.get("fromAddress"):
        raise EmailNotConfiguredError("メール設定（送信元アドレス・SMTPサーバー）が未設定です")
    _send_via_smtp(cfg, to_email, subject, body)


def send_test_email(to_email: str) -> None:
    """管理者が設定確認のために送るテストメール。enabled=Falseでも送信できる（設定確認用）。"""
    cfg = get_email_config()
    if not cfg.get("smtpHost") or not cfg.get("fromAddress"):
        raise EmailNotConfiguredError("メール設定（送信元アドレス・SMTPサーバー）が未設定です")
    _send_via_smtp(cfg, to_email, "【Knowledge View】テストメール", "これはメール設定確認用のテストメールです。このメールが届いていれば設定は正常です。")


def try_send_notification(to_email: str, subject: str, body: str) -> None:
    """承認通知など「送れたら送る」程度の通知。失敗しても呼び出し元の処理は止めない。"""
    try:
        send_email(to_email, subject, body)
    except Exception:
        pass


def send_notification_if_enabled(notification_key: str, to_email: str, subject: str, body: str) -> None:
    """通知の種類ごとのON/OFF設定を確認したうえで送る「送れたら送る」通知。
    メール機能自体が無効、またはこの種類の通知がOFFの場合は何もしない。失敗しても呼び出し元は止めない。"""
    cfg = get_email_config()
    if not cfg.get("enabled"):
        return
    if not cfg.get("notifications", {}).get(notification_key, True):
        return
    try:
        send_email(to_email, subject, body)
    except Exception:
        pass
