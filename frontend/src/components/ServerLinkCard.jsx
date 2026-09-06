import { useState } from 'react';
import Card from './ui/Card.jsx';
import Input from './ui/Input.jsx';
import Button from './ui/Button.jsx';
import { api } from '../api.js';

export default function ServerLinkCard() {
  const linked = api.getRemoteLink();
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [testResult, setTestResult] = useState(null); // null | 'ok' | 'error'
  const [testMessage, setTestMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setError('');
    setTestResult(null);
    if (!url.trim()) return;
    setLoading(true);
    try {
      const info = await api.ping(url.trim());
      if (info.app !== 'knowledge-view') {
        throw new Error('Knowledge Viewサーバーとして認識できませんでした');
      }
      setTestResult('ok');
      setTestMessage(`接続に成功しました（バージョン ${info.version}）`);
    } catch (e) {
      setTestResult('error');
      setTestMessage(e.message || '接続に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const link = async () => {
    setError('');
    setLoading(true);
    try {
      await api.linkToServer(url.trim(), email.trim(), password);
      window.location.reload();
    } catch (e) {
      setError(e.message || '連携に失敗しました');
      setLoading(false);
    }
  };

  const unlink = () => {
    api.unlinkServer();
    window.location.reload();
  };

  if (linked) {
    return (
      <Card title="サーバーとの連携" icon="hdd-network" style={{ marginTop: '1.2rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
          現在、以下のサーバーに接続しています。
        </div>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>{linked.url}</div>
        <Button variant="outline" size="sm" icon="hdd" onClick={unlink}>ローカルに戻る</Button>
      </Card>
    );
  }

  return (
    <Card title="サーバーとの連携" icon="hdd-network" style={{ marginTop: '1.2rem' }}>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
        このアプリは通常ログイン不要のローカル動作ですが、チームのKnowledge Viewサーバーに接続すると、そのサーバー上のプロジェクトをログインして利用できます。
      </div>
      <Input label="サーバーURL" placeholder="https://knowledge.example.com" value={url} onChange={setUrl} height={38} style={{ marginBottom: '0.8rem', maxWidth: 420 }} />
      <Button variant="outline" size="sm" disabled={!url.trim() || loading} onClick={testConnection}>接続テストする</Button>
      {testResult && (
        <div style={{ fontSize: '0.8rem', marginTop: '0.6rem', color: testResult === 'ok' ? 'var(--primary-dark)' : '#dc2626' }}>{testMessage}</div>
      )}

      {testResult === 'ok' && (
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
    </Card>
  );
}
