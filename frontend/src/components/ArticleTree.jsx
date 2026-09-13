import { useEffect, useState } from 'react';
import { fmtDate } from '../utils.js';
import ContextMenu from './ui/ContextMenu.jsx';

export default function ArticleTree({
  articles, folders, activeFolder, selectedId, onSelectArticle, isOwner,
  onNewFolder, onNewSubfolder, onRenameFolder, onDeleteFolder, onNewArticle, onDeleteArticle, onShowFavorites,
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

  const noFolderArticles = articles.filter((a) => !a.folder);
  const countFor = (folderId) => articles.filter((a) => a.folder === folderId).length;
  const childFoldersOf = (parentId) => folders.filter((f) => (f.parent || null) === parentId);

  const openFolderMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { icon: 'folder-plus', label: 'サブフォルダを作成', onClick: () => onNewSubfolder(folder) },
        { icon: 'pencil', label: '名前を変更', onClick: () => onRenameFolder(folder) },
        { icon: 'trash', label: '削除', danger: true, onClick: () => {
          if (window.confirm(`「${folder.label}」を削除しますか？中の記事・サブフォルダは上の階層に移動します。`)) onDeleteFolder(folder.id);
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

  const ArticleRow = ({ a, depth = 0 }) => (
    <div
      key={a.id}
      onClick={() => onSelectArticle(a.id)}
      onContextMenu={isOwner ? (e) => openArticleMenu(e, a) : undefined}
      className={`kv-list-row${a.id === selectedId ? ' active' : ''}`}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.8rem 0.45rem', paddingLeft: 32 + depth * 16, cursor: 'pointer' }}
    >
      <i className={`bi bi-${a.favorite ? 'star-fill' : 'file-earmark-text'}`} style={{ fontSize: '0.72rem', color: a.favorite ? '#f59e0b' : 'var(--text-muted)', flexShrink: 0 }} />
      <span className="kv-line-clamp-1" style={{ flex: 1, fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-body)' }}>{a.title}</span>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>{fmtDate(a.updated)}</span>
    </div>
  );

  const FolderNode = ({ folder, depth = 0 }) => {
    const children = childFoldersOf(folder.id);
    const isExpanded = expanded.has(folder.id);
    const directArticles = articles.filter((a) => a.folder === folder.id);
    return (
      <div key={folder.id}>
        <div
          onClick={() => toggle(folder.id)}
          onContextMenu={isOwner ? (e) => openFolderMenu(e, folder) : undefined}
          className="kv-list-row"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.2rem', paddingLeft: `calc(1.2rem + ${depth * 16}px)`, cursor: 'pointer' }}
        >
          <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'}`} style={{ fontSize: '0.68rem', color: 'var(--text-muted)', width: 12 }} />
          <i className={folder.icon} style={{ color: folder.color, fontSize: '0.85rem' }} />
          <span style={{ flex: 1, fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-strong)' }}>{folder.label}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{countFor(folder.id)}</span>
        </div>
        {isExpanded && (
          <>
            {children.map((child) => <FolderNode key={child.id} folder={child} depth={depth + 1} />)}
            {directArticles.map((a) => <ArticleRow key={a.id} a={a} depth={depth} />)}
            {children.length === 0 && directArticles.length === 0 && (
              <div style={{ padding: '0.3rem 1.2rem 0.6rem', paddingLeft: 32 + depth * 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>記事がありません</div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.4rem 1.2rem 0.6rem' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>フォルダ</span>
        <div
          onClick={onShowFavorites}
          title="お気に入りを表示"
          style={{ marginLeft: 'auto', cursor: 'pointer', color: '#f59e0b', padding: '0.1rem 0.3rem', display: 'flex', alignItems: 'center' }}
        >
          <i className="bi bi-star-fill" />
        </div>
        {isOwner && (
          <div style={{ position: 'relative' }}>
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

      {/* 実フォルダ（親を持たないものをルートとして、再帰的に描画） */}
      {childFoldersOf(null).map((f) => <FolderNode key={f.id} folder={f} depth={0} />)}

      {/* フォルダなし（擬似フォルダ）: 未分類の記事があるときだけ表示する */}
      {noFolderArticles.length > 0 && (
        <div>
          <div onClick={() => toggle('no-folder')} className="kv-list-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.2rem', cursor: 'pointer' }}>
            <i className={`bi bi-chevron-${expanded.has('no-folder') ? 'down' : 'right'}`} style={{ fontSize: '0.68rem', color: 'var(--text-muted)', width: 12 }} />
            <i className="bi bi-folder" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }} />
            <span style={{ flex: 1, fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-strong)' }}>フォルダなし</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{noFolderArticles.length}</span>
          </div>
          {expanded.has('no-folder') && noFolderArticles.map((a) => <ArticleRow key={a.id} a={a} />)}
        </div>
      )}

      {contextMenu && <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />}
    </div>
  );
}
