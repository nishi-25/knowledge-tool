import { useEffect, useState } from 'react';
import Input from './ui/Input.jsx';
import Button from './ui/Button.jsx';
import { api } from '../api.js';

export default function AdminLoginScreen({ onLoggedIn }) {
  const [checked, setChecked] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { configured: isConfigured } = await api.adminGetStatus();
        setConfigured(isConfigured);
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  const submit = async () => {
    setError('');
    if (!configured && password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }
    setLoading(true);
    try {
      if (configured) {
        await api.adminLogin(username.trim(), password);
      } else {
        await api.adminSetup(username.trim(), password, setupToken.trim());
      }
      onLoggedIn();
    } catch (e) {
      setError(e.message || '失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const cannotSubmit = !checked || !username.trim() || !password
    || (!configured && (password.length < 8 || !setupToken.trim()));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--app-bg)', padding: '2rem', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', padding: '2.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.8rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-shield-lock-fill" style={{ color: '#fff', fontSize: '1.1rem' }} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
            Knowledge View <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>管理者</span>
          </div>
        </div>

        {checked && !configured ? (
          <>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.4rem' }}>管理者アカウントの初期設定</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.4rem', lineHeight: 1.6 }}>
              このサーバーではまだ管理者アカウントが設定されていません。サーバーの起動ログ（<code>docker compose logs backend</code>）に出力された初期設定トークンを入力し、ユーザー名とパスワードを決めてください。
            </div>
          </>
        ) : (
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '1.4rem' }}>管理者ログイン</div>
        )}

        {!configured && (
          <Input label="初期設定トークン" placeholder="サーバーの起動ログに表示されています" value={setupToken} onChange={setSetupToken} height={42} style={{ marginBottom: '1rem' }} />
        )}
        <Input label="ユーザー名" placeholder={configured ? '' : '例：admin'} value={username} onChange={setUsername} height={42} style={{ marginBottom: '1rem' }} />
        <div style={{ marginBottom: configured ? '1.2rem' : '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>パスワード</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={configured ? '' : '8文字以上'}
            className="kv-input"
            style={{ height: 42 }}
            onKeyDown={(e) => { if (e.key === 'Enter' && configured && !cannotSubmit) submit(); }}
          />
        </div>
        {!configured && (
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>パスワード（確認）</div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="kv-input"
              style={{ height: 42 }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !cannotSubmit) submit(); }}
            />
          </div>
        )}

        {error && <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '1rem', lineHeight: 1.5 }}>{error}</div>}

        <Button variant="primary" block icon="box-arrow-in-right" disabled={cannotSubmit || loading} onClick={submit}>
          {loading ? '処理中...' : configured ? 'ログイン' : '管理者アカウントを作成'}
        </Button>

        <div style={{ textAlign: 'center', marginTop: '1.2rem' }}>
          <a href="/" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>アプリのトップへ戻る</a>
        </div>
      </div>
    </div>
  );
}
