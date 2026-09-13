import { useState } from 'react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import Switch from './ui/Switch.jsx';
import { api } from '../api.js';

export default function AiSettingsCard({ currentProject, onUpdated }) {
  const [enabled, setEnabled] = useState(!!currentProject?.aiEnabled);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [testState, setTestState] = useState('idle'); // idle | testing | success | error
  const [testMessage, setTestMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const hasStoredKey = !!currentProject?.aiApiKey;

  const runTest = async () => {
    setTestState('testing');
    setTestMessage('');
    try {
      const res = await api.testAiKey(apiKeyDraft.trim());
      setTestState(res.ok ? 'success' : 'error');
      setTestMessage(res.message);
    } catch (e) {
      setTestState('error');
      setTestMessage(e.message || '接続テストに失敗しました');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.updateAiConfig(enabled, apiKeyDraft.trim());
      setApiKeyDraft('');
      setTestState('idle');
      setTestMessage('');
      await onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="AI設定" icon="stars" style={{ marginTop: '1.2rem' }}>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
        エディタの「メモをOCRで読み込む」「キーワードから整理」機能は、ここでAnthropic（Claude）のAPIキーを登録し有効にしないと使えません。
        <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 4 }}>APIキーの取得はこちら</a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1rem' }}>
        <Switch checked={enabled} onChange={setEnabled} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>AI機能を有効にする</span>
      </div>

      <div style={{ marginBottom: '0.6rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 6 }}>APIキー</div>
        <input
          type="password"
          value={apiKeyDraft}
          onChange={(e) => { setApiKeyDraft(e.target.value); setTestState('idle'); }}
          placeholder={hasStoredKey ? '設定済み（変更する場合のみ入力）' : 'sk-ant-...'}
          className="kv-input"
          style={{ height: 38, width: '100%', maxWidth: 420, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
        <Button variant="outline" size="sm" icon="plug" disabled={testState === 'testing' || (!apiKeyDraft.trim() && !hasStoredKey)} onClick={runTest}>
          {testState === 'testing' ? '接続テスト中...' : '接続テストする'}
        </Button>
        {testState === 'success' && <span style={{ fontSize: '0.76rem', color: 'var(--success)', fontWeight: 600 }}><i className="bi bi-check-circle-fill" style={{ marginRight: 4 }} />成功</span>}
        {testState === 'error' && <span style={{ fontSize: '0.76rem', color: 'var(--danger)', fontWeight: 600 }}><i className="bi bi-x-circle-fill" style={{ marginRight: 4 }} />失敗</span>}
      </div>
      {testMessage && (
        <div style={{ fontSize: '0.74rem', color: testState === 'success' ? 'var(--success)' : 'var(--danger)', marginBottom: '0.8rem', lineHeight: 1.5 }}>{testMessage}</div>
      )}

      <Button variant="primary" size="sm" icon="check2" disabled={saving} onClick={save}>保存する</Button>
    </Card>
  );
}
