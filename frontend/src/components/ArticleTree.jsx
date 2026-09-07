import { useEffect, useState } from 'react';
import { fmtDate } from '../utils.js';
import ContextMenu from './ui/ContextMenu.jsx';

export default function ArticleTree({
  articles, folders, activeFolder, selectedId, onSelectArticle, isOwner,
  onNewFolder, onRenameFolder, onDeleteFolder, onNewArticle, onDeleteArticle,
}) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [contextMenu, setContextMenu] = useState(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  useEffect(() => {
    if (activeFolder) setExpanded((prev) => new Set(prev).add(activeFolder));
  }, [activeFolder]);

  const toggle = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const favoriteArticles = articles.filter((a) => a.favorite);
  const noFolderArticles = articles.filter((a) => !a.folder);
  const countFor = (folderId) => articles.filter((a) => a.folder === folderId).length;

  const openFolderMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { icon: 'pencil', label: '名前を変更', onClick: () => onRenameFolder(folder) },
        { icon: 'trash', label: '削除', danger: true, onClick: () => {
          if (window.confirm(`「${folder.label}」を削除しますか？中の記事は「フォルダなし」に移動します。`)) onDeleteFolder(folder.id);
        } },
      ],
    });
  };

  const openArticleMenu = (e, article) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { icon: 'trash', label: '削除', danger: true, onClick: () => {
          if (window.confirm(`「${article.title}」を削除しますか？元に戻せません。`)) onDeleteArticle(article.id);
        } },
      ],
    });
  };

  const ArticleRow = ({ a, indent = 32 }) => (
    <div
      key={a.id}
      onClick={() => onSelectArticle(a.id)}
      onContextMenu={isOwner ? (e) => openArticleMenu(e, a) : undefined}
      className={`kv-list-row${a.id === selectedId ? ' active' : ''}`}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.8rem 0.45rem', paddingLeft: indent, cursor: 'pointer' }}
    >
      <i className={`bi bi-${a.favorite ? 'star-fill' : 'file-earmark-text'}`} style={{ fontSize: '0.72rem', color: a.favorite ? '#f59e0b' : 'var(--text-muted)', flexShrink: 0 }} />
      <span className="kv-line-clamp-1" style={{ flex: 1, fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-body)' }}>{a.title}</span>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>{fmtDate(a.updated)}</span>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.4rem 1.2rem 0.6rem' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>フォルダ</span>
        {isOwner && (
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <div onClick={() => setPlusMenuOpen((v) => !v)} style={{ cursor: 'pointer', color: 'var(--primary-dark)', padding: '0.1rem 0.3rem' }}>
              <i className="bi bi-plus-lg" />
            </div>
            {plusMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.3rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: '0.35rem', zIndex: 50, width: 160 }}
              >
                <div onClick={() => { setPlusMenuOpen(false); onNewArticle(); }} className="kv-list-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: 8, cursor: 'pointer' }}>
                  <i className="bi bi-file-earmark-plus" style={{ fontSize: '0.85rem' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>新規記事</span>
                </div>
                <div onClick={() => { setPlusMenuOpen(false); onNewFolder(); }} className="kv-list-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: 8, cursor: 'pointer' }}>
                  <i className="bi bi-folder-plus" style={{ fontSize: '0.85rem' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>新規フォルダ</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* お気に入り（擬似フォルダ） */}
      <div>
        <div onClick={() => toggle('favorites')} className="kv-list-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.2rem', cursor: 'pointer' }}>
          <i className={`bi bi-chevron-${expanded.has('favorites') ? 'down' : 'right'}`} style={{ fontSize: '0.68rem', color: 'var(--text-muted)', width: 12 }} />
          <i className="bi bi-star-fill" style={{ color: '#f59e0b', fontSize: '0.85rem' }} />
          <span style={{ flex: 1, fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-strong)' }}>お気に入り</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{favoriteArticles.length}</span>
        </div>
        {expanded.has('favorites') && (
          favoriteArticles.length > 0
            ? favoriteArticles.map((a) => <ArticleRow key={a.id} a={a} />)
            : <div style={{ padding: '0.3rem 1.2rem 0.6rem', paddingLeft: 32, fontSize: '0.78rem', color: 'var(--text-muted)' }}>お気に入りの記事はありません</div>
        )}
      </div>

      {/* 実フォルダ */}
      {folders.map((f) => (
        <div key={f.id}>
          <div
            onClick={() => toggle(f.id)}
            onContextMenu={isOwner ? (e) => openFolderMenu(e, f) : undefined}
            className="kv-list-row"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.2rem', cursor: 'pointer' }}
          >
            <i className={`bi bi-chevron-${expanded.has(f.id) ? 'down' : 'right'}`} style={{ fontSize: '0.68rem', color: 'var(--text-muted)', width: 12 }} />
            <i className={f.icon} style={{ color: f.color, fontSize: '0.85rem' }} />
            <span style={{ flex: 1, fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-strong)' }}>{f.label}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{countFor(f.id)}</span>
          </div>
          {expanded.has(f.id) && (
            countFor(f.id) > 0
              ? articles.filter((a) => a.folder === f.id).map((a) => <ArticleRow key={a.id} a={a} />)
              : <div style={{ padding: '0.3rem 1.2rem 0.6rem', paddingLeft: 32, fontSize: '0.78rem', color: 'var(--text-muted)' }}>記事がありません</div>
          )}
        </div>
      ))}

      {/* フォルダなし（擬似フォルダ） */}
      <div>
        <div onClick={() => toggle('no-folder')} className="kv-list-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.2rem', cursor: 'pointer' }}>
          <i className={`bi bi-chevron-${expanded.has('no-folder') ? 'down' : 'right'}`} style={{ fontSize: '0.68rem', color: 'var(--text-muted)', width: 12 }} />
          <i className="bi bi-folder" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }} />
          <span style={{ flex: 1, fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-strong)' }}>フォルダなし</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{noFolderArticles.length}</span>
        </div>
        {expanded.has('no-folder') && (
          noFolderArticles.length > 0
            ? noFolderArticles.map((a) => <ArticleRow key={a.id} a={a} />)
            : <div style={{ padding: '0.3rem 1.2rem 0.6rem', paddingLeft: 32, fontSize: '0.78rem', color: 'var(--text-muted)' }}>記事がありません</div>
        )}
      </div>

      {contextMenu && <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />}
    </div>
  );
}
