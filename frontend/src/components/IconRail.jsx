import { useState } from 'react';
import Avatar from './ui/Avatar.jsx';

const RAIL_ITEMS = [
  { key: 'home', label: 'ホーム', icon: 'bi bi-house' },
  { key: 'library', label: '検索', icon: 'bi bi-search' },
  { key: 'organize', label: '整理', icon: 'bi bi-tags' },
  { key: 'favorites', label: 'お気に入り', icon: 'bi bi-star-fill' },
];

export default function IconRail({ activeKey, onNavigate, onNewArticle, isOwner, currentUser, onLogout }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div style={{
      width: 76, flexShrink: 0, background: 'var(--sidebar-ink)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '1.1rem 0.5rem', gap: '0.3rem', boxShadow: 'var(--shadow-sidebar)', position: 'relative',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
        <i className="bi bi-journal-bookmark-fill" style={{ color: '#fff', fontSize: '1.1rem' }} />
      </div>

      {RAIL_ITEMS.map((item) => (
        <button key={item.key} className={`kv-rail-btn${activeKey === item.key ? ' active' : ''}`} onClick={() => onNavigate(item.key)}>
          <i className={item.icon} style={{ fontSize: '1.15rem' }} />
          <span style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.02em' }}>{item.label}</span>
        </button>
      ))}

      <div style={{ flex: 1 }} />

      <button className={`kv-rail-btn${activeKey === 'settings' ? ' active' : ''}`} onClick={() => onNavigate('settings')} style={{ marginBottom: '0.4rem' }}>
        <i className="bi bi-gear" style={{ fontSize: '1.15rem' }} />
        <span style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.02em' }}>設定</span>
      </button>

      {isOwner && (
        <div
          onClick={onNewArticle}
          className="kv-strip-card"
          style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-md)', marginBottom: '0.9rem' }}
        >
          <i className="bi bi-plus-lg" style={{ color: '#fff', fontSize: '1.2rem' }} />
        </div>
      )}

      <div onClick={() => setUserMenuOpen((v) => !v)} style={{ cursor: 'pointer' }}>
        <Avatar name={currentUser?.displayName || '自分'} size={32} />
      </div>

      {userMenuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', bottom: '0.5rem', left: '100%', marginLeft: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: '0.7rem', zIndex: 50, width: 200 }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-strong)' }}>{currentUser?.displayName}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.email}</div>
          <a
            href="https://nishi-25.github.io/knowledge-tool/manual.html"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setUserMenuOpen(false)}
            className="kv-list-row"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', borderRadius: 8, cursor: 'pointer', color: 'var(--text-body)', textDecoration: 'none' }}
          >
            <i className="bi bi-book" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>取り扱い説明書</span>
          </a>
          <div
            onClick={() => { setUserMenuOpen(false); onLogout(); }}
            className="kv-list-row"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', borderRadius: 8, cursor: 'pointer', color: 'var(--danger)' }}
          >
            <i className="bi bi-box-arrow-right" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>ログアウト</span>
          </div>
        </div>
      )}
    </div>
  );
}
