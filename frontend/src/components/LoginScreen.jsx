import { useState } from 'react';
import Input from './ui/Input.jsx';
import Button from './ui/Button.jsx';
import { api } from '../api.js';

function ForgotPasswordForm({ onBack }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(e.message || '送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
        管理者に連絡されました。仮パスワードが発行されるまでしばらくお待ちください。
        <div style={{ marginTop: '1rem' }}>
          <span onClick={onBack} style={{ color: 'var(--primary-dark)', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>ログイン画面に戻る</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
        登録済みのメールアドレスを入力してください。管理者に通知され、仮パスワードが発行されます。
      </div>
      <Input label="メールアドレス" placeholder="you@example.com" value={email} onChange={setEmail} height={42} style={{ marginBottom: '1rem' }} />
      {error && <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
      <Button variant="primary" block disabled={!email.trim() || loading} onClick={submit}>
        {loading ? '送信中...' : '管理者に連絡する'}
      </Button>
      <div style={{ textAlign: 'center', marginTop: '1.2rem' }}>
        <span onClick={onBack} style={{ color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>戻る</span>
      </div>
    </div>
  );
}

function ForgotUsernameForm({ onBack }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await api.forgotUsername(note.trim());
      setSent(true);
    } catch (e) {
      setError(e.message || '送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
        管理者に連絡されました。折り返しの連絡までしばらくお待ちください。
        <div style={{ marginTop: '1rem' }}>
          <span onClick={onBack} style={{ color: 'var(--primary-dark)', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>ログイン画面に戻る</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
        メールアドレス（ユーザー名）自体を忘れた場合は、お名前など、ご本人の確認に役立つ情報を入力してください。管理者から直接連絡します。
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>お名前など（任意）</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="kv-input"
          style={{ height: 'auto', padding: '0.6rem 0.8rem', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
        />
      </div>
      {error && <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
      <Button variant="primary" block disabled={loading} onClick={submit}>
        {loading ? '送信中...' : '管理者に連絡する'}
      </Button>
      <div style={{ textAlign: 'center', marginTop: '1.2rem' }}>
        <span onClick={onBack} style={{ color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>戻る</span>
      </div>
    </div>
  );
}

export default function LoginScreen({ onAuthenticated, loginEnabled = true }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [helpMode, setHelpMode] = useState(null); // null | 'forgot-password' | 'forgot-username'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const user = mode === 'login'
        ? await api.login(email.trim(), password)
        : await api.signup(email.trim(), password, displayName.trim());
      onAuthenticated(user);
    } catch (e) {
      setError(e.message || '失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const cannotSubmit = !email.trim() || !password || (mode === 'signup' && !displayName.trim());

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--app-bg)', padding: '2rem', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', padding: '2.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.8rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-journal-bookmark-fill" style={{ color: '#fff', fontSize: '1.1rem' }} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
            Knowledge<span style={{ background: 'var(--grad-accent)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}> View.</span>
          </div>
        </div>

        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '1.4rem' }}>
          {helpMode === 'forgot-password' ? 'パスワードを忘れた場合'
            : helpMode === 'forgot-username' ? 'ユーザー名（メールアドレス）を忘れた場合'
            : mode === 'login' ? 'ログイン' : 'アカウントを作成'}
        </div>

        {helpMode === 'forgot-password' && <ForgotPasswordForm onBack={() => setHelpMode(null)} />}
        {helpMode === 'forgot-username' && <ForgotUsernameForm onBack={() => setHelpMode(null)} />}

        {!helpMode && !loginEnabled && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--slate-100)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.8rem 1rem', lineHeight: 1.6 }}>
            現在、ログイン・新規登録は管理者により無効化されています。しばらくしてから再度お試しください。
          </div>
        )}

        {!helpMode && loginEnabled && (
          <>
            {mode === 'signup' && (
              <Input label="表示名" placeholder="例：山田太郎" value={displayName} onChange={setDisplayName} height={42} style={{ marginBottom: '1rem' }} />
            )}
            <Input label="メールアドレス" placeholder="you@example.com" value={email} onChange={setEmail} height={42} style={{ marginBottom: '1rem' }} />
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>パスワード</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? '6文字以上' : ''}
                className="kv-input"
                style={{ height: 42 }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !cannotSubmit) submit(); }}
              />
            </div>

            {error && <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '1rem', lineHeight: 1.5 }}>{error}</div>}

            <Button variant="primary" block icon="box-arrow-in-right" disabled={cannotSubmit || loading} onClick={submit}>
              {loading ? '処理中...' : mode === 'login' ? 'ログイン' : 'アカウントを作成'}
            </Button>

            <div style={{ textAlign: 'center', marginTop: '1.2rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {mode === 'login' ? (
                <>アカウントをお持ちでないですか？ <span onClick={() => { setMode('signup'); setError(''); }} style={{ color: 'var(--primary-dark)', fontWeight: 600, cursor: 'pointer' }}>新規登録</span></>
              ) : (
                <>すでにアカウントをお持ちですか？ <span onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--primary-dark)', fontWeight: 600, cursor: 'pointer' }}>ログイン</span></>
              )}
            </div>

            {mode === 'login' && (
              <div style={{ textAlign: 'center', marginTop: '0.8rem', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <span onClick={() => setHelpMode('forgot-password')} style={{ cursor: 'pointer' }}>パスワードを忘れた場合</span>
                <span onClick={() => setHelpMode('forgot-username')} style={{ cursor: 'pointer' }}>ユーザー名を忘れた場合</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
