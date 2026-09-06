import { useEffect, useRef, useState } from 'react';
import Button from './ui/Button.jsx';
import { renderMermaidPreview } from '../mermaidUtils.js';

const TEMPLATES = [
  {
    key: 'flowchart', label: 'フローチャート', icon: 'bi-diagram-2',
    source: 'flowchart TD\n    A[開始] --> B{条件}\n    B -->|Yes| C[処理A]\n    B -->|No| D[処理B]\n    C --> E[終了]\n    D --> E\n',
  },
  {
    key: 'sequence', label: 'シーケンス図', icon: 'bi-arrow-left-right',
    source: 'sequenceDiagram\n    participant ユーザー\n    participant システム\n    ユーザー->>システム: リクエスト送信\n    システム-->>ユーザー: レスポンス返却\n',
  },
  {
    key: 'class', label: 'クラス図', icon: 'bi-diagram-3',
    source: 'classDiagram\n    class 注文 {\n      +String id\n      +Date orderedAt\n      +submit()\n    }\n    class 顧客 {\n      +String name\n    }\n    顧客 "1" --> "*" 注文 : 発注する\n',
  },
  {
    key: 'state', label: 'ステート図', icon: 'bi-diagram-2-fill',
    source: 'stateDiagram-v2\n    [*] --> 未着手\n    未着手 --> 進行中\n    進行中 --> 完了\n    完了 --> [*]\n',
  },
  {
    key: 'er', label: 'ER図', icon: 'bi-table',
    source: 'erDiagram\n    顧客 ||--o{ 注文 : 発注する\n    注文 ||--|{ 明細 : 含む\n',
  },
  {
    key: 'gantt', label: 'ガントチャート', icon: 'bi-bar-chart-steps',
    source: 'gantt\n    title プロジェクト計画\n    dateFormat  YYYY-MM-DD\n    section 設計\n    要件定義       :a1, 2026-09-01, 5d\n    設計          :a2, after a1, 7d\n    section 開発\n    実装          :a3, after a2, 10d\n    テスト         :a4, after a3, 5d\n',
  },
];

export default function DiagramModal({ open, initialSource, onClose, onSubmit }) {
  const [source, setSource] = useState('');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [editingLabel, setEditingLabel] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const debounceRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => {
    if (open) setSource(initialSource || TEMPLATES[0].source);
  }, [open, initialSource]);

  useEffect(() => {
    if (!open || !source.trim()) return undefined;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const rendered = await renderMermaidPreview(source);
        setSvg(rendered);
        setError('');
      } catch (e) {
        setError('図の構文にエラーがあります');
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [source, open]);

  if (!open) return null;

  // 図中のラベルをクリックすると、その場でテキスト編集ができ、確定するとMermaidのソース
  // コード側にも即座に反映される（コードでも図でもどちらからでも編集可能にするため）。
  const handlePreviewClick = (e) => {
    if (editingLabel) return;
    const labelHost = e.target.closest('.nodeLabel, .edgeLabel, tspan, text');
    if (!labelHost) return;
    const text = (labelHost.textContent || '').trim();
    if (!text || !source.includes(text)) return;
    const containerEl = previewRef.current;
    const containerRect = containerEl.getBoundingClientRect();
    const hostRect = labelHost.getBoundingClientRect();
    setEditingLabel({
      oldText: text,
      top: hostRect.top - containerRect.top + containerEl.scrollTop,
      left: hostRect.left - containerRect.left + containerEl.scrollLeft,
      width: Math.max(hostRect.width + 12, 70),
      height: Math.max(hostRect.height + 4, 22),
    });
    setEditingValue(text);
  };

  const commitLabelEdit = () => {
    if (editingLabel) {
      const newText = editingValue.trim();
      if (newText && newText !== editingLabel.oldText) {
        const idx = source.indexOf(editingLabel.oldText);
        if (idx !== -1) {
          setSource(source.slice(0, idx) + newText + source.slice(idx + editingLabel.oldText.length));
        }
      }
    }
    setEditingLabel(null);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 980, maxWidth: '94vw', height: 620, maxHeight: '90vh', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)' }}>図を作成</div>
          <div style={{ flex: 1 }} />
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}><i className="bi bi-x-lg" /></div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.7rem 1.1rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0 }}>
          {TEMPLATES.map((t) => (
            <Button key={t.key} variant="outline" size="sm" onClick={() => setSource(t.source)}>
              <i className={`bi ${t.icon}`} style={{ marginRight: 5 }} />{t.label}
            </Button>
          ))}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0.5rem 1.1rem 0', flexShrink: 0 }}>
          <i className="bi bi-info-circle" style={{ marginRight: 4 }} />右側の図のテキストをクリックすると直接編集でき、左側のコードにも自動的に反映されます。
        </div>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            style={{ flex: 1, boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', padding: '1rem', fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: '0.82rem', lineHeight: 1.6, borderRight: '1px solid var(--border)', color: 'var(--text-body)', background: 'var(--slate-50)' }}
          />
          <div
            ref={previewRef}
            onClick={handlePreviewClick}
            style={{ flex: 1, overflow: 'auto', padding: '1rem', position: 'relative', background: 'var(--app-bg)' }}
          >
            {error ? (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>
            ) : (
              <div className="kv-diagram-preview" style={{ display: 'flex', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: svg }} />
            )}
            {editingLabel && (
              <input
                autoFocus
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={commitLabelEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitLabelEdit(); }
                  if (e.key === 'Escape') setEditingLabel(null);
                }}
                style={{
                  position: 'absolute', top: editingLabel.top, left: editingLabel.left,
                  minWidth: editingLabel.width, height: editingLabel.height,
                  fontSize: '0.8rem', padding: '1px 4px', border: '2px solid var(--primary)', borderRadius: 4,
                  background: '#fff', color: '#1a1a2e', zIndex: 10, fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', padding: '0.9rem 1.1rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <Button variant="ghost" onClick={onClose}>キャンセル</Button>
          <Button variant="primary" icon="check2" onClick={() => onSubmit(source)} disabled={!!error || !source.trim()}>挿入する</Button>
        </div>
      </div>
    </div>
  );
}
