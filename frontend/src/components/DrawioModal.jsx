import { useEffect, useRef, useState } from 'react';
import Button from './ui/Button.jsx';

const DRAWIO_ORIGIN = 'https://embed.diagrams.net';
const DRAWIO_SRC = `${DRAWIO_ORIGIN}/?embed=1&proto=json&spin=1&ui=min&noSaveBtn=1&noExitBtn=1&libraries=1`;

function base64ToUtf8(base64) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

// draw.ioが書き出すSVGには、後から再編集できるように元の図面データ（mxfile XML）が
// ルートsvg要素のcontent属性にそのまま埋め込まれている。挿入済みの図を「編集」で
// 開き直すときは、保存したdata URLからこのXMLを取り出してエディタに読み込ませる。
export function extractDrawioXml(dataUrl) {
  try {
    const base64 = dataUrl.split(',')[1];
    const svgText = base64ToUtf8(base64);
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    return doc.documentElement.getAttribute('content') || '';
  } catch {
    return '';
  }
}

export default function DrawioModal({ open, initialXml, onClose, onSubmit }) {
  const iframeRef = useRef(null);
  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) {
      readyRef.current = false;
      setReady(false);
      setExporting(false);
      return undefined;
    }

    const handleMessage = (event) => {
      if (event.origin !== DRAWIO_ORIGIN) return;
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.event === 'init') {
        readyRef.current = true;
        setReady(true);
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ action: 'load', xml: initialXml || '', autosave: 1 }),
          DRAWIO_ORIGIN
        );
      } else if (msg.event === 'export') {
        setExporting(false);
        if (msg.data) onSubmit(msg.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const requestExport = () => {
    if (!readyRef.current) return;
    setExporting(true);
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ action: 'export', format: 'xmlsvg' }),
      DRAWIO_ORIGIN
    );
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 1100, maxWidth: '96vw', height: 720, maxHeight: '92vh', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)' }}>フリー図形を作成（draw.io）</div>
          <div style={{ flex: 1 }} />
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}><i className="bi bi-x-lg" /></div>
        </div>
        <div style={{ flex: 1, position: 'relative', background: 'var(--slate-50)' }}>
          {!ready && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              読み込み中...
            </div>
          )}
          <iframe
            ref={iframeRef}
            title="draw.io"
            src={DRAWIO_SRC}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', padding: '0.9rem 1.1rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <Button variant="ghost" onClick={onClose}>キャンセル</Button>
          <Button variant="primary" icon="check2" onClick={requestExport} disabled={!ready || exporting}>
            {exporting ? '挿入中...' : '挿入する'}
          </Button>
        </div>
      </div>
    </div>
  );
}
