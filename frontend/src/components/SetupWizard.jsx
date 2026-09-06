import Input from './ui/Input.jsx';
import Button from './ui/Button.jsx';
import StorageConfigForm from './StorageConfigForm.jsx';

export default function SetupWizard({
  mode, projects, onSelectProject, onStartCreate,
  discoverableProjects = [], onRequestJoin,
  projectName, onProjectNameChange, storageOptions, systemInfo,
  onNext, onPrev, onFinish, canGoBackToSelect,
}) {
  const cannotNext = !projectName.trim();
  const stepNumber = mode === 'select' ? null : mode === 'step1' ? 1 : 2;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--app-bg)', padding: '2rem', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: mode === 'select' ? 520 : 460, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', padding: '2.2rem', maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.6rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-journal-bookmark-fill" style={{ color: '#fff', fontSize: '1.1rem' }} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
            Knowledge<span style={{ background: 'var(--grad-accent)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}> View.</span>
          </div>
          {stepNumber && (
            <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ステップ {stepNumber} / 2</div>
          )}
        </div>

        {mode === 'select' && (
          <>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.4rem' }}>プロジェクトを選択</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>参加済みのプロジェクトを開く、ほかのプロジェクトに参加を申請する、または新しく作成してください</div>

            {projects.length > 0 && (
              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>参加中のプロジェクト</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 220, overflowY: 'auto' }}>
                  {projects.map((p) => {
                    const opt = storageOptions.find((o) => o.id === p.storageProvider);
                    return (
                      <div
                        key={p.id}
                        data-project-id={p.id}
                        onClick={() => onSelectProject(p.id)}
                        className="kv-storage-opt"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.75rem 0.9rem', borderRadius: 10, cursor: 'pointer' }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-muted)' }}>
                          <i className={opt?.icon || 'bi bi-hdd-fill'} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-strong)' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>保存先：{opt?.label || p.storageProvider}</div>
                        </div>
                        {p.active && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)' }}>使用中</span>}
                        <i className="bi bi-chevron-right" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', flexShrink: 0 }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {discoverableProjects.length > 0 && (
              <div style={{ marginBottom: '1.4rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>参加をリクエストできるプロジェクト</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 220, overflowY: 'auto' }}>
                  {discoverableProjects.map((p) => (
                    <div
                      key={p.id}
                      data-project-id={p.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid var(--border)' }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-muted)' }}>
                        <i className="bi bi-people-fill" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-strong)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>作成者：{p.ownerName} ・ {p.memberCount}人参加中</div>
                      </div>
                      {p.myStatus === 'pending' ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>承認待ち</span>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => onRequestJoin(p.id)} style={{ flexShrink: 0 }}>参加を申請</Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {projects.length === 0 && discoverableProjects.length === 0 && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.4rem' }}>まだ参加できるプロジェクトがありません。新しく作成しましょう。</div>
            )}

            <Button variant="outline" block icon="plus-lg" onClick={onStartCreate}>新しいプロジェクトを作成</Button>
          </>
        )}

        {mode === 'step1' && (
          <>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.4rem' }}>プロジェクトを作成</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.4rem' }}>ナレッジをまとめるプロジェクトの名前を決めましょう</div>
            <Input label="プロジェクト名" placeholder="例：チームのナレッジベース" value={projectName} onChange={onProjectNameChange} height={44} style={{ marginBottom: '1.6rem' }} />
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              {canGoBackToSelect && <Button variant="ghost" icon="arrow-left" onClick={onPrev}>戻る</Button>}
              <Button variant="primary" block iconRight="arrow-right" disabled={cannotNext} onClick={onNext}>次へ：保存先を選ぶ</Button>
            </div>
          </>
        )}

        {mode === 'step2' && (
          <>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.4rem' }}>保存先を選択</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>ナレッジの保存先を選び、接続テストに成功すると作成できます。</div>
            <StorageConfigForm
              systemInfo={systemInfo}
              initialProvider="local"
              confirmLabel="作成する"
              onConfirm={onFinish}
            />
            <div style={{ marginTop: '0.6rem' }}>
              <Button variant="ghost" icon="arrow-left" onClick={onPrev}>戻る</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
