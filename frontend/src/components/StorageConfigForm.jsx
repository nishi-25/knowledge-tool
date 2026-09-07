import { useState } from 'react';
import Input from './ui/Input.jsx';
import Button from './ui/Button.jsx';
import FolderBrowserModal from './FolderBrowserModal.jsx';
import { api } from '../api.js';

const PROVIDERS = [
  { id: 'local', label: 'ローカルストレージ', icon: 'bi-hdd-fill', desc: 'このデバイスにのみ保存します' },
  { id: 'aws', label: 'AWS（S3）', icon: 'bi-cloud-fill', desc: 'Amazon S3 バケットに保存します' },
  { id: 'gdrive', label: 'Google ドライブ', icon: 'bi-google', desc: 'Googleドライブのフォルダに保存します' },
  { id: 'spo', label: 'SharePoint Online', icon: 'bi-microsoft', desc: 'SharePoint のドキュメントライブラリに保存します' },
  { id: 'box', label: 'Box', icon: 'bi-box-seam-fill', desc: 'Box のフォルダに保存します' },
];

function field(label, value, onChange, opts = {}) {
  return (
    <div style={{ marginBottom: '0.7rem' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '0.3rem' }}>{label}</div>
      {opts.textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={opts.placeholder}
          rows={opts.rows || 4}
          spellCheck={false}
          style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.7rem', fontFamily: 'ui-monospace, monospace', fontSize: '0.78rem', resize: 'vertical', outline: 'none' }}
        />
      ) : (
        <input
          type={opts.password ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={opts.placeholder}
          className="kv-input"
          style={{ height: 38 }}
        />
      )}
    </div>
  );
}

