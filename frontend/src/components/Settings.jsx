import { useState } from 'react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import StorageChangeModal from './StorageChangeModal.jsx';
import MembersCard from './MembersCard.jsx';
import ServerLinkCard from './ServerLinkCard.jsx';
import DataIOCard from './DataIOCard.jsx';
import ApiKeysCard from './ApiKeysCard.jsx';
import AccountApiKeysCard from './AccountApiKeysCard.jsx';
import DesktopPortCard from './DesktopPortCard.jsx';
import AiSettingsCard from './AiSettingsCard.jsx';

export default function Settings({
  projectName, currentStorage, resolvedPath, systemInfo, isOwner, currentUserId, isDesktopApp, currentProject,
  onSwitchProject, onChangeStorage, onServerLinked, onServerUnlinked, onDataImported, onAiConfigUpdated,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const isServerMode = systemInfo?.mode !== 'desktop';

  const tabs = [
    { id: 'general', label: '一般', icon: 'gear' },
    isOwner && isServerMode && { id: 'members', label: 'メンバー', icon: 'people' },
    { id: 'integrations', label: 'データ連携', icon: 'plug' },
    isOwner && { id: 'ai', label: 'AI設定', icon: 'stars' },
    isDesktopApp && { id: 'desktop', label: 'デスクトップ', icon: 'laptop' },
  ].filter(Boolean);

  const [activeTab, setActiveTab] = useState('general');
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0]?.id;

  const handleConfirm = async (config) => {
    await onChangeStorage(config);
    setModalOpen(false);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2.4rem 3rem' }}>
      <div style={{ maxWidth: 680 }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.3rem' }}>設定</div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.4rem' }}>プロジェクトの基本設定を管理します</div>

        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.6rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {tabs.map((t) => (
            <div
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                padding: '0.6rem 0.9rem', fontSize: '0.85rem', fontWeight: 700,
                color: currentTab === t.id ? 'var(--primary-dark)' : 'var(--text-muted)',
                borderBottom: currentTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <i className={`bi bi-${t.icon}`} />{t.label}
            </div>
          ))}
        </div>

        {currentTab === 'general' && (
          <>
            <Card title="プロジェクト設定" icon="gear">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                  <i className={currentStorage.icon} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)' }}>
                    {projectName}
                    {!isOwner && <span style={{ marginLeft: '0.6rem', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--slate-100)', padding: '0.15em 0.6em', borderRadius: 999 }}>閲覧メンバー</span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>保存先：{currentStorage.label}</div>
                  {resolvedPath && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {resolvedPath}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <Button variant="outline" size="sm" icon="arrow-left-right" onClick={onSwitchProject}>プロジェクトを切り替える</Button>
                {isOwner && <Button variant="outline" size="sm" icon="hdd" onClick={() => setModalOpen(true)}>保存先を変更</Button>}
              </div>
            </Card>

            {isServerMode && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.9rem 0 1.2rem', background: 'var(--slate-100)', padding: '0.7rem 0.9rem', borderRadius: 8, lineHeight: 1.6 }}>
                <i className="bi bi-envelope" style={{ marginRight: 6 }} />
                メール通知（SMTP）の送信設定はサーバー全体で共有するため、管理者パネル（<code>/admin</code>）から行います。プロジェクトの設定からは変更できません。
              </div>
            )}

            <Card title="アプリ情報" icon="info-circle">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                バージョン: <span style={{ fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'ui-monospace, monospace' }}>{systemInfo?.version || '不明'}</span>
                <span style={{ marginLeft: '0.6rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  （{systemInfo?.mode === 'desktop' ? 'デスクトップ版' : 'サーバー版'}）
                </span>
              </div>
            </Card>
          </>
        )}

        {currentTab === 'members' && <MembersCard currentUserId={currentUserId} />}

        {currentTab === 'integrations' && (
          <>
            <DataIOCard projectName={projectName} isOwner={isOwner} onImported={onDataImported} />
            {isOwner && <ApiKeysCard />}
            <AccountApiKeysCard />
          </>
        )}

        {currentTab === 'ai' && isOwner && (
          <AiSettingsCard currentProject={currentProject} onUpdated={onAiConfigUpdated} />
        )}

        {currentTab === 'desktop' && (
          <>
            <ServerLinkCard onLinked={onServerLinked} onUnlinked={onServerUnlinked} />
            <DesktopPortCard />
          </>
        )}
      </div>

      <StorageChangeModal
        open={modalOpen}
        systemInfo={systemInfo}
        currentProvider={currentStorage.id}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
