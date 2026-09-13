import { useEffect, useState } from 'react';
import Button from './ui/Button.jsx';
import { api } from '../api.js';

function fmtDateTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function RevisionHistoryModal({ open, articleId, onClose, onRestored }) {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    if (!open || !articleId) return;
    setLoading(true);
    api.listRevisions(articleId).then(setRevisions).finally(() => setLoading(false));
  }, [open, articleId]);

  if (!open) return null;

  const restore = async (revisionId) => {
    if (!window.confirm('この版に戻しますか？現在の内容は新しい版として履歴に残ります。')) return;
    setRestoringId(revisionId);
    try {
      const updated = await api.restoreRevision(articleId, revisionId);
      onRestored(updated);
      onClose();
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '2rem' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, maxWidth: '100%', maxHeight: '80vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', padding: '1.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-strong)' }}>変更履歴</div>
          <div onClick={onClose} style={{ marginLeft: 'auto', cursor: 'pointer', color: 'var(--text-muted)' }}><i className="bi bi-x-lg" /></div>
        </div>

        {loading && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem 0' }}>読み込み中...</div>}

        {!loading && revisions.length === 0 && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem 0' }}>この記事にはまだ変更履歴がありません（保存を重ねると記録されます）。</div>
        )}

        {!loading && revisions.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="kv-line-clamp-1" style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-strong)' }}>{r.title}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtDateTime(r.savedAt)} 時点の内容</div>
            </div>
            <Button variant="outline" size="sm" icon="arrow-counterclockwise" disabled={restoringId === r.id} onClick={() => restore(r.id)}>
              {restoringId === r.id ? '復元中...' : 'この版に戻す'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
