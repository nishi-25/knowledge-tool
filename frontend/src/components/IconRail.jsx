import { useState } from 'react';
import Avatar from './ui/Avatar.jsx';

const RAIL_ITEMS = [
  { key: 'home', label: 'ホーム', icon: 'bi bi-house' },
  { key: 'library', label: '記事', icon: 'bi bi-journal-text' },
  { key: 'organize', label: '区分管理', icon: 'bi bi-tags' },
];

export default function IconRail({ activeKey, onNavigate, onNewArticle, onNewFolder, onNewTag, isOwner, currentUser, onLogout }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

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

      <a
        href="https://nishi-25.github.io/knowledge-tool/manual.html"
        target="_blank"
        rel="noopener noreferrer"
        className="kv-rail-btn"
        style={{ textDecoration: 'none' }}
      >
        <i className="bi bi-question-circle" style={{ fontSize: '1.15rem' }} />
        <span style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.02em' }}>ヘルプ</span>
      </a>

      <div style={{ flex: 1 }} />

      <button className={`kv-rail-btn${activeKey === 'settings' ? ' active' : ''}`} onClick={() => onNavigate('settings')} style={{ marginBottom: '0.4rem' }}>
        <i className="bi bi-gear" style={{ fontSize: '1.15rem' }} />
        <span style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.02em' }}>設定</span>
      </button>

      {isOwner && (
        <div style={{ position: 'relative', marginBottom: '0.9rem' }}>
          <div
            onClick={() => setCreateMenuOpen((v) => !v)}
            className="kv-strip-card"
            style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}
          >
            <i className="bi bi-plus-lg" style={{ color: '#fff', fontSize: '1.2rem' }} />
          </div>
          {createMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'absolute', bottom: 0, left: '100%', marginLeft: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: '0.35rem', zIndex: 50, width: 180 }}
            >
              <div onClick={() => { setCreateMenuOpen(false); onNewArticle(); }} className="kv-list-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.6rem', borderRadius: 8, cursor: 'pointer' }}>
                <i className="bi bi-file-earmark-plus" style={{ fontSize: '0.9rem' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>新規記事</span>
              </div>
              <div onClick={() => { setCreateMenuOpen(false); onNewFolder(); }} className="kv-list-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.6rem', borderRadius: 8, cursor: 'pointer' }}>
                <i className="bi bi-folder-plus" style={{ fontSize: '0.9rem' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>新規フォルダ</span>
              </div>
              <div onClick={() => { setCreateMenuOpen(false); onNewTag(); }} className="kv-list-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.6rem', borderRadius: 8, cursor: 'pointer' }}>
                <i className="bi bi-tag" style={{ fontSize: '0.9rem' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>新規タグ</span>
              </div>
            </div>
          )}
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
