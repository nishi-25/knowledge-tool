import { useEffect, useState } from 'react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import { api } from '../api.js';

export default function AdminProjectPanel({ projectId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  const refresh = async () => {
    const data = await api.adminGetProject(projectId);
    setDetail(data);
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

  if (!detail) {
    return (
      <Card title="読み込み中..." icon="hourglass-split" style={{ marginTop: '1.2rem' }} />
    );
  }

  const ownerCount = detail.members.filter((m) => m.role === 'owner' && m.status === 'approved').length;
  const pending = detail.members.filter((m) => m.status === 'pending');
  const approved = detail.members.filter((m) => m.status === 'approved');

  return (
    <Card title={`プロジェクト管理：${detail.name}`} icon="folder2-open" style={{ marginTop: '1.2rem' }}>
      <Button variant="ghost" size="sm" icon="x-lg" onClick={onClose} style={{ marginBottom: '1rem' }}>閉じる</Button>

      {error && (
        <div style={{ fontSize: '0.8rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.5rem 0.7rem', marginBottom: '1rem' }}>{error}</div>
      )}

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
    </Card>
  );
}
