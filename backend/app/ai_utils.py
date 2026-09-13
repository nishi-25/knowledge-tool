"""AI設定（プロジェクトごとのプロバイダー・APIキー）を使う機能のための薄いラッパー。
OCR・整理機能は、呼び出し側（tools.py）でプロジェクトのAI設定が有効かを
確認してから、ここの関数を呼ぶこと。ここではキーの有効性チェックはしない。

対応プロバイダー:
- claude: Anthropic Messages API
- openai: OpenAI Chat Completions API
- local: OpenAI互換のChat Completions APIを提供するローカルサーバー（Ollama等）
"""
import json

import requests

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
OPENAI_API_URL = "https://api.openai.com/v1"
DEFAULT_LOCAL_BASE_URL = "http://localhost:11434/v1"

DEFAULT_MODELS = {
    "claude": "claude-sonnet-5",
    "openai": "gpt-4o-mini",
    "local": "llama3.2",
}


class AiError(Exception):
    pass


def _resolve_model(provider: str, model: str) -> str:
    return model.strip() if model and model.strip() else DEFAULT_MODELS.get(provider, DEFAULT_MODELS["claude"])


def _call_anthropic(api_key: str, model: str, blocks: list, max_tokens: int) -> str:
    if not api_key:
        raise AiError("APIキーを入力してください")
    content = []
    for b in blocks:
        if b["type"] == "text":
            content.append({"type": "text", "text": b["text"]})
        else:
            content.append({"type": "image", "source": {"type": "base64", "media_type": b["mediaType"], "data": b["data"]}})
    try:
        res = requests.post(
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": api_key,
                "anthropic-version": ANTHROPIC_VERSION,
                "content-type": "application/json",
            },
            json={"model": model, "max_tokens": max_tokens, "messages": [{"role": "user", "content": content}]},
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


def _call_openai_compatible(base_url: str, api_key: str, model: str, blocks: list, max_tokens: int) -> str:
    content = []
    for b in blocks:
        if b["type"] == "text":
            content.append({"type": "text", "text": b["text"]})
        else:
            content.append({"type": "image_url", "image_url": {"url": f"data:{b['mediaType']};base64,{b['data']}"}})
    headers = {"content-type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    url = base_url.rstrip("/") + "/chat/completions"
    try:
        res = requests.post(
            url,
            headers=headers,
            json={"model": model, "max_tokens": max_tokens, "messages": [{"role": "user", "content": content}]},
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
    choices = data.get("choices", [])
    text = choices[0].get("message", {}).get("content", "") if choices else ""
    if not text:
        raise AiError("AIサービスから有効な応答が得られませんでした")
    return text


def _dispatch(provider: str, api_key: str, base_url: str, model: str, blocks: list, max_tokens: int) -> str:
    resolved_model = _resolve_model(provider, model)
    if provider == "openai":
        if not api_key:
            raise AiError("APIキーを入力してください")
        return _call_openai_compatible(OPENAI_API_URL, api_key, resolved_model, blocks, max_tokens)
    if provider == "local":
        url = base_url.strip() or DEFAULT_LOCAL_BASE_URL
        return _call_openai_compatible(url, api_key, resolved_model, blocks, max_tokens)
    return _call_anthropic(api_key, resolved_model, blocks, max_tokens)


def test_ai_connection(provider: str, api_key: str, base_url: str, model: str) -> tuple[bool, str]:
    provider = provider or "claude"
    try:
        text = _dispatch(
            provider, api_key, base_url, model,
            [{"type": "text", "text": "接続テストです。「OK」とだけ返答してください。"}],
            max_tokens=16,
        )
        return True, f"接続に成功しました（応答: {text.strip()[:50]}）"
    except AiError as e:
        return False, str(e)


def ocr_image(provider: str, api_key: str, base_url: str, model: str, image_base64: str, media_type: str) -> str:
    blocks = [
        {"type": "text", "text": "この画像に写っている文字をすべて書き起こしてください。文字起こし結果のみを出力し、説明や前置きは不要です。"},
        {"type": "image", "mediaType": media_type, "data": image_base64},
    ]
    text = _dispatch(provider, api_key, base_url, model, blocks, max_tokens=2048)
    text = text.strip()
    if not text:
        raise AiError("文字を読み取れませんでした")
    return text


def suggest_organization(provider: str, api_key: str, base_url: str, model: str, keywords: str) -> dict:
    prompt = (
        "以下のキーワード・メモから、ナレッジ記事に付けるべきタグ案（3〜5個、日本語の単語または短いフレーズ）と、"
        "本文の見出し構成案（3〜5項目）を考えてください。\n"
        "出力は必ず次のJSON形式のみとし、前後に説明文やコードブロックの記号を含めないでください: "
        '{"tags": ["タグ1", "タグ2"], "outline": ["見出し1", "見出し2"]}\n\n'
        f"キーワード・メモ: {keywords}"
    )
    text = _dispatch(provider, api_key, base_url, model, [{"type": "text", "text": prompt}], max_tokens=512).strip()
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
