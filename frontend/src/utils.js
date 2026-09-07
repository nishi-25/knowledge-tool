export const FOLDER_ICONS_FALLBACK = { icon: 'bi bi-folder2', color: '#64748b', tint: '#f1f5f9' };
export const NO_FOLDER_META = { id: null, label: 'フォルダなし', icon: 'bi bi-folder', color: '#94a3b8', tint: '#f1f5f9' };

export function calloutMeta(variant) {
  const M = {
    info: { label: '情報', icon: 'bi bi-info-circle-fill', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd', description: '補足情報を伝えたいときの青い吹き出し' },
    caution: { label: '注意', icon: 'bi bi-exclamation-circle-fill', color: '#b45309', bg: '#fffbeb', border: '#fde68a', description: '気をつけてほしい点を伝える黄色い吹き出し' },
    warning: { label: '警告', icon: 'bi bi-exclamation-triangle-fill', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', description: '重大なリスクを強調する赤い吹き出し' },
    tip: { label: 'ヒント', icon: 'bi bi-lightbulb-fill', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', description: 'おすすめの使い方を伝える緑の吹き出し' },
  };
  return M[variant] || M.info;
}

export function shapeRadius(shape) {
  return shape === 'circle' ? '50%' : '10px';
}

export function fmtDate(iso) {
  const [, m, d] = iso.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

export function folderMeta(folders, id) {
  if (!id) return NO_FOLDER_META;
  return folders.find((f) => f.id === id) || NO_FOLDER_META;
}

export function calloutVariants() {
  return [
    { variant: 'info', ...calloutMeta('info') },
    { variant: 'caution', ...calloutMeta('caution') },
    { variant: 'warning', ...calloutMeta('warning') },
    { variant: 'tip', ...calloutMeta('tip') },
  ];
}

export function escapeHtmlAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// href/src用: javascript: 等の実行可能スキームを拒否し、http(s)・data・相対URLのみ許可する。
export function isSafeUrl(url) {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) return false;
  if (/^(https?:|data:)/i.test(trimmed)) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(trimmed);
}

export function stripHtml(html) {
  return (html || '')
    .replace(/<(p|div|br|li)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch {
        reject(new Error('JSONファイルの形式が正しくありません'));
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsText(file);
  });
}
