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
