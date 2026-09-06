import { useState } from 'react';
import SearchBox from './ui/SearchBox.jsx';
import { fmtDate, folderMeta } from '../utils.js';

export default function Home({
  articles, folders, tags, onOpenArticle, onToggleTagFilter, onOpenFolder, onSearchAll,
}) {
  const [searchText, setSearchText] = useState('');
  const now = new Date();
  const recentCount = articles.filter((a) => (now - new Date(a.updated)) / 86400000 <= 7).length;

  const recentArticles = [...articles].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 4);
  const popularArticles = [...articles].sort((a, b) => b.views - a.views).slice(0, 4);

  const topTags = [...tags].filter((t) => t.count > 0).sort((a, b) => b.count - a.count).slice(0, 6);

  const q = searchText.trim().toLowerCase();
  const allMatches = q
    ? articles.filter((a) => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q))
    : [];
  const searchResults = allMatches.slice(0, 8);

  const openResult = (id) => { onOpenArticle(id); setSearchText(''); };
  const viewAll = () => { onSearchAll(searchText); setSearchText(''); };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 3rem 2rem' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.4rem' }}>ナレッジを探す</div>
        <div style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginBottom: '1.4rem' }}>たまった記事をキーワード・タグからすぐに見つけられます</div>

        <div style={{ position: 'relative', marginBottom: '2.2rem' }}>
          <SearchBox placeholder="キーワードを入力して記事を検索..." value={searchText} onChange={setSearchText} height={52} style={{ width: '100%', fontSize: '1rem' }} />
          {q && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', zIndex: 30, overflow: 'hidden' }}>
              {searchResults.length === 0 ? (
                <div style={{ padding: '1.4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <i className="bi bi-search" style={{ fontSize: '1.3rem', opacity: 0.4, display: 'block', marginBottom: '0.4rem' }} />
                  該当する記事がありません
                </div>
              ) : (
                <>
                  {searchResults.map((a) => {
                    const fm = folderMeta(folders, a.folder);
                    return (
                      <div key={a.id} onClick={() => openResult(a.id)} className="kv-list-row" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.7rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                        <i className={fm.icon} style={{ color: fm.color, fontSize: '0.85rem', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-strong)' }}>{a.title}</div>
                          <div className="kv-line-clamp-1" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{a.excerpt}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div onClick={viewAll} style={{ padding: '0.7rem 1rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-dark)', cursor: 'pointer' }}>
                    すべての結果を見る（{allMatches.length}件）
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2.2rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>よく使うタグ</span>
          {topTags.map((t) => (
            <span key={t.id} onClick={() => onToggleTagFilter(t.label)} className="kv-chip" style={{ fontSize: '0.78rem', fontWeight: 600, padding: '0.32em 0.8em', borderRadius: 999 }}>#{t.label}</span>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)' }}>最近のキャプチャ</div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>今週 {recentCount} 件更新</span>
        </div>
        <div style={{ display: 'flex', gap: '0.9rem', overflowX: 'auto', paddingBottom: '0.6rem', marginBottom: '2.2rem' }}>
          {recentArticles.map((a) => {
            const fm = folderMeta(folders, a.folder);
            return (
              <div key={a.id} onClick={() => onOpenArticle(a.id)} className="kv-strip-card" style={{ flex: '0 0 240px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.1rem 1.2rem', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                  <i className={fm.icon} style={{ color: fm.color, fontSize: '0.85rem' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: fm.color }}>{fm.label}</span>
                </div>
                <div className="kv-line-clamp-2" style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.4, marginBottom: '0.5rem' }}>{a.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtDate(a.updated)} 更新</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.6rem' }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.7rem' }}>よく参照される記事</div>
            {popularArticles.map((a, i) => (
              <div key={a.id} onClick={() => onOpenArticle(a.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                <div style={{ width: 24, fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{a.views}回</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.7rem' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)' }}>構成</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {folders.map((f) => (
                <div key={f.id} onClick={() => onOpenFolder(f.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', cursor: 'pointer' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: f.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={f.icon} style={{ color: f.color, fontSize: '0.8rem' }} />
                  </div>
                  <div style={{ flex: 1, fontSize: '0.84rem', fontWeight: 600 }}>{f.label}</div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>{f.count}件</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
