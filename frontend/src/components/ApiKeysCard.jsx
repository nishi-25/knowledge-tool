import { useEffect, useState } from 'react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import Input from './ui/Input.jsx';
import { api } from '../api.js';
import { fmtDate } from '../utils.js';

export default function ApiKeysCard() {
  const apiBaseUrl = api.publicApiBaseUrl();
  const [keys, setKeys] = useState([]);
  const [labelDraft, setLabelDraft] = useState('');
  const [newKey, setNewKey] = useState(null); // { id, label, key } 発行直後のみ表示
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = async () => setKeys(await api.listApiKeys());
  useEffect(() => { refresh(); }, []);

  const createKey = async () => {
    setLoading(true);
    try {
      const result = await api.createApiKey(labelDraft.trim());
      setNewKey(result);
      setLabelDraft('');
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const deleteKey = async (id) => {
    if (!window.confirm('このAPIキーを失効させますか？このキーを使っている連携先は使えなくなります。')) return;
    await api.deleteApiKey(id);
    if (newKey?.id === id) setNewKey(null);
    await refresh();
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(newKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard APIが使えない環境では手動選択してもらう
    }
  };

  return (
    <Card title="外部APIキー" icon="key-fill" style={{ marginTop: '1.2rem' }}>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
        発行したAPIキーを使うと、外部プログラムから記事・フォルダの取得・追加・削除ができます。
        リクエストヘッダーに <code style={{ background: 'var(--slate-100)', padding: '0.1em 0.4em', borderRadius: 4 }}>X-API-Key</code> を付けて
        <code style={{ background: 'var(--slate-100)', padding: '0.1em 0.4em', borderRadius: 4, marginLeft: 4 }}>{apiBaseUrl}/v1/articles</code> 等にアクセスしてください。
      </div>

      {newKey && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400e', marginBottom: '0.4rem' }}>
            <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 4 }} />
            このキーは今だけ表示されます。必ずコピーして安全な場所に保管してください。
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <code style={{ fontSize: '0.8rem', background: '#fff', border: '1px solid #fde68a', borderRadius: 6, padding: '0.4rem 0.6rem', flex: 1, overflowX: 'auto', whiteSpace: 'nowrap' }}>
              {newKey.key}
            </code>
            <Button size="sm" variant="outline" icon={copied ? 'check2' : 'clipboard'} onClick={copyKey}>{copied ? 'コピーしました' : 'コピー'}</Button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <Input label="新しいキーのラベル" placeholder="例: AIエージェント用" value={labelDraft} onChange={setLabelDraft} height={36} style={{ maxWidth: 260 }} />
        <Button size="sm" variant="primary" icon="plus-lg" disabled={loading} onClick={createKey}>発行する</Button>
      </div>

      {keys.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {keys.map((k) => (
            <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.7rem', borderRadius: 8, background: 'var(--slate-50)' }}>
              <i className="bi bi-key-fill" style={{ color: 'var(--text-muted)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-strong)' }}>{k.label}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  発行: {fmtDate(k.createdAt)}{k.lastUsedAt ? ` ・ 最終利用: ${fmtDate(k.lastUsedAt)}` : ' ・ 未使用'}
                </div>
              </div>
              <Button size="sm" variant="ghost" icon="trash" onClick={() => deleteKey(k.id)} style={{ color: 'var(--danger)' }}>失効</Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
