from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import project, folders, tags, articles, tools, comments, system, fs, auth, invites, admin, ping, support
from .store import ensure_seeded
from .admin_store import print_setup_token_if_needed
from .config import APP_MODE

app = FastAPI(title="Knowledge View API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.get("/api/health")
def health():
    return {"status": "ok"}
