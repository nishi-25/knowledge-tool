export default function ContextMenu({ x, y, items, onClose }) {
  return (
    <div onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: y, left: x, minWidth: 160, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: '0.35rem', zIndex: 301,
        }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            onClick={() => { item.onClick(); onClose(); }}
            className="kv-list-row"
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.7rem', borderRadius: 8, cursor: 'pointer', color: item.danger ? 'var(--danger)' : 'var(--text-body)' }}
          >
            <i className={`bi bi-${item.icon}`} style={{ fontSize: '0.85rem' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
