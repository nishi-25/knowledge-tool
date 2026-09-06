"""デスクトップ版に同梱するバックエンドのエントリポイント。
PyInstallerでこのファイルを単一実行ファイルに固め、Electronのメインプロセスから
サブプロセスとして起動する。KV_MODE=desktop 前提（ログイン不要の固定ローカルユーザー）。
"""
import os
import sys

# ローカル実行時（未フリーズ）に backend/app パッケージを解決できるようにする。
# PyInstallerでフリーズする際は --paths ../backend を指定して同じ解決を行う。
_BACKEND_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))
sys.path.insert(0, _BACKEND_DIR)

import uvicorn  # noqa: E402
from app.main import app  # noqa: E402

if __name__ == "__main__":
    port = int(os.environ.get("KV_PORT", "8765"))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
