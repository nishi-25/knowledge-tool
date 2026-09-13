import base64

from fastapi import APIRouter, Depends, HTTPException

from ..schemas import OrganizeIn, OcrIn
from ..auth import get_current_user
from ..membership import resolve_current_project
from ..ai_utils import ocr_image, suggest_organization, AiError

router = APIRouter(prefix="/api/tools", tags=["tools"])

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def _require_ai_key(project: dict) -> str:
    api_key = project.get("aiApiKey", "")
    if not project.get("aiEnabled") or not api_key:
        raise HTTPException(
            status_code=400,
            detail="AI機能が設定されていません。設定画面の「AI設定」でAPIキーを登録し、有効にしてください",
        )
    return api_key


@router.post("/ocr")
def run_ocr(payload: OcrIn, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    api_key = _require_ai_key(project)
    if payload.mediaType not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="対応していない画像形式です")
    try:
        raw = base64.b64decode(payload.imageBase64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="画像データが不正です")
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="画像サイズが大きすぎます（10MBまで）")
    try:
        text = ocr_image(api_key, payload.imageBase64, payload.mediaType)
    except AiError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"text": text}


@router.post("/organize")
def run_organize(payload: OrganizeIn, user: dict = Depends(get_current_user)):
    project = resolve_current_project(user)
    api_key = _require_ai_key(project)
    keywords = payload.keywords.strip()
    if not keywords:
        raise HTTPException(status_code=400, detail="キーワードを入力してください")
    try:
        return suggest_organization(api_key, keywords)
    except AiError as e:
        raise HTTPException(status_code=502, detail=str(e))
