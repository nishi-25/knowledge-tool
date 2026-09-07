"""ログイン・サインアップ系エンドポイント向けの簡易レート制限。

自己ホスト型の単一プロセスデプロイを前提としたインメモリ実装（Redis等は使わない）。
IPアドレス単位・エンドポイント単位のスライディングウィンドウでブルートフォース・
アカウント作成の連打を抑止する。
"""
import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request

_attempts: dict[str, list[float]] = defaultdict(list)
_lock = Lock()


def _client_ip(request: Request) -> str:
    # nginxリバースプロキシ経由の場合、request.client.hostはnginx自身のIPになってしまい、
    # 全ユーザーが同じバケットを共有して誤ってブロックし合う。X-Real-IP/X-Forwarded-Forを
    # 優先的に見て、実際のクライアントIPで制限する。
    forwarded = request.headers.get("x-real-ip") or request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce_rate_limit(
    request: Request, key: str, max_attempts: int = 10, window_seconds: int = 60, identity: str | None = None,
) -> None:
    # identityを指定すると、IPアドレスではなくその値（APIキーのハッシュ等）で
    # バケットを分ける。共有インフラ（同一IPから複数の正規利用者が呼ぶ場合等）でも
    # 公平に制限したい場合に使う。
    ip = identity or _client_ip(request)
    bucket_key = f"{key}:{ip}"
    now = time.monotonic()
    with _lock:
        attempts = _attempts[bucket_key]
        cutoff = now - window_seconds
        while attempts and attempts[0] < cutoff:
            attempts.pop(0)
        if len(attempts) >= max_attempts:
            raise HTTPException(status_code=429, detail="試行回数が多すぎます。しばらくしてから再度お試しください")
        attempts.append(now)
