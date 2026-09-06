from fastapi import APIRouter

from ..config import APP_MODE, APP_VERSION

router = APIRouter(tags=["ping"])


@router.get("/api/ping")
def ping():
    """認証不要のシグネチャ応答。デスクトップ版の「サーバーと連携」接続テストが、
    相手が本物のKnowledge Viewサーバーかどうかを判定するために使う。"""
    return {"app": "knowledge-view", "version": APP_VERSION, "mode": APP_MODE}
