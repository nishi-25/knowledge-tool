import { ARTICLE_TEMPLATES } from '../articleTemplates.js';

export default function TemplatePickerModal({ open, onClose, onSelect }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 640, maxWidth: '92vw', maxHeight: '80vh', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.9rem 1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ flex: 1, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)' }}>ナレッジの作成方法を選択</div>
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-muted)', padding: '0.3rem' }}><i className="bi bi-x-lg" /></div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.9rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', alignContent: 'start' }}>
          {ARTICLE_TEMPLATES.map((t) => (
            <button key={t.key} onClick={() => onSelect(t)} className="kv-modal-card">
              <i className={t.icon} style={{ color: 'var(--primary-dark)' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-strong)' }}>{t.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{t.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
