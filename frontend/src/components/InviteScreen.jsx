import { useEffect, useState } from 'react';
import Button from './ui/Button.jsx';
import { api } from '../api.js';

const STATUS_LABEL = {
  none: null,
  pending: '承認待ちです。プロジェクトのオーナーが承認すると閲覧できるようになります。',
  approved: 'すでにこのプロジェクトへのアクセスが承認されています。',
  rejected: '申請が却下されました。もう一度申請することもできます。',
};

export default function InviteScreen({ token, onGoToApp }) {
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.getInvite(token)
      .then((data) => { setInvite(data); setStatus(data.status); })
      .catch((e) => setError(e.message || '招待リンクが無効です'));
  }, [token]);

  const requestAccess = async () => {
    setRequesting(true);
    try {
      const res = await api.requestInviteAccess(token);
      setStatus(res.status);
    } catch (e) {
      setError(e.message || '申請に失敗しました');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--app-bg)', padding: '2rem', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 440, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', padding: '2.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.6rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-journal-bookmark-fill" style={{ color: '#fff', fontSize: '1.1rem' }} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
            Knowledge<span style={{ background: 'var(--grad-accent)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}> View.</span>
          </div>
        </div>

        {error && <div style={{ fontSize: '0.88rem', color: 'var(--danger)' }}>{error}</div>}

        {!error && !invite && <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>読み込み中...</div>}

        {!error && invite && (
          <>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.3rem' }}>プロジェクトへの招待</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.4rem' }}>
              <strong style={{ color: 'var(--text-strong)' }}>{invite.ownerName}</strong> さんが「<strong style={{ color: 'var(--text-strong)' }}>{invite.projectName}</strong>」への参加を招待しています。
            </div>

            {status === 'approved' ? (
              <Button variant="primary" block icon="box-arrow-in-right" onClick={onGoToApp}>アプリを開く</Button>
            ) : (
              <>
                <Button variant="primary" block icon="send" disabled={requesting || status === 'pending'} onClick={requestAccess}>
                  {status === 'pending' ? '申請済み' : requesting ? '申請中...' : 'このプロジェクトへのアクセスを申請する'}
                </Button>
                {STATUS_LABEL[status] && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.8rem', lineHeight: 1.5 }}>{STATUS_LABEL[status]}</div>
                )}
                <div style={{ marginTop: '1.2rem', textAlign: 'center' }}>
                  <span onClick={onGoToApp} style={{ fontSize: '0.82rem', color: 'var(--primary-dark)', fontWeight: 600, cursor: 'pointer' }}>アプリのトップへ戻る</span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
