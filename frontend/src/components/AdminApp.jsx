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

function ComposeEmailModal({ open, onClose, onSend, recipientCount }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setError('');
    setSending(true);
    try {
      await onSend(subject.trim(), body.trim());
      setSubject(''); setBody('');
    } catch (e) {
      setError(e.message || '送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: '92vw', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', padding: '1.4rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.3rem' }}>選択した{recipientCount}件にメールを送信</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>アクセス承認の連絡や新機能のお知らせなどに利用できます。</div>
        <Input label="件名" value={subject} onChange={setSubject} height={38} style={{ marginBottom: '0.8rem' }} />
        <div style={{ marginBottom: '0.8rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>本文</div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="kv-input" style={{ height: 'auto', padding: '0.6rem 0.8rem', resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
        </div>
        {error && <div style={{ fontSize: '0.8rem', color: '#dc2626', marginBottom: '0.8rem' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={onClose}>キャンセル</Button>
          <Button variant="primary" size="sm" disabled={!subject.trim() || !body.trim() || sending} onClick={submit}>
            {sending ? '送信中...' : '送信する'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function UsersCard() {
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [composeOpen, setComposeOpen] = useState(false);
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

  const q = search.trim().toLowerCase();
  const filtered = users?.filter((u) => !q || u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)) ?? [];

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((u) => u.id))));
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`選択した${selected.size}件のユーザーを削除しますか？元に戻せません。`)) return;
    try {
      setError('');
      await api.adminBulkDeleteUsers([...selected]);
      setSelected(new Set());
      await refresh();
    } catch (e) {
      setError(e.message || '削除に失敗しました');
    }
  };

  const sendEmailToSelected = async (subject, body) => {
    const result = await api.adminSendEmailToUsers([...selected], subject, body);
    setComposeOpen(false);
    setSelected(new Set());
    if (result.failedCount > 0) {
      setError(`${result.sentCount}件に送信しました（${result.failedCount}件は送信に失敗）`);
    }
  };

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
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.8rem', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="メールアドレス・表示名で検索..."
          className="kv-input"
          style={{ height: 36, width: 220 }}
        />
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

      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem', padding: '0.5rem 0.7rem', background: 'var(--note-bg)', borderRadius: 8 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{selected.size}件選択中</span>
          <Button variant="outline" size="sm" icon="envelope" onClick={() => setComposeOpen(true)}>メールを送信</Button>
          <Button variant="ghost" size="sm" icon="trash" style={{ color: 'var(--danger)' }} onClick={bulkDelete}>選択したユーザーを削除</Button>
        </div>
      )}

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
      {users && users.length > 0 && filtered.length === 0 && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>該当するユーザーが見つかりません</div>
      )}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border)' }}>
          <input type="checkbox" checked={selected.size === filtered.length} onChange={toggleSelectAll} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>すべて選択</span>
        </div>
      )}
      {filtered.map((u) => (
        <div key={u.id} data-user-id={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
          <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{u.displayName}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
          </div>
          <Button variant="ghost" size="sm" icon="person-x" onClick={() => removeUser(u.id)}>削除</Button>
        </div>
      ))}

      <ComposeEmailModal open={composeOpen} onClose={() => setComposeOpen(false)} onSend={sendEmailToSelected} recipientCount={selected.size} />
    </Card>
  );
}

