import { useEffect, useState } from 'react';
import Button from './ui/Button.jsx';
import Input from './ui/Input.jsx';
import { api } from '../api.js';

export default function FolderBrowserModal({ open, initialPath, onClose, onSelect }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState('');

  const load = async (path) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.browseFs(path);
      setData(result);
    } catch (e) {
      setError(e.message || 'フォルダを読み込めませんでした');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load(initialPath || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const createFolder = async () => {
    if (!newFolderName.trim() || !data) return;
    await api.createFsFolder(data.currentPath, newFolderName.trim());
    setNewFolderName('');
    load(data.currentPath);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: '92vw', height: 500, maxHeight: '85vh', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)' }}>保存先フォルダを選択</div>
          <div style={{ flex: 1 }} />
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}><i className="bi bi-x-lg" /></div>
        </div>

        <div style={{ padding: '0.6rem 1.1rem', borderBottom: '1px solid var(--border)', fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {data?.currentPath || ''}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {loading && <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>読み込み中...</div>}
          {!loading && error && <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>}
          {!loading && !error && (
            <>
              {data?.parentPath && (
                <div onClick={() => load(data.parentPath)} className="kv-list-row" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.7rem', borderRadius: 8, cursor: 'pointer' }}>
                  <i className="bi bi-arrow-90deg-up" style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.85rem' }}>上へ</span>
                </div>
              )}
              {data?.entries.map((entry) => (
                <div key={entry.path} onClick={() => load(entry.path)} className="kv-list-row" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.7rem', borderRadius: 8, cursor: 'pointer' }}>
                  <i className="bi bi-folder-fill" style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.85rem' }}>{entry.name}</span>
                </div>
              ))}
              {data?.entries.length === 0 && (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>サブフォルダがありません</div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: '0.7rem 1.1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <Input placeholder="新しいフォルダ名" value={newFolderName} onChange={setNewFolderName} height={36} style={{ flex: 1 }} />
          <Button variant="outline" size="sm" onClick={createFolder} style={{ height: 36 }}>作成</Button>
        </div>

        <div style={{ padding: '0.9rem 1.1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexShrink: 0 }}>
          <Button variant="ghost" onClick={onClose}>キャンセル</Button>
          <Button variant="primary" icon="check2" onClick={() => onSelect(data.currentPath)} disabled={!data}>このフォルダを選択</Button>
        </div>
      </div>
    </div>
  );
}