export default function StorageConfigForm({
  systemInfo, initialProvider = 'local', onConfirm, confirmLabel = '保存する', onCancel,
}) {
  const [provider, setProvider] = useState(initialProvider);
  const [dataRootMode, setDataRootMode] = useState('local');
  const [dataPath, setDataPath] = useState(null);
  const [browserOpen, setBrowserOpen] = useState(false);

  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('ap-northeast-1');
  const [awsBucket, setAwsBucket] = useState('');
  const [awsPrefix, setAwsPrefix] = useState('knowledge-tool');

  const [boxClientId, setBoxClientId] = useState('');
  const [boxClientSecret, setBoxClientSecret] = useState('');
  const [boxEnterpriseId, setBoxEnterpriseId] = useState('');
  const [boxFolderId, setBoxFolderId] = useState('');

  const [gdriveServiceAccountJson, setGdriveServiceAccountJson] = useState('');
  const [gdriveFolderId, setGdriveFolderId] = useState('');

  const [spoTenantId, setSpoTenantId] = useState('');
  const [spoClientId, setSpoClientId] = useState('');
  const [spoClientSecret, setSpoClientSecret] = useState('');
  const [spoSiteUrl, setSpoSiteUrl] = useState('');
  const [spoFolderPath, setSpoFolderPath] = useState('');

  const [testState, setTestState] = useState('idle'); // idle | testing | success | error
  const [testMessage, setTestMessage] = useState('');
  const [testedSignature, setTestedSignature] = useState(null);

  const buildConfig = () => {
    if (provider === 'local') return { provider: 'local', dataRoot: dataRootMode, dataPath: dataRootMode === 'browse' ? dataPath : null };
    if (provider === 'aws') return { provider: 'aws', awsAccessKeyId, awsSecretAccessKey, awsRegion, awsBucket, awsPrefix };
    if (provider === 'box') return { provider: 'box', boxClientId, boxClientSecret, boxEnterpriseId, boxFolderId };
    if (provider === 'gdrive') return { provider: 'gdrive', gdriveServiceAccountJson, gdriveFolderId };
    if (provider === 'spo') return { provider: 'spo', spoTenantId, spoClientId, spoClientSecret, spoSiteUrl, spoFolderPath };
    return { provider };
  };

  const currentSignature = JSON.stringify(buildConfig());
  const isTested = testState === 'success' && testedSignature === currentSignature;

  const invalidateTest = () => {
    if (testState !== 'idle') setTestState('idle');
    if (testMessage) setTestMessage('');
  };

  const runTest = async () => {
    setTestState('testing');
    setTestMessage('');
    const config = buildConfig();
    try {
      const res = await api.testStorageConfig(config);
      if (res.ok) {
        setTestState('success');
        setTestedSignature(JSON.stringify(config));
      } else {
        setTestState('error');
      }
      setTestMessage(res.message);
    } catch (e) {
      setTestState('error');
      setTestMessage(e.message || '接続テストに失敗しました');
    }
  };

  const isDesktop = systemInfo?.mode === 'desktop';
  const hostLabel = systemInfo?.hostOsGuess === 'windows' ? 'WSL2 (Windows) 上のDockerコンテナ' : systemInfo?.isContainer ? 'Linuxコンテナ' : '不明な環境';

  const pickFolder = async () => {
    if (!window.__KV_PICK_FOLDER__) return;
    const path = await window.__KV_PICK_FOLDER__();
    if (path) {
      setDataRootMode('browse');
      setDataPath(path);
      invalidateTest();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {PROVIDERS.map((opt) => {
          const active = provider === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => { setProvider(opt.id); invalidateTest(); }}
              className={`kv-storage-opt${active ? ' on' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.6rem 0.8rem', borderRadius: 10, cursor: 'pointer' }}
            >
              <i className={`bi ${opt.icon}`} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-strong)' }}>{opt.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
              </div>
              <i className={active ? 'bi bi-check-circle-fill' : 'bi bi-circle'} style={{ color: active ? 'var(--primary)' : 'var(--border-strong)', fontSize: '0.95rem', flexShrink: 0 }} />
            </div>
          );
        })}
      </div>

      <div style={{ background: 'var(--slate-50)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', marginBottom: '1rem' }}>
        {provider === 'local' && (
          <>
            {!isDesktop && (
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>検出環境: {hostLabel}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div
                onClick={() => { setDataRootMode('local'); setDataPath(null); invalidateTest(); }}
                className={`kv-storage-opt${dataRootMode === 'local' ? ' on' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.55rem 0.7rem', borderRadius: 10, cursor: 'pointer', background: 'var(--surface)' }}
              >
                <i className="bi bi-folder2" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-strong)' }}>ローカル（アプリ標準フォルダ）</div>
                <i className={dataRootMode === 'local' ? 'bi bi-check-circle-fill' : 'bi bi-circle'} style={{ color: dataRootMode === 'local' ? 'var(--primary)' : 'var(--border-strong)', fontSize: '0.95rem' }} />
              </div>
              {(systemInfo?.browseAvailable || isDesktop) && (
                <div
                  onClick={() => (isDesktop ? pickFolder() : setBrowserOpen(true))}
                  className={`kv-storage-opt${dataRootMode === 'browse' ? ' on' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.55rem 0.7rem', borderRadius: 10, cursor: 'pointer', background: 'var(--surface)' }}
                >
                  <i className="bi bi-hdd-network-fill" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-strong)' }}>フォルダを選択...</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dataRootMode === 'browse' && dataPath ? dataPath : (isDesktop ? 'クリックしてPC内のフォルダを選択' : 'Windowsのドライブなどから選択')}
                    </div>
                  </div>
                  <i className={dataRootMode === 'browse' ? 'bi bi-check-circle-fill' : 'bi bi-circle'} style={{ color: dataRootMode === 'browse' ? 'var(--primary)' : 'var(--border-strong)', fontSize: '0.95rem' }} />
                </div>
              )}
            </div>
          </>
        )}

        {provider === 'aws' && (
          <>
            {field('アクセスキーID', awsAccessKeyId, (v) => { setAwsAccessKeyId(v); invalidateTest(); }, { placeholder: 'AKIA...' })}
            {field('シークレットアクセスキー', awsSecretAccessKey, (v) => { setAwsSecretAccessKey(v); invalidateTest(); }, { password: true })}
            {field('リージョン', awsRegion, (v) => { setAwsRegion(v); invalidateTest(); }, { placeholder: 'ap-northeast-1' })}
            {field('バケット名', awsBucket, (v) => { setAwsBucket(v); invalidateTest(); }, { placeholder: 'my-knowledge-bucket' })}
            {field('プレフィックス（任意）', awsPrefix, (v) => { setAwsPrefix(v); invalidateTest(); }, { placeholder: 'knowledge-tool' })}
          </>
        )}

        {provider === 'box' && (
          <>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.7rem', lineHeight: 1.5 }}>
              Box開発者コンソールでカスタムアプリ（サーバー認証）を作成し、対象フォルダをそのアプリのサービスアカウントと共有してください。
            </div>
            {field('Client ID', boxClientId, (v) => { setBoxClientId(v); invalidateTest(); })}
            {field('Client Secret', boxClientSecret, (v) => { setBoxClientSecret(v); invalidateTest(); }, { password: true })}
            {field('Enterprise ID', boxEnterpriseId, (v) => { setBoxEnterpriseId(v); invalidateTest(); })}
            {field('フォルダID', boxFolderId, (v) => { setBoxFolderId(v); invalidateTest(); }, { placeholder: '例: 123456789' })}
          </>
        )}

        {provider === 'gdrive' && (
          <>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.7rem', lineHeight: 1.5 }}>
              Google Cloudでサービスアカウントを作成し、発行したJSON鍵の中身を貼り付けてください。対象フォルダをサービスアカウントのメールアドレスと共有（編集者権限）しておく必要があります。
            </div>
            {field('サービスアカウントJSON', gdriveServiceAccountJson, (v) => { setGdriveServiceAccountJson(v); invalidateTest(); }, { textarea: true, rows: 6, placeholder: '{ "type": "service_account", ... }' })}
            {field('フォルダID', gdriveFolderId, (v) => { setGdriveFolderId(v); invalidateTest(); }, { placeholder: 'フォルダURLの末尾の文字列' })}
          </>
        )}

        {provider === 'spo' && (
          <>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.7rem', lineHeight: 1.5 }}>
              Azure ADにアプリを登録し、Microsoft Graphのアプリケーション権限（Sites.ReadWrite.All）を管理者同意してください。
            </div>
            {field('テナントID', spoTenantId, (v) => { setSpoTenantId(v); invalidateTest(); })}
            {field('Client ID', spoClientId, (v) => { setSpoClientId(v); invalidateTest(); })}
            {field('Client Secret', spoClientSecret, (v) => { setSpoClientSecret(v); invalidateTest(); }, { password: true })}
            {field('サイトURL', spoSiteUrl, (v) => { setSpoSiteUrl(v); invalidateTest(); }, { placeholder: 'https://contoso.sharepoint.com/sites/TeamSite' })}
            {field('フォルダパス（任意）', spoFolderPath, (v) => { setSpoFolderPath(v); invalidateTest(); }, { placeholder: '例: KnowledgeTool' })}
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.4rem' }}>
          <Button variant="outline" size="sm" icon="plug" onClick={runTest} disabled={testState === 'testing'}>
            {testState === 'testing' ? '接続テスト中...' : '接続テストする'}
          </Button>
          {testState === 'success' && isTested && (
            <span style={{ fontSize: '0.76rem', color: 'var(--success)', fontWeight: 600 }}><i className="bi bi-check-circle-fill" style={{ marginRight: 4 }} />成功</span>
          )}
          {testState === 'error' && (
            <span style={{ fontSize: '0.76rem', color: 'var(--danger)', fontWeight: 600 }}><i className="bi bi-x-circle-fill" style={{ marginRight: 4 }} />失敗</span>
          )}
        </div>
        {testMessage && (
          <div style={{ fontSize: '0.74rem', color: testState === 'success' ? 'var(--success)' : 'var(--danger)', marginTop: '0.4rem', lineHeight: 1.5 }}>{testMessage}</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem' }}>
        {onCancel && <Button variant="ghost" onClick={onCancel}>キャンセル</Button>}
        <Button variant="primary" block icon="check2" disabled={!isTested} onClick={() => onConfirm(buildConfig())}>
          {confirmLabel}
        </Button>
      </div>
      {!isTested && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>接続テストに成功すると{confirmLabel}が押せるようになります</div>
      )}

      <FolderBrowserModal
        open={browserOpen}
        initialPath={dataPath || systemInfo?.browseRoot}
        onClose={() => setBrowserOpen(false)}
        onSelect={(path) => { setDataRootMode('browse'); setDataPath(path); invalidateTest(); setBrowserOpen(false); }}
      />
    </div>
  );
}
