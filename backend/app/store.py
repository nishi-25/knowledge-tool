import hashlib
import re

from .config import DATA_DIR, LOCAL_ROOT
from .storage.local_file import LocalFileStorage
from .storage_factory import build_adapter

projects_index_store = LocalFileStorage(DATA_DIR / "projects_index")

_TAG_RE = re.compile(r"[\s,、]+")
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_HTML_BLOCK_RE = re.compile(r"<(p|div|br|li|tr|table|h1|h2|h3)[^>]*>", re.IGNORECASE)
_HTML_NOTEXT_RE = re.compile(r"<(style|script)[^>]*>.*?</\1>", re.IGNORECASE | re.DOTALL)
_WS_RE = re.compile(r"\s+")


def strip_html(html: str) -> str:
    text = _HTML_NOTEXT_RE.sub(" ", html or "")
    text = _HTML_BLOCK_RE.sub(" ", text)
    text = _HTML_TAG_RE.sub("", text)
    return _WS_RE.sub(" ", text).strip()


def split_keywords(raw: str) -> list[str]:
    return [w for w in _TAG_RE.split(raw.strip()) if w]


def slugify(label: str, existing_ids: set[str]) -> str:
    base = re.sub(r"[^a-zA-Z0-9]+", "-", label.strip().lower()).strip("-")
    if not base:
        # ラベルがASCII文字を含まない場合（日本語名など）はハッシュ値で一意なIDを生成する
        base = "item-" + hashlib.md5(label.encode("utf-8")).hexdigest()[:8]
    slug = base
    n = 2
    while slug in existing_ids:
        slug = f"{base}-{n}"
        n += 1
    return slug


def ensure_seeded() -> None:
    # プロジェクトは何も自動生成しない。ユーザーがセットアップウィザードで作成する。
    (LOCAL_ROOT / "projects").mkdir(parents=True, exist_ok=True)


def _project_storage_config(project_id: str) -> dict:
    project = projects_index_store.read(project_id) or {}
    return {**project, "provider": project.get("storageProvider", "local")}


def get_articles_store(project_id: str):
    return build_adapter(_project_storage_config(project_id), project_id, "articles")


def get_folders_store(project_id: str):
    return build_adapter(_project_storage_config(project_id), project_id, "folders")


def get_tags_store(project_id: str):
    return build_adapter(_project_storage_config(project_id), project_id, "tags")


def get_comments_store(project_id: str):
    return build_adapter(_project_storage_config(project_id), project_id, "comments")


def next_article_id(articles_store) -> int:
    ids = [int(a["id"]) for a in articles_store.list()] or [0]
    return max(ids) + 1
