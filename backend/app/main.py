from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import project, folders, tags, articles, tools, comments, system, fs, auth, invites, admin, ping, support, data_io, apikeys, public_api
from .store import ensure_seeded
from .admin_store import print_setup_token_if_needed
from .config import APP_MODE

app = FastAPI(title="Knowledge View API")

app.add_middleware(
    CORSMiddleware,
    # サーバー版のWeb UIはnginx経由の同一オリジンでしか呼ばれないためCORSは不要。
    # クロスオリジンで呼ぶ唯一の正規のブラウザ発ホストはデスクトップ版のElectron
    # シェル（"サーバーとの連携"、"接続テストする"、内蔵バックエンドへの直接呼び出し）
    # が使う app:// スキームのみ。allow_origins=["*"] を allow_credentials=True と
    # 組み合わせると、Cookieセッションを持つ利用者が悪意あるWebサイトを開いただけで
    # そのサイトのJSからこのAPIへ資格情報付きでアクセスされ、データを読み書きされて
    # しまう（外部APIキーを使うcurl/スクリプト等はそもそもCORSの対象外なので影響なし）。
    allow_origins=["app://app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    ensure_seeded()
    if APP_MODE != "desktop":
        print_setup_token_if_needed()


app.include_router(project.router)
app.include_router(folders.router)
app.include_router(tags.router)
app.include_router(articles.router)
app.include_router(tools.router)
app.include_router(comments.router)
app.include_router(system.router)
app.include_router(fs.router)
app.include_router(auth.router)
app.include_router(invites.router)
app.include_router(admin.router)
app.include_router(ping.router)
app.include_router(support.router)
app.include_router(data_io.router)
app.include_router(apikeys.router)
app.include_router(public_api.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
