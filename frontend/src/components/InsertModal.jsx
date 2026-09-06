import { useMemo, useState } from 'react';
import SearchBox from './ui/SearchBox.jsx';

export default function InsertModal({ open, onClose, categories }) {
  const [activeKey, setActiveKey] = useState(categories[0]?.key);
  const [search, setSearch] = useState('');

  const allItems = useMemo(
    () => categories.flatMap((c) => c.items.map((it) => ({ ...it, catLabel: c.label }))),
    [categories]
  );

  if (!open) return null;

  const q = search.trim().toLowerCase();
  const activeCategory = categories.find((c) => c.key === activeKey) || categories[0];
  const visibleItems = q ? allItems.filter((it) => it.label.toLowerCase().includes(q)) : activeCategory?.items || [];

  const close = () => { setSearch(''); onClose(); };

  return (
    <div
      onClick={close}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 640, maxWidth: '92vw', height: 460, maxHeight: '80vh', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.9rem 1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <SearchBox placeholder="機能を検索..." value={search} onChange={setSearch} height={38} style={{ flex: 1 }} />
          <div onClick={close} style={{ cursor: 'pointer', color: 'var(--text-muted)', padding: '0.3rem' }}><i className="bi bi-x-lg" /></div>
        </div>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: 160, flexShrink: 0, borderRight: '1px solid var(--border)', padding: '0.6rem', overflowY: 'auto', background: 'var(--slate-50)' }}>
            {categories.map((c) => {
              const active = !q && activeKey === c.key;
              return (
                <div
                  key={c.key}
                  onClick={() => { setActiveKey(c.key); setSearch(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.6rem', borderRadius: 8, cursor: 'pointer',
                    background: active ? 'var(--note-bg)' : 'transparent',
                    color: active ? 'var(--primary-dark)' : 'var(--text-body)',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  <i className={c.icon} style={{ fontSize: '0.9rem' }} />
                  <span style={{ fontSize: '0.85rem' }}>{c.label}</span>
                </div>
              );
            })}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.9rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', alignContent: 'start' }}>
            {visibleItems.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '2rem 0' }}>該当する機能がありません</div>
            )}
            {visibleItems.map((it) => (
              <button key={it.key} onClick={() => { it.run(); close(); }} className="kv-modal-card">
                <i className={it.icon} style={{ color: it.color || 'var(--primary-dark)' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-strong)' }}>{it.label}</div>
                  {q && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{it.catLabel}</div>}
                  {it.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{it.description}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
