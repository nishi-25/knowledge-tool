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


def enforce_rate_limit(request: Request, key: str, max_attempts: int = 10, window_seconds: int = 60) -> None:
    ip = request.client.host if request.client else "unknown"
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
