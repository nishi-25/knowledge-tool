import { useEffect, useState } from 'react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import { api } from '../api.js';

export default function MembersCard({ currentUserId }) {
  const [inviteUrl, setInviteUrl] = useState(null);
  const [members, setMembers] = useState([]);
  const [pending, setPending] = useState([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    const [memberList, pendingList] = await Promise.all([api.listMembers(), api.listPendingRequests()]);
    setMembers(memberList.filter((m) => m.status === 'approved'));
    setPending(pendingList);
  };

  useEffect(() => { refresh(); }, []);

  const issueInvite = async () => {
    const { token } = await api.createInvite();
    setInviteUrl(`${window.location.origin}/invite/${token}`);
    setCopied(false);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const runAction = async (fn) => {
    try {
      setError('');
      await fn();
      await refresh();
    } catch (e) {
      setError(e.message || '操作に失敗しました');
    }
  };

  const approve = (userId) => runAction(() => api.approveRequest(userId));
  const reject = (userId) => runAction(() => api.rejectRequest(userId));
  const remove = (userId) => runAction(() => api.removeMember(userId));
  const promote = (userId) => runAction(() => api.promoteMember(userId));
  const demote = (userId) => runAction(() => api.demoteMember(userId));

  const ownerCount = members.filter((m) => m.role === 'owner').length;

  return (
    <Card title="メンバー管理" icon="people" style={{ marginTop: '1.2rem' }}>
      {error && (
        <div style={{ fontSize: '0.8rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.5rem 0.7rem', marginBottom: '1rem' }}>{error}</div>
      )}
      <div style={{ marginBottom: '1.2rem' }}>
        <Button variant="outline" size="sm" icon="link-45deg" onClick={issueInvite}>招待リンクを発行</Button>
        {inviteUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.6rem' }}>
            <input readOnly value={inviteUrl} className="kv-input" style={{ height: 36, fontSize: '0.78rem', flex: 1 }} onFocus={(e) => e.target.select()} />
            <Button variant="outline" size="sm" icon={copied ? 'check2' : 'clipboard'} onClick={copyUrl}>{copied ? 'コピー済み' : 'コピー'}</Button>
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom: '1.2rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>承認待ちの申請</div>
          {pending.map((p) => (
            <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.displayName}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.email}</div>
              </div>
              <Button variant="primary" size="sm" icon="check2" onClick={() => approve(p.userId)}>承認</Button>
              <Button variant="ghost" size="sm" icon="x-lg" onClick={() => reject(p.userId)}>却下</Button>
            </div>
          ))}
        </div>
      )}

      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>メンバー（{members.length}）</div>
        {members.map((m) => {
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
                {m.userId === currentUserId ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>自分</span>
                ) : (
                  <>
                    {m.role === 'member' && (
                      <Button variant="ghost" size="sm" icon="arrow-up-circle" onClick={() => promote(m.userId)}>オーナーにする</Button>
                    )}
                    {m.role === 'owner' && !isLastOwner && (
                      <Button variant="ghost" size="sm" icon="arrow-down-circle" onClick={() => demote(m.userId)}>メンバーにする</Button>
                    )}
                    {!isLastOwner && (
                      <Button variant="ghost" size="sm" icon="person-x" onClick={() => remove(m.userId)}>削除</Button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
