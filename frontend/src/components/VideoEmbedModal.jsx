import { useState } from 'react';
import Button from './ui/Button.jsx';
import Input from './ui/Input.jsx';

const LARGE_FILE_WARNING_BYTES = 20 * 1024 * 1024; // 20MB

export function videoEmbedHtmlFromUrl(url) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) {
    return `<div style="position:relative;padding-top:56.25%;margin:0.8rem 0;"><iframe src="https://www.youtube.com/embed/${yt[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:10px;" allowfullscreen></iframe></div><p><br></p>`;
  }
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) {
    return `<div style="position:relative;padding-top:56.25%;margin:0.8rem 0;"><iframe src="https://player.vimeo.com/video/${vimeo[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:10px;" allowfullscreen></iframe></div><p><br></p>`;
  }
  return `<video controls src="${url}" style="max-width:100%;border-radius:10px;margin:0.8rem 0;"></video><p><br></p>`;
}

export default function VideoEmbedModal({ open, onClose, onSubmit }) {
  const [tab, setTab] = useState('url');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [warning, setWarning] = useState('');

  if (!open) return null;

  const close = () => { setUrl(''); setFile(null); setWarning(''); setTab('url'); onClose(); };

  const submitUrl = () => {
    if (!url.trim()) return;
    onSubmit(videoEmbedHtmlFromUrl(url.trim()));
    close();
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setWarning(f.size > LARGE_FILE_WARNING_BYTES ? `ファイルサイズが大きいです（${(f.size / 1024 / 1024).toFixed(1)}MB）。保存容量を圧迫する可能性があります。` : '');
  };

  const submitFile = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onSubmit(`<video controls src="${reader.result}" style="max-width:100%;border-radius:10px;margin:0.8rem 0;"></video><p><br></p>`);
      close();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, maxWidth: '92vw', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)' }}>動画を挿入</div>
          <div style={{ flex: 1 }} />
          <div onClick={close} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}><i className="bi bi-x-lg" /></div>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', padding: '0.8rem 1.1rem 0' }}>
          <span onClick={() => setTab('url')} className={`kv-chip${tab === 'url' ? ' on' : ''}`} style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.35em 0.9em', borderRadius: 999 }}>URLで埋め込み</span>
          <span onClick={() => setTab('file')} className={`kv-chip${tab === 'file' ? ' on' : ''}`} style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.35em 0.9em', borderRadius: 999 }}>ファイルをアップロード</span>
        </div>

        <div style={{ padding: '1.1rem' }}>
          {tab === 'url' ? (
            <>
              <Input placeholder="YouTube / Vimeo / mp4 の URL" value={url} onChange={setUrl} height={40} style={{ marginBottom: '0.6rem' }} />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>YouTube・Vimeoのリンクはプレイヤー埋め込みに、それ以外は直接の動画URLとして埋め込みます。</div>
              <Button variant="primary" block icon="check2" onClick={submitUrl} disabled={!url.trim()}>挿入する</Button>
            </>
          ) : (
            <>
              <input type="file" accept="video/*" onChange={handleFileChange} style={{ marginBottom: '0.6rem', fontSize: '0.85rem' }} />
              {warning && <div style={{ fontSize: '0.74rem', color: 'var(--warn-color)', marginBottom: '0.8rem' }}>{warning}</div>}
              <Button variant="primary" block icon="check2" onClick={submitFile} disabled={!file}>挿入する</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
