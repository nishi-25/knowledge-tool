import { useEffect, useState } from 'react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import Input from './ui/Input.jsx';
import Switch from './ui/Switch.jsx';
import AdminLoginScreen from './AdminLoginScreen.jsx';
import AdminProjectPanel from './AdminProjectPanel.jsx';
import { api } from '../api.js';

function LoginSettingsCard() {
  const [loginEnabled, setLoginEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { loginEnabled: enabled } = await api.adminGetLoginSettings();
      setLoginEnabled(enabled);
      setLoaded(true);
    })();
  }, []);

  const toggle = async (next) => {
    setLoginEnabled(next);
    try {
      setError('');
      await api.adminSetLoginSettings(next);
    } catch (e) {
      setLoginEnabled(!next);
      setError(e.message || '更新に失敗しました');
    }
  };

  return (
    <Card title="ログイン機能" icon="door-open" style={{ marginBottom: '1.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Switch checked={loginEnabled} onChange={toggle} disabled={!loaded} />
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{loginEnabled ? '有効' : '無効'}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            無効にすると、一般ユーザーの新規登録・ログインができなくなります（既存のログイン中セッションは維持されます）
          </div>
        </div>
      </div>
      {error && <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.7rem' }}>{error}</div>}
    </Card>
  );
}

function PasswordChangeCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setSuccess(false);
    if (newPassword.length < 8) {
      setError('新しいパスワードは8文字以上にしてください');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません');
      return;
    }
    setLoading(true);
    try {
      await api.adminChangePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (e) {
      setError(e.message || '変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="管理者パスワードの変更" icon="key" style={{ marginBottom: '1.2rem' }}>
      <div style={{ display: 'grid', gap: '0.8rem', maxWidth: 360 }}>
        <Input label="現在のパスワード" value={currentPassword} onChange={setCurrentPassword} height={38} />
        <Input label="新しいパスワード" value={newPassword} onChange={setNewPassword} height={38} />
        <Input label="新しいパスワード（確認）" value={confirmPassword} onChange={setConfirmPassword} height={38} />
      </div>
      {error && <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.7rem' }}>{error}</div>}
      {success && <div style={{ fontSize: '0.8rem', color: 'var(--primary-dark)', marginTop: '0.7rem' }}>パスワードを変更しました</div>}
      <Button variant="primary" size="sm" style={{ marginTop: '0.9rem' }} disabled={loading || !currentPassword || !newPassword} onClick={submit}>
        {loading ? '処理中...' : '変更する'}
      </Button>
    </Card>
  );
}

function UsersCard() {
  const [users, setUsers] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [importSummary, setImportSummary] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useState(() => ({ current: null }))[0];

  const refresh = async () => setUsers(await api.adminListUsers());
  useEffect(() => { refresh(); }, []);

  const addUser = async () => {
    setError('');
    try {
      await api.adminCreateUser(email.trim(), displayName.trim(), password);
      setEmail(''); setDisplayName(''); setPassword(''); setShowAdd(false);
      await refresh();
    } catch (e) {
      setError(e.message || '作成に失敗しました');
    }
  };

  const removeUser = async (id) => {
    try {
      setError('');
      await api.adminDeleteUser(id);
      await refresh();
    } catch (e) {
      setError(e.message || '削除に失敗しました');
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setError('');
    setImportSummary(null);
    try {
      const result = await api.adminImportUsers(file);
      setImportSummary(result);
      await refresh();
    } catch (err) {
      setError(err.message || 'インポートに失敗しました');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card title={`全ユーザー（${users?.length ?? '...'}）`} icon="people" style={{ marginBottom: '1.2rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <Button variant="outline" size="sm" icon="person-plus" onClick={() => setShowAdd((v) => !v)}>ユーザーを追加</Button>
        <Button variant="outline" size="sm" icon="upload" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          {importing ? 'インポート中...' : 'CSVからインポート'}
        </Button>
        <a href={api.adminImportTemplateUrl()} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3em' }}>
          <i className="bi bi-file-earmark-arrow-down" />テンプレートをダウンロード
        </a>
        <a href={api.adminExportUsersUrl()} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3em', marginLeft: 'auto' }}>
          <i className="bi bi-file-earmark-arrow-up" />エクスポート
        </a>
        <input ref={(el) => { fileInputRef.current = el; }} type="file" accept=".csv" onChange={handleImportFile} style={{ display: 'none' }} />
      </div>

      {showAdd && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '1rem', alignItems: 'end' }}>
          <Input label="メールアドレス" value={email} onChange={setEmail} height={36} />
          <Input label="表示名" value={displayName} onChange={setDisplayName} height={36} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>パスワード</div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="kv-input" style={{ height: 36, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <Button variant="primary" size="sm" style={{ height: 36 }} disabled={!email.trim() || !displayName.trim() || !password} onClick={addUser}>作成</Button>
        </div>
      )}

      {error && (
        <div style={{ fontSize: '0.8rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.5rem 0.7rem', marginBottom: '1rem' }}>{error}</div>
      )}

      {importSummary && (
        <div style={{ fontSize: '0.8rem', color: 'var(--primary-dark)', background: 'var(--note-bg)', borderRadius: 8, padding: '0.6rem 0.8rem', marginBottom: '1rem' }}>
          {importSummary.createdCount}件作成しました。
          {importSummary.skippedCount > 0 && (
            <>
              {' '}{importSummary.skippedCount}件スキップ：
              {importSummary.skipped.map((s, i) => (
                <span key={i}>{i > 0 && '、'}{s.row}行目（{s.email || '(空)'}）: {s.reason}</span>
              ))}
            </>
          )}
        </div>
      )}

      {users === null && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>読み込み中...</div>}
      {users?.length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>まだユーザーがいません</div>}
      {users?.map((u) => (
        <div key={u.id} data-user-id={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{u.displayName}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
          </div>
          <Button variant="ghost" size="sm" icon="person-x" onClick={() => removeUser(u.id)}>削除</Button>
        </div>
      ))}
    </Card>
  );
}

function ProjectsCard({ onSelect }) {
  const [projects, setProjects] = useState(null);

  const refresh = async () => setProjects(await api.adminListProjects());
  useEffect(() => { refresh(); }, []);

  return (
    <Card title={`全プロジェクト（${projects?.length ?? '...'}）`} icon="collection">
      {projects === null && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>読み込み中...</div>}
      {projects?.length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>まだプロジェクトがありません</div>}
      {projects?.map((p) => (
        <div key={p.id} data-project-id={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-muted)' }}>
            <i className="bi bi-folder2-open" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-strong)' }}>{p.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              作成者：{p.ownerName} ・ {p.memberCount}人参加中
              {p.pendingCount > 0 && <span style={{ color: 'var(--primary-dark)', fontWeight: 600 }}> ・ 承認待ち{p.pendingCount}件</span>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onSelect(p.id)}>管理</Button>
        </div>
      ))}
    </Card>
  );
}

export default function AdminApp() {
  const [checked, setChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [desktopMode, setDesktopMode] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectsKey, setProjectsKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const info = await fetch('/api/ping').then((r) => r.json());
        if (info.mode === 'desktop') {
          setDesktopMode(true);
          return;
        }
        await api.adminMe();
        setLoggedIn(true);
      } catch {
        setLoggedIn(false);
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  const handleLogout = async () => {
    await api.adminLogout();
    setLoggedIn(false);
  };

  if (!checked) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        読み込み中...
      </div>
    );
  }

  if (desktopMode) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--app-bg)', padding: '2rem', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.6rem' }}>デスクトップ版では利用できません</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>管理者パネルはサーバー版のみの機能です。</div>
          <a href="/" style={{ fontSize: '0.85rem', color: 'var(--primary-dark)', fontWeight: 600 }}>アプリのトップへ戻る</a>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return <AdminLoginScreen onLoggedIn={() => setLoggedIn(true)} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--app-bg)', padding: '2.4rem 3rem' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.6rem' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-strong)' }}>管理者パネル</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>すべてのプロジェクトとユーザーを管理します</div>
          </div>
          <Button variant="ghost" size="sm" icon="box-arrow-right" onClick={handleLogout} style={{ marginLeft: 'auto' }}>ログアウト</Button>
        </div>

        <LoginSettingsCard />
        <PasswordChangeCard />
        <UsersCard />
        <ProjectsCard
          key={projectsKey}
          onSelect={(id) => setSelectedProjectId(id)}
        />
        {selectedProjectId && (
          <AdminProjectPanel
            projectId={selectedProjectId}
            onClose={() => setSelectedProjectId(null)}
            onChanged={() => setProjectsKey((k) => k + 1)}
          />
        )}
      </div>
    </div>
  );
}
