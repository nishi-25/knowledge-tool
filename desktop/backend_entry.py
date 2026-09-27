"""デスクトップ版に同梱するバックエンドのエントリポイント。
PyInstallerでこのファイルを単一実行ファイルに固め、Electronのメインプロセスから
サブプロセスとして起動する。KV_MODE=desktop 前提（ログイン不要の固定ローカルユーザー）。
"""
import os
import sys

# Windows向けにconsole=False（非コンソール/windowedサブシステム）でビルドすると、
# アタッチ先のコンソールが存在しないため sys.stdout/sys.stderr が None になる。
# uvicornのデフォルトログ設定は起動時に sys.stderr.isatty() を呼ぶため、None のままだと
# "AttributeError: 'NoneType' object has no attribute 'isatty'" で起動に失敗する。
# ログを破棄先（devnull）のファイルオブジェクトに差し替えて回避する。
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")
if sys.stdin is None:
    sys.stdin = open(os.devnull, "r")

# ローカル実行時（未フリーズ）に backend/app パッケージを解決できるようにする。
# PyInstallerでフリーズする際は --paths ../backend を指定して同じ解決を行う。
_BACKEND_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))
sys.path.insert(0, _BACKEND_DIR)

import hmac  # noqa: E402

import uvicorn  # noqa: E402
from fastapi import Header, HTTPException  # noqa: E402
from app.main import app  # noqa: E402

if __name__ == "__main__":
    port = int(os.environ.get("KV_PORT", "8765"))
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning"))

    # Electron終了時にプロセスを強制終了すると、保存処理の途中でファイル書き込みが
    # 途切れる恐れがある（特にWindowsはシグナルでの穏当な終了手段がない）。
    # 起動ごとにElectronが生成するトークンを知っている呼び出し元だけが、
    # 処理中のリクエストを完了させてから停止する「穏当な終了」を要求できる。
    shutdown_token = os.environ.get("KV_SHUTDOWN_TOKEN", "")
    if shutdown_token:
        @app.post("/api/desktop/shutdown", include_in_schema=False)
        def request_shutdown(x_kv_shutdown_token: str = Header(default="")):
            if not hmac.compare_digest(x_kv_shutdown_token, shutdown_token):
                raise HTTPException(status_code=403)
            server.should_exit = True
            return {"ok": True}

    server.run()
