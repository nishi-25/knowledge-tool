import { useEffect, useState } from 'react';
import Button from './ui/Button.jsx';

export default function TextEmbedModal({ open, title, placeholder, toHtml, onClose, onSubmit }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (open) setText('');
  }, [open]);

  if (!open) return null;

  let html = '';
  let error = '';
  try {
    html = text.trim() ? toHtml(text) : '';
  } catch (e) {
    error = '変換できませんでした';
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 920, maxWidth: '94vw', height: 560, maxHeight: '88vh', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)' }}>{title}</div>
          <div style={{ flex: 1 }} />
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}><i className="bi bi-x-lg" /></div>
        </div>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            style={{ flex: 1, boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', padding: '1rem', fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: '0.82rem', lineHeight: 1.6, borderRight: '1px solid var(--border)', color: 'var(--text-body)', background: 'var(--slate-50)' }}
          />
          <div className="kv-richtext" style={{ flex: 1, overflow: 'auto', padding: '1rem 1.2rem', background: 'var(--app-bg)' }}>
            {error ? (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>
            ) : html ? (
              <div dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>プレビューがここに表示されます</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', padding: '0.9rem 1.1rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <Button variant="ghost" onClick={onClose}>キャンセル</Button>
          <Button variant="primary" icon="check2" onClick={() => onSubmit(html)} disabled={!!error || !html}>挿入する</Button>
        </div>
      </div>
    </div>
  );
}
