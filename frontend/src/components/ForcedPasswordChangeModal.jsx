import { useState } from 'react';
import Input from './ui/Input.jsx';
import Button from './ui/Button.jsx';
import { api } from '../api.js';

export default function ForcedPasswordChangeModal({ onDone }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (newPassword.length < 6) {
      setError('パスワードは6文字以上にしてください');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }
    setLoading(true);
    try {
      await api.setNewPassword(newPassword);
      onDone();
    } catch (e) {
      setError(e.message || '設定に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--app-bg)', padding: '2rem', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', padding: '2.2rem' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.6rem' }}>新しいパスワードの設定</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.4rem', lineHeight: 1.6 }}>
          管理者から発行された仮パスワードでログインしました。続ける前に、新しいパスワードを設定してください。
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>新しいパスワード</div>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="6文字以上"
            className="kv-input"
            style={{ height: 42 }}
          />
        </div>
        <div style={{ marginBottom: '1.2rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>新しいパスワード（確認）</div>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="kv-input"
            style={{ height: 42 }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />
        </div>

        {error && <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}

        <Button variant="primary" block disabled={!newPassword || !confirmPassword || loading} onClick={submit}>
          {loading ? '設定中...' : '設定してログインを続ける'}
        </Button>
      </div>
    </div>
  );
}
