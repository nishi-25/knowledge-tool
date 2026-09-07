import { useState } from 'react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';

export default function DesktopPortCard() {
  const activePort = window.__KV_GET_ACTIVE_PORT__?.() ?? null;
  const [portDraft, setPortDraft] = useState(String(activePort ?? ''));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    setSaved(false);
    const port = parseInt(portDraft, 10);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      setError('ポート番号は1024〜65535の範囲で指定してください');
      return;
    }
    try {
      await window.__KV_SET_PORT__(port);
      setSaved(true);
    } catch (e) {
      setError(e.message || '保存に失敗しました');
    }
  };

  const relaunch = () => window.__KV_RELAUNCH__?.();

  if (activePort === null) return null;

  return (
    <Card title="起動ポート" icon="hdd-network" style={{ marginTop: '1.2rem' }}>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
        内蔵バックエンドが使用するポート番号です（現在: {activePort}）。他のアプリとポートが競合する場合などに変更してください。
        変更は次回アプリを起動したときから反映されます。
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="number" min={1024} max={65535} value={portDraft}
          onChange={(e) => { setPortDraft(e.target.value); setSaved(false); }}
          className="kv-input" style={{ height: 36, width: 140 }}
        />
        <Button size="sm" variant="outline" icon="check2" onClick={save}>保存する</Button>
        {saved && <Button size="sm" variant="primary" icon="arrow-repeat" onClick={relaunch}>今すぐ再起動する</Button>}
      </div>

      {saved && (
        <div style={{ fontSize: '0.8rem', marginTop: '0.6rem', color: 'var(--primary-dark)' }}>
          設定を保存しました。次回起動時から反映されます。
        </div>
      )}
      {error && (
        <div style={{ fontSize: '0.8rem', marginTop: '0.6rem', color: '#dc2626' }}>{error}</div>
      )}
    </Card>
  );
}
