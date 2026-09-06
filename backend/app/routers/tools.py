import asyncio

from fastapi import APIRouter, Depends

from ..schemas import OrganizeIn
from ..store import split_keywords
from ..auth import get_current_user

router = APIRouter(prefix="/api/tools", tags=["tools"])

OCR_DUMMY_TEXT = (
    "（OCR抽出）手書きメモより：会議の要点は3点。仕様確認、担当割り振り、次回レビュー日程の3つ。"
)


@router.post("/ocr")
async def run_ocr(user: dict = Depends(get_current_user)):
    # ダミーのOCR処理。実装時は実OCR API（Cloud Vision / Textract など）に置き換える。
    await asyncio.sleep(1.2)
    return {"text": OCR_DUMMY_TEXT}


@router.post("/organize")
def run_organize(payload: OrganizeIn, user: dict = Depends(get_current_user)):
    # ダミーのキーワード整理。実装時はLLM連携などに置き換える。
    words = split_keywords(payload.keywords)[:5]
    return {
        "tags": words,
        "outline": [f"{w} について" for w in words],
    }