function ProjectsCard({ onSelect }) {
  const [projects, setProjects] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [error, setError] = useState('');

  const refresh = async () => setProjects(await api.adminListProjects());
  useEffect(() => { refresh(); }, []);

  const q = search.trim().toLowerCase();
  const filtered = projects?.filter((p) => !q || p.name.toLowerCase().includes(q) || p.ownerName.toLowerCase().includes(q)) ?? [];

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id))));
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`選択した${selected.size}件のプロジェクトを完全に削除しますか？記事・フォルダ・タグ・コメントも削除され、元に戻せません。`)) return;
    try {
      setError('');
      await api.adminBulkDeleteProjects([...selected]);
      setSelected(new Set());
      await refresh();
    } catch (e) {
      setError(e.message || '削除に失敗しました');
    }
  };

  return (
    <Card title={`全プロジェクト（${projects?.length ?? '...'}）`} icon="collection">
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.8rem', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="プロジェクト名・作成者で検索..."
          className="kv-input"
          style={{ height: 36, width: 220 }}
        />
      </div>

      {error && (
        <div style={{ fontSize: '0.8rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.5rem 0.7rem', marginBottom: '0.8rem' }}>{error}</div>
      )}

      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem', padding: '0.5rem 0.7rem', background: 'var(--note-bg)', borderRadius: 8 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{selected.size}件選択中</span>
          <Button variant="ghost" size="sm" icon="trash" style={{ color: 'var(--danger)' }} onClick={bulkDelete}>選択したプロジェクトを削除</Button>
        </div>
      )}

      {projects === null && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>読み込み中...</div>}
      {projects?.length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>まだプロジェクトがありません</div>}
      {projects && projects.length > 0 && filtered.length === 0 && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>該当するプロジェクトが見つかりません</div>
      )}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border)' }}>
          <input type="checkbox" checked={selected.size === filtered.length} onChange={toggleSelectAll} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>すべて選択</span>
        </div>
      )}
      {filtered.map((p) => (
        <div key={p.id} data-project-id={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>
          <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
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

function SupportRequestsCard({ onChanged }) {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');
  const [issuedFor, setIssuedFor] = useState(null); // { id, email, tempPassword }
  const [busyId, setBusyId] = useState(null);

  const refresh = async () => {
    const list = await api.adminListSupportRequests();
    setRequests(list);
    onChanged?.();
  };
  useEffect(() => { refresh(); }, []);

  const pending = requests?.filter((r) => r.status === 'pending') ?? [];
  const resolved = requests?.filter((r) => r.status === 'resolved') ?? [];

  const issueTempPassword = async (req) => {
    setBusyId(req.id);
    setError('');
    try {
      const result = await api.adminIssueTempPassword(req.id);
      setIssuedFor({ id: req.id, email: result.email, tempPassword: result.tempPassword });
      await refresh();
    } catch (e) {
      setError(e.message || '発行に失敗しました');
    } finally {
      setBusyId(null);
    }
  };

  const resolve = async (req) => {
    setBusyId(req.id);
    setError('');
    try {
      await api.adminResolveSupportRequest(req.id);
      await refresh();
    } catch (e) {
      setError(e.message || '処理に失敗しました');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card title={`サポート依頼（未対応 ${pending.length}件）`} icon="exclamation-triangle" style={{ marginBottom: '1.2rem' }}>
      {error && (
        <div style={{ fontSize: '0.8rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.5rem 0.7rem', marginBottom: '1rem' }}>{error}</div>
      )}

      {issuedFor && (
        <div style={{ fontSize: '0.8rem', background: 'var(--note-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.7rem 0.9rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>
              {issuedFor.email} 宛の仮パスワードを発行しました。このパスワードをユーザーに伝えてください（閉じると再確認できません）。
            </span>
            <span onClick={() => setIssuedFor(null)} style={{ cursor: 'pointer', color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}><i className="bi bi-x-lg" /></span>
          </div>
          <div style={{ marginTop: '0.4rem', fontFamily: 'ui-monospace, monospace', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)', userSelect: 'all' }}>
            {issuedFor.tempPassword}
          </div>
        </div>
      )}

      {requests === null && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>読み込み中...</div>}
      {requests !== null && pending.length === 0 && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>未対応の依頼はありません</div>
      )}

      {pending.map((r) => (
        <div key={r.id} style={{ border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '0.7rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc2626' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b91c1c' }}>
              {r.type === 'password' ? 'パスワードを忘れた' : 'ユーザー名（メールアドレス）を忘れた'}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(r.createdAt).toLocaleString('ja-JP')}</span>
          </div>

          {r.type === 'password' ? (
            <div style={{ fontSize: '0.85rem', marginBottom: '0.6rem' }}>
              対象：{r.displayName ? `${r.displayName}（${r.email}）` : r.email}
              {!r.userExists && <span style={{ color: '#b91c1c', fontWeight: 600 }}>　※該当するアカウントが見つかりません</span>}
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', marginBottom: '0.6rem', whiteSpace: 'pre-wrap' }}>
              {r.note ? `本人情報：${r.note}` : '本人情報の入力はありませんでした。'}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {r.type === 'password' && (
              <Button variant="primary" size="sm" icon="key" disabled={busyId === r.id || !r.userExists} onClick={() => issueTempPassword(r)}>
                仮パスワードを発行
              </Button>
            )}
            <Button variant="outline" size="sm" icon="check2" disabled={busyId === r.id} onClick={() => resolve(r)}>連絡済み</Button>
          </div>
        </div>
      ))}

      {resolved.length > 0 && (
        <details style={{ marginTop: '0.6rem' }}>
          <summary style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>対応済み（{resolved.length}件）</summary>
          {resolved.map((r) => (
            <div key={r.id} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
              {r.type === 'password' ? `パスワード再発行：${r.email}` : `ユーザー名問い合わせ：${r.note || '(情報なし)'}`}
              　{r.resolvedAt && new Date(r.resolvedAt).toLocaleString('ja-JP')}
            </div>
          ))}
        </details>
      )}
    </Card>
  );
}

const NOTIFICATION_ITEMS = [
  { key: 'accountRegistered', label: 'アカウント登録通知', description: '新規アカウント登録が完了したときに、ユーザー本人へ送信します' },
  { key: 'memberApproved', label: 'プロジェクト参加承認通知', description: 'プロジェクトへの参加申請が承認されたときに、ユーザー本人へ送信します' },
  { key: 'passwordReset', label: 'パスワードリセット完了通知', description: '仮パスワードから新しいパスワードへの変更が完了したときに、ユーザー本人へ送信します' },
  { key: 'articleCreated', label: '記事作成通知', description: 'プロジェクトに新しい記事が作成されたときに、作成者以外のメンバーへ送信します' },
];

function EmailSettingsCard() {
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);

  const refresh = async () => setCfg(await api.adminGetEmailSettings());
  useEffect(() => { refresh(); }, []);

  const set = (key) => (value) => setCfg((prev) => ({ ...prev, [key]: value }));
  const setNotification = (key) => (value) => setCfg((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }));

  const save = async () => {
    setError(''); setSuccess('');
    setSaving(true);
    try {
      await api.adminUpdateEmailSettings(cfg);
      setSuccess('保存しました');
      await refresh();
    } catch (e) {
      setError(e.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setError(''); setSuccess('');
    setTesting(true);
    try {
      await api.adminTestEmail(testEmail.trim());
      setSuccess(`${testEmail} にテストメールを送信しました`);
    } catch (e) {
      setError(e.message || '送信に失敗しました');
    } finally {
      setTesting(false);
    }
  };

  if (!cfg) {
    return <Card title="メール設定" icon="envelope-at"><div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>読み込み中...</div></Card>;
  }

  return (
    <Card title="メール設定" icon="envelope-at" style={{ marginBottom: '1.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem', paddingBottom: '1.2rem', borderBottom: '1px solid var(--border)' }}>
        <Switch checked={!!cfg.enabled} onChange={set('enabled')} />
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{cfg.enabled ? '有効' : '無効（初期設定）'}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            アクセス承認時の通知や、選択したユーザーへのお知らせメール送信に使用します。設定確認ができるまでは無効のままにしておくことをおすすめします。
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
        <Input label="SMTPホスト" value={cfg.smtpHost} onChange={set('smtpHost')} height={38} />
        <Input label="SMTPポート" value={String(cfg.smtpPort)} onChange={(v) => set('smtpPort')(Number(v) || 0)} height={38} />
        <Input label="SMTPユーザー名" value={cfg.smtpUsername} onChange={set('smtpUsername')} height={38} />
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>SMTPパスワード</div>
          <input type="password" value={cfg.smtpPassword} onChange={(e) => set('smtpPassword')(e.target.value)} className="kv-input" style={{ height: 38, width: '100%', boxSizing: 'border-box' }} placeholder="変更する場合のみ入力" />
        </div>
        <Input label="送信元アドレス" value={cfg.fromAddress} onChange={set('fromAddress')} height={38} />
        <Input label="送信者名" value={cfg.fromName} onChange={set('fromName')} height={38} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.4rem' }}>
        <input type="checkbox" checked={!!cfg.useTls} onChange={(e) => set('useTls')(e.target.checked)} id="use-tls" />
        <label htmlFor="use-tls" style={{ fontSize: '0.85rem' }}>TLSを使用する（STARTTLS）</label>
      </div>

      <div style={{ paddingTop: '1.2rem', borderTop: '1px solid var(--border)', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.9rem' }}>通知の種類</div>
        {NOTIFICATION_ITEMS.map((item) => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
            <Switch checked={cfg.notifications?.[item.key] ?? true} onChange={setNotification(item.key)} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.description}</div>
            </div>
          </div>
        ))}
      </div>

      {error && <div style={{ fontSize: '0.8rem', color: '#dc2626', marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ fontSize: '0.8rem', color: 'var(--primary-dark)', marginBottom: '1rem' }}>{success}</div>}

      <Button variant="primary" size="sm" disabled={saving} onClick={save}>{saving ? '保存中...' : '設定を保存'}</Button>

      <div style={{ marginTop: '1.4rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.6rem' }}>テストメールを送信</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" className="kv-input" style={{ height: 36, flex: 1, maxWidth: 280 }} />
          <Button variant="outline" size="sm" disabled={!testEmail.trim() || testing} onClick={sendTest}>{testing ? '送信中...' : '送信'}</Button>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>保存済みの設定を使ってテスト送信します（無効状態でも送信できます）</div>
      </div>
    </Card>
  );
}

const TABS = [
  { key: 'general', label: '全般設定', icon: 'sliders' },
  { key: 'users', label: 'ユーザー管理', icon: 'people' },
  { key: 'projects', label: 'プロジェクト管理', icon: 'collection' },
  { key: 'support', label: 'サポート依頼', icon: 'exclamation-triangle' },
  { key: 'email', label: 'メール設定', icon: 'envelope-at' },
];

export default function AdminApp() {
  const [checked, setChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [desktopMode, setDesktopMode] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectsKey, setProjectsKey] = useState(0);
  const [activeTab, setActiveTab] = useState('general');
  const [supportPendingCount, setSupportPendingCount] = useState(0);

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

  const refreshSupportCount = async () => {
    try {
      const reqs = await api.adminListSupportRequests();
      setSupportPendingCount(reqs.filter((r) => r.status === 'pending').length);
    } catch {
      // ログイン前などは無視
    }
  };
  useEffect(() => { if (loggedIn) refreshSupportCount(); }, [loggedIn]);

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
    <div style={{ minHeight: '100vh', background: 'var(--app-bg)', display: 'flex' }}>
      <div style={{
        width: 232, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '1.6rem 1rem',
      }}>
        <div style={{ padding: '0 0.5rem', marginBottom: '1.8rem' }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-strong)' }}>管理者パネル</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>すべてのプロジェクトとユーザーを管理します</div>
        </div>

        {TABS.map((t) => {
          const active = activeTab === t.key;
          const badge = t.key === 'support' ? supportPendingCount : 0;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.7rem', marginBottom: '0.2rem',
                borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                background: active ? 'var(--note-bg)' : 'transparent',
                color: active ? 'var(--primary-dark)' : 'var(--text-body)',
                fontWeight: active ? 700 : 500, fontSize: '0.88rem',
              }}
            >
              <i className={`bi bi-${t.icon}`} style={{ fontSize: '0.95rem' }} />
              {t.label}
              {badge > 0 && (
                <span style={{
                  marginLeft: 'auto', background: '#dc2626', color: '#fff', fontSize: '0.68rem', fontWeight: 700,
                  borderRadius: 999, padding: '0.1em 0.55em', minWidth: 18, textAlign: 'center', lineHeight: 1.5,
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />
        <Button variant="ghost" size="sm" icon="box-arrow-right" onClick={handleLogout}>ログアウト</Button>
      </div>

      <div style={{ flex: 1, padding: '2.4rem 3rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: 760 }}>
          {activeTab === 'general' && (
            <>
              <LoginSettingsCard />
              <PasswordChangeCard />
            </>
          )}
          {activeTab === 'users' && <UsersCard />}
          {activeTab === 'projects' && (
            <ProjectsCard
              key={projectsKey}
              onSelect={(id) => setSelectedProjectId(id)}
            />
          )}
          {activeTab === 'support' && <SupportRequestsCard onChanged={refreshSupportCount} />}
          {activeTab === 'email' && <EmailSettingsCard />}
        </div>
      </div>

      {selectedProjectId && (
        <AdminProjectPanel
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
          onChanged={() => setProjectsKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
