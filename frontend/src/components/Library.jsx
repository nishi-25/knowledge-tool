import { useEffect, useRef } from 'react';
import SearchBox from './ui/SearchBox.jsx';
import Button from './ui/Button.jsx';
import CommentThread from './CommentThread.jsx';
import ArticleTree from './ArticleTree.jsx';
import { fmtDate, folderMeta } from '../utils.js';
import { renderMermaidIn } from '../mermaidUtils.js';
import { sanitizeArticleHtml } from '../sanitizeHtml.js';

export default function Library({
  query, onQueryChange, activeTag, onClearTag, folders, articles,
  filteredArticles, selectedId, onSelectArticle, current, relatedArticles,
  onToggleFavorite, onEditCurrent, onOpenArticle, isOwner, currentUser,
  activeFolder, onNewFolder, onRenameFolder, onDeleteFolder, onNewArticle, onDeleteArticle,
}) {
  const bodyRef = useRef(null);
  useEffect(() => {
    renderMermaidIn(bodyRef.current);
  }, [current?.id, current?.bodyHtml]);

  const showFlatList = Boolean(query.trim()) || Boolean(activeTag);

  return (
    <>
      <div className="kv-article-list-panel" style={{ width: 380, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1.2rem 1.2rem 0.8rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.7rem' }}>記事</div>
          <SearchBox placeholder="記事を検索..." value={query} onChange={onQueryChange} height={36} style={{ width: '100%' }} />
          {activeTag && (
            <div style={{ marginTop: '0.7rem' }}>
              <span className="kv-chip on" style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.28em 0.65em', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}>
                #{activeTag}
                <i className="bi bi-x" onClick={onClearTag} style={{ cursor: 'pointer' }} />
              </span>
            </div>
          )}
        </div>
        {showFlatList ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredArticles.map((a) => {
              const fm = folderMeta(folders, a.folder);
              return (
                <div key={a.id} onClick={() => onSelectArticle(a.id)} className={`kv-list-row${a.id === selectedId ? ' active' : ''}`} style={{ padding: '0.85rem 1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <i className={fm.icon} style={{ color: fm.color, fontSize: '0.78rem' }} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: fm.color }}>{fm.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-muted)' }}>{fmtDate(a.updated)}</span>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.4, marginBottom: '0.3rem' }}>{a.title}</div>
                  <div className="kv-line-clamp-1" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.excerpt}</div>
                </div>
              );
            })}
            {filteredArticles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                <i className="bi bi-search" style={{ fontSize: '1.6rem', opacity: 0.4 }} />
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>該当する記事がありません</div>
              </div>
            )}
          </div>
        ) : (
          <ArticleTree
            articles={articles}
            folders={folders}
            activeFolder={activeFolder}
            selectedId={selectedId}
            onSelectArticle={onSelectArticle}
            isOwner={isOwner}
            onNewFolder={onNewFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            onNewArticle={onNewArticle}
            onDeleteArticle={onDeleteArticle}
          />
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '2.4rem 3rem' }}>
        {current ? (
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: current.folderMeta.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                <i className={current.folderMeta.icon} style={{ marginRight: 4 }} />{current.folderMeta.label}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtDate(current.updated)} 更新 ・ 閲覧数 {current.views}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                <Button size="sm" variant="ghost" icon={current.favorite ? 'star-fill' : 'star'} onClick={() => onToggleFavorite(current.id)}>
                  {current.favorite ? 'お気に入り済み' : 'お気に入り'}
                </Button>
                {isOwner && <Button size="sm" variant="outline" icon="pencil" onClick={onEditCurrent}>編集</Button>}
                {isOwner && (
                  <Button
                    size="sm" variant="ghost" icon="trash"
                    onClick={() => { if (window.confirm(`「${current.title}」を削除しますか？元に戻せません。`)) onDeleteArticle(current.id); }}
                    style={{ color: 'var(--danger)' }}
                  >
                    削除
                  </Button>
                )}
              </div>
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.35, marginBottom: '0.9rem' }}>{current.title}</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.6rem' }}>
              {current.tags.map((t) => (
                <span key={t} style={{ fontSize: '0.72rem', padding: '0.25em 0.7em', borderRadius: 999, background: 'var(--slate-100)', color: 'var(--text-muted)' }}>#{t}</span>
              ))}
            </div>
            <div ref={bodyRef} className="kv-richtext kv-readonly" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(current.bodyHtml) }} />

            <div style={{ marginTop: '2rem', paddingTop: '1.4rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.7rem' }}>関連記事</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {relatedArticles.map((a) => {
                  const fm = folderMeta(folders, a.folder);
                  return (
                    <div key={a.id} onClick={() => onOpenArticle(a.id)} className="kv-list-row" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.7rem', borderRadius: 8, cursor: 'pointer' }}>
                      <i className={fm.icon} style={{ color: fm.color, fontSize: '0.8rem' }} />
                      <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{a.title}</span>
                    </div>
                  );
                })}
                {relatedArticles.length === 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>関連する記事はまだありません</div>
                )}
              </div>
            </div>

            <CommentThread key={current.id} articleId={current.id} currentUser={currentUser} isOwner={isOwner} />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted)' }}>
            <i className="bi bi-journal-text" style={{ fontSize: '2rem', opacity: 0.4 }} />
            <div style={{ marginTop: '0.6rem', fontSize: '0.9rem' }}>左のリストから記事を選択してください</div>
          </div>
        )}
      </div>
    </>
  );
}
