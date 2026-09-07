# Knowledge View

チームのナレッジを1画面で作成・検索・整理できるセルフホスト型ナレッジ管理ツール。

**製品紹介・デスクトップ版ダウンロード:** <https://nishi-25.github.io/knowledge-tool/>  
**取り扱い説明書:** <https://nishi-25.github.io/knowledge-tool/manual.html>

## 構成

- `frontend/` — React (Vite) 製のSPA。
- `backend/` — FastAPI製のAPIサーバー。記事・フォルダ・タグ・プロジェクト・認証・管理者機能を管理。
- `desktop/` — Electron製のデスクトップアプリ（Windows / Mac / Linux）。ログイン不要のローカル動作で、`backend/` をPyInstallerで固めた実行ファイルを同梱・起動する。
- `docs/` — GitHub Pagesで公開する製品紹介ページ。
- 保存先はアダプターパターン（`backend/app/storage/base.py`）で抽象化。ローカルファイルのほか、AWS S3 / Google ドライブ / SharePoint Online / Box に対応。

## 主な機能

- 見出し・テーブル・注意書き・画像・動画・Mermaid図解（フローチャート／シーケンス図／状態遷移図／ER図など）に対応したリッチな本文エディタ。
- 複数プロジェクト（ワークスペース）管理。プロジェクトごとに記事・フォルダ・タグは完全に分離。
- ログイン、招待URLによる承認制のメンバー管理、複数オーナーによる共同管理。
- サーバー版向けの管理者パネル（`/admin`）：初回起動時にアカウントを設定し、以降は全プロジェクトを横断してユーザー承認・削除、記事の移動・削除、ログイン機能の有効/無効切り替えができる。
- デスクトップ版はログイン不要で単体動作。設定画面から任意でチームのサーバーに接続テスト→ログインし、そのサーバー上のプロジェクトを利用できる。

## 起動方法（Docker、サーバー版）

```bash
docker compose up --build
```

起動後、ブラウザで http://localhost:8080 を開く。ポート番号を変更したい場合は `KV_WEB_PORT` を指定する（`.env.example` を `.env` にコピーして設定するか、コマンド実行時に指定する）。

```bash
KV_WEB_PORT=9090 docker compose up --build
```

- 初回はアカウント作成後、プロジェクトの作成／参加申請を行うセットアップ画面が表示されます。
- 複数のプロジェクト（ワークスペース）を作成でき、それぞれ記事・フォルダ・タグは完全に分離されます。「設定」画面からいつでも切り替え可能です。
- データは既定では `backend/data/` にJSONファイルとして永続化されます（bind mount）。
- `/admin` を開くと管理者アカウントの初期設定画面が表示されます。`docker compose logs backend` に出力される初期設定トークンを入力し、ユーザー名・パスワードを決めてください（トークンは自動生成されるため、事前に何か設定しておく必要はありません）。一度設定すると以降は通常のログイン画面になります。

### Windows の D ドライブなど、実際のフォルダを保存先に選ぶ

プロジェクト作成時に保存先で「ローカルストレージ」を選ぶと、アプリが実行環境を自動判定し、選べる保存先を出し分けます。

- WSL2 上の Ubuntu から Docker を使っている場合（本アプリの想定環境）は、Windows の各ドライブ（C:, D: など）が WSL 側の `/mnt` に自動マウントされていることを検知し、「フォルダを参照...」ボタンからその場でドライブ内のフォルダをブラウズ・新規作成・選択できます。**コンテナの再起動は不要です。**
- それ以外の環境（外部マウントが見つからない場合）では、「ローカル（アプリ標準フォルダ）」のみが表示されます。

この自動検出・ブラウズ機能は `docker-compose.yml` が `/mnt`（WSLのドライブ自動マウント先）をコンテナの `/host_mnt` にマウントすることで実現しています。別の場所を参照させたい場合のみ `.env` で `KV_BROWSE_HOST_PATH` を指定してください（`.env.example` 参照）。

## 開発時（Dockerなし、サーバー版）

```bash
# backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend（別ターミナル）
cd frontend
npm install
npm run dev
```

`frontend` の Vite dev server は `/api` を `http://localhost:8000` にプロキシします。

## デスクトップ版のビルド

[GitHub Releases](https://github.com/nishi-25/knowledge-tool/releases) から配布物をダウンロードするのが基本ですが、ローカルでビルドする場合：

```bash
# 1. バックエンドを単一実行ファイルに固める
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt pyinstaller
cd desktop
pyinstaller knowledge-view-backend.spec   # desktop/dist/knowledge-view-backend(.exe) が生成される

# 2. フロントエンドをビルド（デスクトップ版はアセットパスを相対パスにする必要がある）
cd ../frontend
npm install
KV_BUILD_TARGET=desktop npm run build

# 3. Electronアプリをパッケージング
cd ../desktop
npm install
npm run dist
```

`v*` タグをpushすると、GitHub Actions（`.github/workflows/release.yml`）がWindows/Mac/Linuxの3プラットフォームでビルドし、そのタグのGitHub Releaseにインストーラを自動添付します。

## バージョニング

`VERSION` ファイルと `backend/app/config.py` の `APP_VERSION` を単一の情報源とする。リリース時は両方を更新し、`CHANGELOG.md` にエントリを追加してから `git tag v<version>` する。

## ライセンス

[MIT License](LICENSE) のもとで公開しているフリーソフトウェアです。ソースコードの閲覧・改変・再配布は自由に行っていただけます。

本プロジェクトは個人が趣味の範囲で開発・保守しているものであり、商用のサポートや動作の保証は提供していません。本ソフトウェアの利用によって生じたいかなる損害についても作者は責任を負いません。自己責任でご利用ください。
