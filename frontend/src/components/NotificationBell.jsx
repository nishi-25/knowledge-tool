import { useEffect, useState } from 'react';
import { api } from '../api.js';

function fmtRelative(iso) {
  const diffMin = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${Math.floor(diffMin)}分前`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}時間前`;
  return `${Math.floor(diffMin / 1440)}日前`;
}

export default function NotificationBell({ onOpenArticle }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const refreshUnread = () => api.getUnreadNotificationCount().then((r) => setUnreadCount(r.count)).catch(() => {});

  useEffect(() => {
    refreshUnread();
    const timer = setInterval(refreshUnread, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      const list = await api.listNotifications();
      setItems(list);
      setLoaded(true);
    }
  };

  const handleClick = async (n) => {
    if (!n.read) {
      await api.markNotificationRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      refreshUnread();
    }
    if (n.link?.articleId) {
      onOpenArticle?.(n.link.articleId);
      setOpen(false);
    }
  };

  const markAllRead = async (e) => {
    e.stopPropagation();
    await api.markAllNotificationsRead();
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button className="kv-rail-btn" onClick={toggle} style={{ position: 'relative' }}>
        <i className="bi bi-bell" style={{ fontSize: '1.15rem' }} />
        <span style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.02em' }}>通知</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 10, minWidth: 16, height: 16, borderRadius: 999,
            background: 'var(--danger)', color: '#fff', fontSize: '0.6rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', bottom: 0, left: '100%', marginLeft: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 60, width: 320, maxHeight: 420, overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', padding: '0.7rem 0.9rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-strong)' }}>通知</div>
            {unreadCount > 0 && (
              <div onClick={markAllRead} style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--primary-dark)', cursor: 'pointer', fontWeight: 600 }}>すべて既読にする</div>
            )}
          </div>
          {loaded && items.length === 0 && (
            <div style={{ padding: '1.4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>通知はありません</div>
          )}
          {items.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className="kv-list-row"
              style={{ padding: '0.7rem 0.9rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: n.read ? 'transparent' : 'var(--note-bg)' }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: n.read ? 600 : 700, color: 'var(--text-strong)', marginBottom: '0.2rem' }}>{n.title}</div>
              {n.body && <div className="kv-line-clamp-1" style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{n.body}</div>}
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{fmtRelative(n.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
