import { useState } from 'react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import Switch from './ui/Switch.jsx';
import { api } from '../api.js';

const PROVIDERS = [
  { id: 'claude', label: 'Anthropic Claude', keyPlaceholder: 'sk-ant-...', keyLink: 'https://console.anthropic.com/', keyLinkLabel: 'Anthropicコンソールで取得', defaultModel: 'claude-sonnet-5' },
  { id: 'openai', label: 'OpenAI', keyPlaceholder: 'sk-...', keyLink: 'https://platform.openai.com/api-keys', keyLinkLabel: 'OpenAIプラットフォームで取得', defaultModel: 'gpt-4o-mini' },
  { id: 'local', label: 'ローカルLLM（Ollama等）', keyPlaceholder: '（多くの場合不要）', keyLink: null, keyLinkLabel: '', defaultModel: 'llama3.2' },
];

export default function AiSettingsCard({ currentProject, onUpdated }) {
  const savedProvider = currentProject?.aiProvider || 'claude';
  const [enabled, setEnabled] = useState(!!currentProject?.aiEnabled);
  const [provider, setProvider] = useState(savedProvider);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [baseUrlDraft, setBaseUrlDraft] = useState(currentProject?.aiBaseUrl || '');
  const [modelDraft, setModelDraft] = useState(currentProject?.aiModel || '');
  const [testState, setTestState] = useState('idle'); // idle | testing | success | error
  const [testMessage, setTestMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const meta = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];
  const hasStoredKeyForProvider = provider === savedProvider && !!currentProject?.aiApiKey;
  const requiresKey = provider === 'claude' || provider === 'openai';
  const testDisabled = testState === 'testing' || (requiresKey && !apiKeyDraft.trim() && !hasStoredKeyForProvider);

  const handleProviderChange = (id) => {
    setProvider(id);
    setApiKeyDraft('');
    setTestState('idle');
    setTestMessage('');
  };

  const runTest = async () => {
    setTestState('testing');
    setTestMessage('');
    try {
      const res = await api.testAiKey(provider, apiKeyDraft.trim(), baseUrlDraft.trim(), modelDraft.trim());
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
      await api.updateAiConfig(enabled, provider, apiKeyDraft.trim(), baseUrlDraft.trim(), modelDraft.trim());
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
        エディタの「メモをOCRで読み込む」「キーワードから整理」機能は、ここでAIプロバイダーを選び有効にしないと使えません。
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.1rem' }}>
        <Switch checked={enabled} onChange={setEnabled} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>AI機能を有効にする</span>
      </div>

      <div style={{ marginBottom: '0.9rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 6 }}>プロバイダー</div>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="kv-input"
          style={{ height: 38, width: '100%', maxWidth: 420, boxSizing: 'border-box' }}
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {provider === 'local' && (
        <div style={{ marginBottom: '0.9rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 6 }}>エンドポイントURL（OpenAI互換）</div>
          <input
            type="text"
            value={baseUrlDraft}
            onChange={(e) => setBaseUrlDraft(e.target.value)}
            placeholder="http://localhost:11434/v1"
            className="kv-input"
            style={{ height: 38, width: '100%', maxWidth: 420, boxSizing: 'border-box' }}
          />
        </div>
      )}

      <div style={{ marginBottom: '0.6rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 6 }}>
          APIキー{!requiresKey && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>（任意）</span>}
        </div>
        <input
          type="password"
          value={apiKeyDraft}
          onChange={(e) => { setApiKeyDraft(e.target.value); setTestState('idle'); }}
          placeholder={hasStoredKeyForProvider ? '設定済み（変更する場合のみ入力）' : meta.keyPlaceholder}
          className="kv-input"
          style={{ height: 38, width: '100%', maxWidth: 420, boxSizing: 'border-box' }}
        />
        {meta.keyLink && (
          <a href={meta.keyLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.74rem', display: 'inline-block', marginTop: 6 }}>{meta.keyLinkLabel}</a>
        )}
      </div>

      <div style={{ marginBottom: '0.9rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 6 }}>モデル名<span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>（任意・未入力なら既定値）</span></div>
        <input
          type="text"
          value={modelDraft}
          onChange={(e) => setModelDraft(e.target.value)}
          placeholder={meta.defaultModel}
          className="kv-input"
          style={{ height: 38, width: '100%', maxWidth: 420, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
        <Button variant="outline" size="sm" icon="plug" disabled={testDisabled} onClick={runTest}>
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
