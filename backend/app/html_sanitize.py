"""記事本文（bodyHtml）のサーバー側サニタイズ。

フロントエンド側（DOMPurify）を経由しない直接のAPI呼び出しでも、保存される
HTMLから危険な要素・属性を確実に除去するための防御多層化（defense in depth）。
テーブル・Mermaid図解（SVG）・埋め込み動画などの正規機能を壊さないよう、
「危険なものだけを取り除く」deny-list方式を採る（許可リスト方式ではない）。
"""
import re
from html.parser import HTMLParser

# タグごと（内容含む）完全に除去する要素
_DROP_ENTIRELY = {"script", "style", "object", "embed", "base", "meta", "link", "form"}

# src属性を許可ドメインに限定するタグ（それ以外は要素ごと除去）
_ALLOWED_IFRAME_SRC_PREFIXES = (
    "https://www.youtube.com/embed/",
    "https://player.vimeo.com/video/",
)

# URLを持つ属性のうち、javascript: 等の実行可能スキームを拒否する対象
_URL_ATTRS = {"href", "src", "action", "formaction", "xlink:href"}

_VOID_ELEMENTS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}


def _is_dangerous_scheme(value: str) -> bool:
    # 制御文字や空白を使った難読化（"java\tscript:"等）にも対応する
    cleaned = re.sub(r"[\x00-\x20]+", "", value or "").lower()
    return cleaned.startswith("javascript:") or cleaned.startswith("vbscript:")


class _Sanitizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out = []
        self.drop_stack = []  # 現在「内容ごと除去中」のタグ名スタック

    def _in_dropped(self) -> bool:
        return len(self.drop_stack) > 0

    def _clean_attrs(self, tag, attrs):
        cleaned = []
        for name, value in attrs:
            lname = (name or "").lower()
            if lname.startswith("on"):
                continue
            if lname in _URL_ATTRS and _is_dangerous_scheme(value or ""):
                continue
            cleaned.append((name, value))
        return cleaned

    def _render_start(self, tag, attrs, self_closing):
        parts = [f"<{tag}"]
        for name, value in attrs:
            if value is None:
                parts.append(f" {name}")
            else:
                escaped = value.replace("&", "&amp;").replace('"', "&quot;")
                parts.append(f' {name}="{escaped}"')
        parts.append(" />" if self_closing else ">")
        self.out.append("".join(parts))

    def handle_starttag(self, tag, attrs):
        self._handle_open(tag, attrs, self_closing=False)

    def handle_startendtag(self, tag, attrs):
        self._handle_open(tag, attrs, self_closing=True)

    def _handle_open(self, tag, attrs, self_closing):
        ltag = tag.lower()
        if self._in_dropped():
            if ltag in _DROP_ENTIRELY and not self_closing:
                self.drop_stack.append(ltag)
            return

        if ltag in _DROP_ENTIRELY:
            if not self_closing:
                self.drop_stack.append(ltag)
            return

        if ltag == "iframe":
            src = next((v for n, v in attrs if n.lower() == "src"), "") or ""
            if not any(src.startswith(p) for p in _ALLOWED_IFRAME_SRC_PREFIXES):
                if not self_closing:
                    self.drop_stack.append(ltag)
                return

        cleaned = self._clean_attrs(ltag, attrs)
        is_void = ltag in _VOID_ELEMENTS
        self._render_start(ltag, cleaned, self_closing or is_void)

    def handle_endtag(self, tag):
        ltag = tag.lower()
        if self.drop_stack:
            if self.drop_stack[-1] == ltag:
                self.drop_stack.pop()
            return
        if ltag in _VOID_ELEMENTS:
            return
        self.out.append(f"</{ltag}>")

    def handle_data(self, data):
        if not self._in_dropped():
            self.out.append(data)

    def handle_entityref(self, name):
        if not self._in_dropped():
            self.out.append(f"&{name};")

    def handle_charref(self, name):
        if not self._in_dropped():
            self.out.append(f"&#{name};")

    def handle_comment(self, data):
        pass  # コメントは出力しない（実害はないが最小化のため）

    def get_output(self) -> str:
        return "".join(self.out)


def sanitize_body_html(html: str) -> str:
    if not html:
        return html or ""
    parser = _Sanitizer()
    try:
        parser.feed(html)
        parser.close()
    except Exception:
        # パース不能な入力は安全側に倒して空文字にする
        return ""
    return parser.get_output()
