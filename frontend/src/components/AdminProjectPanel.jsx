import { useEffect, useState } from 'react';
import Button from './ui/Button.jsx';
import Input from './ui/Input.jsx';
import { api } from '../api.js';

const PROVIDER_LABELS = {
  local: 'ローカルストレージ',
  aws: 'AWS S3',
  gdrive: 'Google ドライブ',
  spo: 'SharePoint Online',
  box: 'Box',
};

export default function AdminProjectPanel({ projectId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [deleting, setDeleting] = useState(false);

  const refresh = async () => {
    const data = await api.adminGetProject(projectId);
    setDetail(data);
    setNameDraft(data.name);
  };

  useEffect(() => { refresh(); }, [projectId]);

  const run = async (fn) => {
    try {
      setError('');
      await fn();
      await refresh();
      onChanged?.();
    } catch (e) {
      setError(e.message || '操作に失敗しました');
    }
  };

  const saveRename = async () => {
    const name = nameDraft.trim();
    if (!name || name === detail.name) { setRenaming(false); return; }
    await run(() => api.adminRenameProject(projectId, name));
    setRenaming(false);
  };

  const handleDelete = async () => {
    const providerLabel = PROVIDER_LABELS[detail.storageProvider] || detail.storageProvider;
    const warning = detail.storageProvider === 'local'
      ? `「${detail.name}」を完全に削除しますか？\n記事・フォルダ・タグ・コメントがすべて削除され、元に戻せません。`
      : `「${detail.name}」を完全に削除しますか？\n保存先が${providerLabel}のため、そちらに保存されている記事データも削除されます。元に戻せません。`;
    if (!window.confirm(warning)) return;
    setDeleting(true);
    try {
      setError('');
      await api.adminDeleteProject(projectId);
      onChanged?.();
      onClose();
    } catch (e) {
      setError(e.message || '削除に失敗しました');
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '2rem' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 720, maxWidth: '100%', maxHeight: '86vh', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <i className="bi bi-folder2-open" style={{ color: 'var(--primary-dark)' }} />
          {detail && renaming ? (
            <div style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Input value={nameDraft} onChange={setNameDraft} height={34} style={{ flex: 1 }} />
              <Button variant="primary" size="sm" onClick={saveRename}>保存</Button>
              <Button variant="ghost" size="sm" onClick={() => { setRenaming(false); setNameDraft(detail.name); }}>取消</Button>
            </div>
          ) : (
            <div style={{ flex: 1, minWidth: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={detail ? detail.name : ''}>
              {detail ? `プロジェクト管理：${detail.name}` : '読み込み中...'}
            </div>
          )}
          {detail && !renaming && (
            <Button variant="ghost" size="sm" icon="pencil" onClick={() => setRenaming(true)}>名前を変更</Button>
          )}
          {detail && (
            <Button variant="ghost" size="sm" icon="trash" disabled={deleting} onClick={handleDelete} style={{ color: 'var(--danger)' }}>
              {deleting ? '削除中...' : 'プロジェクトを削除'}
            </Button>
          )}
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-muted)', padding: '0.3rem' }}><i className="bi bi-x-lg" /></div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem' }}>
          {!detail && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>読み込み中...</div>}
          {error && (
            <div style={{ fontSize: '0.8rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.5rem 0.7rem', marginBottom: '1rem' }}>{error}</div>
          )}
          {detail && <AdminProjectPanelBody detail={detail} projectId={projectId} run={run} />}
        </div>
      </div>
    </div>
  );
}

function AdminProjectPanelBody({ detail, projectId, run }) {
  const ownerCount = detail.members.filter((m) => m.role === 'owner' && m.status === 'approved').length;
  const pending = detail.members.filter((m) => m.status === 'pending');
  const approved = detail.members.filter((m) => m.status === 'approved');

  return (
    <>
      {pending.length > 0 && (
        <div style={{ marginBottom: '1.4rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>承認待ちの申請</div>
          {pending.map((m) => (
            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{m.displayName}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.email}</div>
              </div>
              <Button variant="primary" size="sm" icon="check2" onClick={() => run(() => api.adminApproveMember(projectId, m.userId))}>承認</Button>
              <Button variant="ghost" size="sm" icon="x-lg" onClick={() => run(() => api.adminRejectMember(projectId, m.userId))}>却下</Button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '1.4rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>メンバー（{approved.length}）</div>
        {approved.map((m) => {
          const isLastOwner = m.role === 'owner' && ownerCount <= 1;
          return (
            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {m.displayName}
                  {m.role === 'owner' && <span style={{ marginLeft: '0.5rem', fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)' }}>オーナー</span>}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.email}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                {m.role === 'member' && (
                  <Button variant="ghost" size="sm" icon="arrow-up-circle" onClick={() => run(() => api.adminPromoteMember(projectId, m.userId))}>オーナーにする</Button>
                )}
                {m.role === 'owner' && !isLastOwner && (
                  <Button variant="ghost" size="sm" icon="arrow-down-circle" onClick={() => run(() => api.adminDemoteMember(projectId, m.userId))}>メンバーにする</Button>
                )}
                {!isLastOwner && (
                  <Button variant="ghost" size="sm" icon="person-x" onClick={() => run(() => api.adminRemoveMember(projectId, m.userId))}>削除</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>記事（{detail.articles.length}）</div>
        {detail.articles.length === 0 && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>記事はまだありません</div>
        )}
        {detail.articles.map((a) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.updated} 更新</div>
            </div>
            <select
              className="kv-input"
              style={{ height: 32, fontSize: '0.78rem', width: 160, flexShrink: 0 }}
              value={a.folder || ''}
              onChange={(e) => run(() => api.adminMoveArticle(projectId, a.id, e.target.value || null))}
            >
              <option value="">フォルダなし</option>
              {detail.folders.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
            <Button
              variant="ghost" size="sm" icon="trash"
              onClick={() => { if (window.confirm(`「${a.title}」を削除しますか？`)) run(() => api.adminDeleteArticle(projectId, a.id)); }}
            >
              削除
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
