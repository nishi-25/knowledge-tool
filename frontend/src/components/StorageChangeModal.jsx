import StorageConfigForm from './StorageConfigForm.jsx';

export default function StorageChangeModal({ open, systemInfo, currentProvider, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '2rem' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', padding: '1.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-strong)' }}>保存先を変更</div>
          <div onClick={onClose} style={{ marginLeft: 'auto', cursor: 'pointer', color: 'var(--text-muted)' }}><i className="bi bi-x-lg" /></div>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.2rem', lineHeight: 1.5 }}>
          変更する場合は認証情報を入力し直し、接続テストに成功すると保存できます。
        </div>
        <StorageConfigForm
          systemInfo={systemInfo}
          initialProvider={currentProvider || 'local'}
          confirmLabel="この内容で保存する"
          onConfirm={onConfirm}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
