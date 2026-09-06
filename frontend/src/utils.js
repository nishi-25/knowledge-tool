export const FOLDER_ICONS_FALLBACK = { icon: 'bi bi-folder2', color: '#64748b', tint: '#f1f5f9' };
export const NO_FOLDER_META = { id: null, label: 'フォルダなし', icon: 'bi bi-folder', color: '#94a3b8', tint: '#f1f5f9' };

export function calloutMeta(variant) {
  const M = {
    info: { label: '情報', icon: 'bi bi-info-circle-fill', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
    caution: { label: '注意', icon: 'bi bi-exclamation-circle-fill', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    warning: { label: '警告', icon: 'bi bi-exclamation-triangle-fill', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    tip: { label: 'ヒント', icon: 'bi bi-lightbulb-fill', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
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

export function stripHtml(html) {
  return (html || '')
    .replace(/<(p|div|br|li)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
