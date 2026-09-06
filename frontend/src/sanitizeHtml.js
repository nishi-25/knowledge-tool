import DOMPurify from 'dompurify';

const ALLOWED_IFRAME_HOSTS = ['www.youtube.com', 'player.vimeo.com'];

let hooked = false;
function ensureHooked() {
  if (hooked) return;
  // DOMPurifyはデフォルトでiframeを許可しないため個別に許可した上で、
  // 埋め込み動画（YouTube / Vimeo）以外のiframeは除去する。
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName !== 'iframe') return;
    let host = '';
    try {
      host = new URL(node.getAttribute('src') || '', window.location.href).hostname;
    } catch {
      host = '';
    }
    if (!ALLOWED_IFRAME_HOSTS.includes(host)) {
      node.remove();
    }
  });
  hooked = true;
}

// 記事本文（サーバーに保存されたHTML、または他ユーザー由来のHTML）を安全に描画するためのサニタイズ。
// テーブル・注意書き・Mermaid図解（SVG）・画像/動画はそのまま許可しつつ、
// script・イベントハンドラ属性・javascript:リンク・許可外のiframeを除去する。
export function sanitizeArticleHtml(html) {
  ensureHooked();
  return DOMPurify.sanitize(html || '', {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allowfullscreen', 'frameborder', 'target'],
  });
}
