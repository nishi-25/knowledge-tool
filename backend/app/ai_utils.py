"""AI設定（プロジェクトごとのAnthropic APIキー）を使う機能のための薄いラッパー。
OCR・整理機能は、呼び出し側（tools.py）でプロジェクトのAI設定が有効かを
確認してから、ここの関数を呼ぶこと。ここではキーの有効性チェックはしない。
"""
import json

import requests

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
MODEL = "claude-sonnet-5"


class AiError(Exception):
    pass


def _call_anthropic(api_key: str, content, max_tokens: int = 1024) -> str:
    try:
        res = requests.post(
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": api_key,
                "anthropic-version": ANTHROPIC_VERSION,
                "content-type": "application/json",
            },
            json={"model": MODEL, "max_tokens": max_tokens, "messages": [{"role": "user", "content": content}]},
            timeout=60,
        )
    except requests.RequestException as e:
        raise AiError(f"AIサービスへの接続に失敗しました: {e}")
    if res.status_code == 401:
        raise AiError("APIキーが無効です")
    if not res.ok:
        detail = ""
        try:
            detail = res.json().get("error", {}).get("message", "")
        except Exception:
            pass
        raise AiError(f"AIサービスがエラーを返しました (HTTP {res.status_code}){': ' + detail if detail else ''}")
    data = res.json()
    parts = data.get("content", [])
    text = "".join(p.get("text", "") for p in parts if p.get("type") == "text")
    if not text:
        raise AiError("AIサービスから有効な応答が得られませんでした")
    return text


def test_ai_key(api_key: str) -> tuple[bool, str]:
    try:
        _call_anthropic(api_key, "OKとだけ返してください。", max_tokens=16)
        return True, "接続に成功しました"
    except AiError as e:
        return False, str(e)


def ocr_image(api_key: str, image_base64: str, media_type: str) -> str:
    content = [
        {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_base64}},
        {"type": "text", "text": "この画像に写っている文字をすべて書き起こしてください。文字起こし結果のみを出力し、説明や前置きは不要です。"},
    ]
    return _call_anthropic(api_key, content, max_tokens=2048).strip()


def suggest_organization(api_key: str, keywords: str) -> dict:
    prompt = (
        "以下のキーワード・メモから、ナレッジ記事に付けるべきタグ案（3〜5個、日本語の単語または短いフレーズ）と、"
        "本文の見出し構成案（3〜5項目）を考えてください。\n"
        "出力は必ず次のJSON形式のみとし、前後に説明文やコードブロックの記号を含めないでください: "
        '{"tags": ["タグ1", "タグ2"], "outline": ["見出し1", "見出し2"]}\n\n'
        f"キーワード・メモ: {keywords}"
    )
    text = _call_anthropic(api_key, prompt, max_tokens=512).strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text.split("\n", 1)[1] if "\n" in text else text
    try:
        data = json.loads(text)
        tags = [str(t) for t in data.get("tags", [])][:5]
        outline = [str(o) for o in data.get("outline", [])][:5]
        return {"tags": tags, "outline": outline}
    except (json.JSONDecodeError, AttributeError):
        raise AiError("AIの応答を解析できませんでした")
