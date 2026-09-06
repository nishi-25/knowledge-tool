import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Button from './ui/Button.jsx';

function fmtDateTime(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function CommentThread({ articleId, currentUser, isOwner }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  // Guards against the mount-time fetch resolving *after* a post/delete has already
  // updated state (e.g. GET is in flight when the user posts) and clobbering it with stale data.
  const seqRef = useRef(0);

  const reload = async () => {
    const seq = ++seqRef.current;
    const list = await api.getComments(articleId);
    if (seq === seqRef.current) {
      setComments(list);
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const submit = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      await api.addComment(articleId, text.trim());
      setText('');
      await reload();
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id) => {
    await api.deleteComment(id);
    await reload();
  };

  return (
    <div style={{ marginTop: '2rem', paddingTop: '1.4rem', borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.9rem' }}>
        <i className="bi bi-chat-left-text" style={{ marginRight: 5 }} />コメント {comments.length > 0 && `（${comments.length}）`}
      </div>

      {!loading && comments.length === 0 && (
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>まだコメントはありません</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1rem' }}>
        {comments.map((c) => (
          <div key={c.id} style={{ display: 'flex', gap: '0.7rem', padding: '0.8rem 0.9rem', borderRadius: 10, background: 'var(--slate-50)', border: '1px solid var(--border)' }}>
            <div className="kv-avatar" style={{ width: 28, height: 28, fontSize: 12, flexShrink: 0 }}>{c.author.slice(0, 1)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-strong)' }}>{c.author}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{fmtDateTime(c.createdAt)}</span>
                {(isOwner || c.authorId === currentUser?.id) && (
                  <div onClick={() => remove(c.id)} style={{ marginLeft: 'auto', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem' }} title="削除">
                    <i className="bi bi-x-lg" />
                  </div>
                )}
              </div>
              <div style={{ fontSize: '0.86rem', color: 'var(--text-body)', lineHeight: 1.6, marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{c.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="コメントを入力..."
          rows={2}
          style={{ flex: 1, boxSizing: 'border-box', resize: 'vertical', padding: '0.6rem 0.8rem', border: '1.5px solid var(--border)', borderRadius: 10, fontFamily: 'var(--font-sans)', fontSize: '0.85rem', outline: 'none' }}
        />
        <Button variant="primary" size="sm" icon="send" onClick={submit} disabled={!text.trim() || posting}>投稿</Button>
      </div>
    </div>
  );
}
