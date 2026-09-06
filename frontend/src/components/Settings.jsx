import { useState } from 'react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import StorageChangeModal from './StorageChangeModal.jsx';
import MembersCard from './MembersCard.jsx';
import ServerLinkCard from './ServerLinkCard.jsx';

export default function Settings({
  projectName, currentStorage, resolvedPath, systemInfo, isOwner, currentUserId,
  onSwitchProject, onChangeStorage,
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleConfirm = async (config) => {
    await onChangeStorage(config);
    setModalOpen(false);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2.4rem 3rem' }}>
      <div style={{ maxWidth: 640 }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.3rem' }}>設定</div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.6rem' }}>プロジェクトの基本設定を管理します</div>

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

        {isOwner && systemInfo?.mode !== 'desktop' && <MembersCard currentUserId={currentUserId} />}
        {systemInfo?.mode === 'desktop' && <ServerLinkCard />}
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
