import { useState } from 'react';
import Card from './ui/Card.jsx';
import Input from './ui/Input.jsx';
import Button from './ui/Button.jsx';
import { api } from '../api.js';

export default function ServerLinkCard({ onLinked, onUnlinked }) {
  const linked = api.getRemoteLink();
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [testResult, setTestResult] = useState(null); // null | 'ok' | 'error'
  const [testMessage, setTestMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setError('');
    setTestResult(null);
    setShowLoginForm(false);
    if (!url.trim()) return;
    setLoading(true);
    try {
      const info = await api.ping(url.trim());
      if (info.app !== 'knowledge-view') {
        throw new Error('Knowledge Viewサーバーとして認識できませんでした');
      }
      setTestResult('ok');
      setTestMessage(`接続に成功しました（バージョン ${info.version}）`);
      setConfirmOpen(true);
    } catch (e) {
      setTestResult('error');
      setTestMessage(e.message || '接続に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const confirmConnect = () => {
    setConfirmOpen(false);
    setShowLoginForm(true);
  };

  const link = async () => {
    setError('');
    setLoading(true);
    try {
      await api.linkToServer(url.trim(), email.trim(), password);
      api.setActiveSource('remote');
      await onLinked?.();
    } catch (e) {
      setError(e.message || '連携に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const unlink = async () => {
    api.unlinkServer();
    await onUnlinked?.();
  };

  if (linked) {
    return (
      <Card title="サーバーとの連携" icon="hdd-network" style={{ marginTop: '1.2rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
          以下のサーバーに接続しています。「記事」画面のフォルダツリー上部のタブで、ローカルとサーバーの表示を切り替えられます。
        </div>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>{linked.url}</div>
        <Button variant="outline" size="sm" icon="hdd" onClick={unlink}>連携を解除する</Button>
      </Card>
    );
  }

  return (
    <Card title="サーバーとの連携" icon="hdd-network" style={{ marginTop: '1.2rem' }}>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
        このアプリは通常ログイン不要のローカル動作ですが、チームのKnowledge Viewサーバーに接続すると、ログイン後はローカルとサーバー、両方のデータを切り替えて利用できます。
      </div>
      <Input label="サーバーURL" placeholder="https://knowledge.example.com" value={url} onChange={setUrl} height={38} style={{ marginBottom: '0.8rem', maxWidth: 420 }} />
      <Button variant="outline" size="sm" disabled={!url.trim() || loading} onClick={testConnection}>接続テストする</Button>
      {testResult && (
        <div style={{ fontSize: '0.8rem', marginTop: '0.6rem', color: testResult === 'ok' ? 'var(--primary-dark)' : '#dc2626' }}>{testMessage}</div>
      )}

      {showLoginForm && (
        <div style={{ marginTop: '1.2rem', display: 'grid', gap: '0.8rem', maxWidth: 360 }}>
          <Input label="メールアドレス" placeholder="you@example.com" value={email} onChange={setEmail} height={38} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>パスワード</div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="kv-input" style={{ height: 38 }} />
          </div>
          {error && <div style={{ fontSize: '0.8rem', color: '#dc2626' }}>{error}</div>}
          <Button variant="primary" size="sm" disabled={!email.trim() || !password || loading} onClick={link}>
            {loading ? '処理中...' : '連携する'}
          </Button>
        </div>
      )}

      {confirmOpen && (
        <div onClick={() => setConfirmOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '2rem' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 380, maxWidth: '100%', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', padding: '1.6rem' }}>
            <div style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.6rem' }}>サーバーと接続しますか？</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.4rem', lineHeight: 1.6, fontFamily: 'ui-monospace, monospace' }}>{url.trim()}</div>
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>キャンセル</Button>
              <Button variant="primary" size="sm" onClick={confirmConnect}>OK</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
