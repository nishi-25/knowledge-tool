import os
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent

# "server"（複数ユーザー・要ログイン）または "desktop"（単一ローカルユーザー・ログイン不要）。
APP_MODE = os.environ.get("KV_MODE", "server")

# アプリのバージョン。リリース時はリポジトリルートの VERSION ファイルと合わせて更新する。
APP_VERSION = "1.6.1"

# 常に使える既定のローカル保存先。
LOCAL_ROOT = Path(os.environ.get("KV_DATA_DIR_LOCAL", str(_BACKEND_DIR / "data")))

# ホスト側の実フォルダをブラウズ選択できるようにするためのマウントルート。
# WSL2上のUbuntuからDocker Desktopを使う場合、WSL側の /mnt には Windows の
# 各ドライブ（C:, D: など）が既に自動マウントされているため、これを
# コンテナにもそのままマウントすることで、コンテナ内からWindowsのドライブを
# 再起動なしでブラウズ・選択できるようになる。
BROWSE_ROOT = Path(os.environ.get("KV_BROWSE_ROOT", "/host_mnt"))

# プロジェクト一覧・現在選択中プロジェクトのポインタは、常にこのローカルルートに保存する
# （どのプロジェクトがどこにデータを置いていても、このメタ情報だけは確実に見つけられるようにするため）。
DATA_DIR = LOCAL_ROOT


def is_within_browse_root(path: Path) -> bool:
    # デスクトップ版はコンテナ境界が無く、OS純正のフォルダ選択ダイアログ自体が
    # 信頼境界になっている（Electronアプリとユーザーは同一主体）ため、
    # サーバー版のみに存在するBROWSE_ROOT配下という制約は適用しない。
    if APP_MODE == "desktop":
        return True
    try:
        path.resolve().relative_to(BROWSE_ROOT.resolve())
        return True
    except (ValueError, OSError):
        return False
