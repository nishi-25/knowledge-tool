import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import Button from './ui/Button.jsx';
import PillSelect from './ui/PillSelect.jsx';
import Input from './ui/Input.jsx';
import InsertModal from './InsertModal.jsx';
import DiagramModal from './DiagramModal.jsx';
import TextEmbedModal from './TextEmbedModal.jsx';
import VideoEmbedModal from './VideoEmbedModal.jsx';
import CalendarModal from './CalendarModal.jsx';
import { api } from '../api.js';
import { calloutMeta, calloutVariants, escapeHtmlAttr } from '../utils.js';
import { sanitizeArticleHtml } from '../sanitizeHtml.js';
import { renderMermaidIn, encodeMermaidSource, decodeMermaidSource } from '../mermaidUtils.js';

const COLOR_SWATCHES = [
  { color: '#1a1a2e', label: '標準' },
  { color: '#0284c7', label: '青' },
  { color: '#15803d', label: '緑' },
  { color: '#b45309', label: '橙' },
  { color: '#dc2626', label: '赤' },
  { color: '#7c3aed', label: '紫' },
];

const HEADING_OPTIONS = [
  { value: 'P', label: '本文' },
  { value: 'H1', label: '見出し1' },
  { value: 'H2', label: '見出し2' },
  { value: 'H3', label: '見出し3' },
];

const TABLE_HEADER_STYLE = 'text-align:left;padding:0.55rem 0.8rem;background:var(--slate-100);border:1px solid var(--border);font-weight:700;color:var(--text-strong);';
const TABLE_BODY_STYLE = 'padding:0.55rem 0.8rem;border:1px solid var(--border);color:var(--text-body);';

function calloutHtml(variant) {
  const m = calloutMeta(variant);
  return (
    `<div data-kv-block="callout" style="display:flex;gap:0.7rem;padding:0.9rem 1.1rem;border-radius:10px;background:${m.bg};border:1px solid ${m.border};margin:0.6rem 0;">` +
    `<i class="${m.icon}" contenteditable="false" style="color:${m.color};font-size:1rem;margin-top:2px;"></i>` +
    `<div style="flex:1;">` +
    `<div contenteditable="false" style="font-size:0.78rem;font-weight:700;color:${m.color};margin-bottom:0.3rem;user-select:none;">${m.label}</div>` +
    `<div style="font-size:0.9rem;line-height:1.7;color:var(--text-body);">内容を入力してください</div>` +
    `</div>` +
    `<span data-kv-remove contenteditable="false" title="削除" style="cursor:pointer;color:var(--text-muted);font-size:0.85rem;flex-shrink:0;"><i class="bi bi-x-lg"></i></span>` +
    `</div><p><br></p>`
  );
}

function tableHtml() {
  return (
    `<div data-kv-block="table" contenteditable="false" style="margin:0.8rem 0;">` +
    `<table style="width:100%;border-collapse:collapse;font-size:0.86rem;"><tbody>` +
    `<tr><th contenteditable="true" style="${TABLE_HEADER_STYLE}">見出し1</th><th contenteditable="true" style="${TABLE_HEADER_STYLE}">見出し2</th></tr>` +
    `<tr><td contenteditable="true" style="${TABLE_BODY_STYLE}"></td><td contenteditable="true" style="${TABLE_BODY_STYLE}"></td></tr>` +
    `</tbody></table>` +
    `<div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.4rem;">` +
    `<span data-kv-add-row contenteditable="false" style="font-size:0.72rem;color:var(--primary-dark);cursor:pointer;font-weight:600;">+ 行を追加</span>` +
    `<span data-kv-add-col contenteditable="false" style="font-size:0.72rem;color:var(--primary-dark);cursor:pointer;font-weight:600;">+ 列を追加</span>` +
    `<span data-kv-remove contenteditable="false" style="font-size:0.72rem;color:var(--text-muted);cursor:pointer;font-weight:600;margin-left:auto;"><i class="bi bi-x-lg"></i></span>` +
    `</div></div><p><br></p>`
  );
}

function diagramHtml(source) {
  const encoded = encodeMermaidSource(source);
  const escaped = source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return (
    `<div data-kv-block="diagram" data-kv-mermaid-src="${encoded}" contenteditable="false" style="margin:0.8rem 0; max-width:100%; box-sizing:border-box;">` +
    `<div class="mermaid" style="display:flex;justify-content:center;padding:1rem;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow-x:auto;max-width:100%;box-sizing:border-box;">${escaped}</div>` +
    `<div style="display:flex;align-items:center;gap:0.6rem;margin-top:0.4rem;">` +
    `<span data-kv-edit-diagram contenteditable="false" style="font-size:0.72rem;color:var(--primary-dark);cursor:pointer;font-weight:600;"><i class="bi bi-pencil" style="margin-right:3px;"></i>編集</span>` +
    `<span data-kv-remove contenteditable="false" style="font-size:0.72rem;color:var(--text-muted);cursor:pointer;font-weight:600;margin-left:auto;"><i class="bi bi-x-lg"></i></span>` +
    `</div></div><p><br></p>`
  );
}

function hrHtml() {
  return `<hr style="border:none;border-top:1px solid var(--border);margin:1.4rem 0;" /><p><br></p>`;
}

function sectionDividerHtml() {
  return (
    `<div data-kv-block="section-divider" style="display:flex;align-items:center;gap:0.8rem;margin:1.8rem 0 1rem;">` +
    `<span contenteditable="true" style="font-size:0.78rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">セクション</span>` +
    `<span contenteditable="false" style="flex:1;height:1px;background:var(--border);"></span>` +
    `<span data-kv-remove contenteditable="false" title="削除" style="cursor:pointer;color:var(--text-muted);font-size:0.8rem;flex-shrink:0;"><i class="bi bi-x-lg"></i></span>` +
    `</div><p><br></p>`
  );
}

export default function Editor({ initialDraft, initialTags, folders, allTags, onCancel, onSave }) {
  const bodyEditRef = useRef(null);
  const savedRangeRef = useRef(null);
  const diagramEditTargetRef = useRef(null);
  const imageInputRef = useRef(null);
  const [draft, setDraft] = useState(initialDraft);
  const [draftTags, setDraftTags] = useState(initialTags);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState(null);
  const [suggestedOutline, setSuggestedOutline] = useState(null);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [insertModalOpen, setInsertModalOpen] = useState(false);
  const [keywordMenuOpen, setKeywordMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [diagramInitialSource, setDiagramInitialSource] = useState('');
  const [markdownModalOpen, setMarkdownModalOpen] = useState(false);
  const [htmlModalOpen, setHtmlModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

  useEffect(() => {
    if (bodyEditRef.current) {
      bodyEditRef.current.innerHTML = sanitizeArticleHtml(initialDraft.bodyHtml || '');
      renderMermaidIn(bodyEditRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const execCmd = (cmd, value) => {
    bodyEditRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  // Opening the insert modal (or typing in its search box) moves focus away from the
  // contentEditable body, which would otherwise collapse the caret position. Save the
  // current selection range here so it can be restored right before inserting.
  const saveSelectionRange = () => {
    const el = bodyEditRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      return;
    }
    // フォールバック: 末尾の要素が挿入ブロック（contenteditable="false"）だと、
    // selectNodeContents(el)で作った範囲はルートdivの子要素境界を指すだけになり、
    // execCommand('insertHTML')がその位置では何もせず失敗することがある（Chromiumの挙動）。
    // 必ずテキストを持てる要素（<p>）の中にカーソルを置けるようにする。
    let last = el.lastElementChild;
    const isInsertBlock = (node) => node && (node.hasAttribute('data-kv-block') || node.getAttribute('contenteditable') === 'false');
    if (!last || isInsertBlock(last) || last.tagName !== 'P') {
      last = document.createElement('p');
      last.innerHTML = '<br>';
      el.appendChild(last);
    }
    const range = document.createRange();
    range.selectNodeContents(last);
    range.collapse(false);
    savedRangeRef.current = range;
  };

  const openInsertModal = () => {
    saveSelectionRange();
    setInsertModalOpen(true);
  };

  const insertHtmlAtCursor = (html) => {
    const el = bodyEditRef.current;
    if (!el) return;
    el.focus();
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    document.execCommand('insertHTML', false, html);
    saveSelectionRange();
  };

  const toggleDraftTag = (tag) => setDraftTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  const addSuggestedTag = (tag) => setDraftTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));

  const runOcr = async () => {
    if (ocrLoading) return;
    setOcrLoading(true);
    try {
      const res = await api.runOcr();
      insertHtmlAtCursor(`<p>${res.text}</p>`);
    } finally {
      setOcrLoading(false);
    }
  };

  const runKeywordOrganizer = async () => {
    if (!keywordInput.trim()) return;
    const res = await api.runOrganize(keywordInput);
    setSuggestedTags(res.tags);
    setSuggestedOutline(res.outline);
  };

  const handleSave = () => {
    if (!draft.title.trim()) return;
    const bodyHtml = bodyEditRef.current ? bodyEditRef.current.innerHTML : draft.bodyHtml;
    onSave({ title: draft.title, folder: draft.folder, tags: draftTags, bodyHtml });
  };

  const handleBodyClick = (e) => {
    const removeBtn = e.target.closest('[data-kv-remove]');
    if (removeBtn) {
      removeBtn.closest('[data-kv-block]')?.remove();
      return;
    }
    const addRow = e.target.closest('[data-kv-add-row]');
    if (addRow) {
      const table = addRow.closest('[data-kv-block="table"]')?.querySelector('table');
      if (table) {
        const lastRow = table.rows[table.rows.length - 1];
        const newRow = lastRow.cloneNode(true);
        Array.from(newRow.cells).forEach((c) => { c.textContent = ''; });
        table.tBodies[0].appendChild(newRow);
      }
      return;
    }
    const addCol = e.target.closest('[data-kv-add-col]');
    if (addCol) {
      const table = addCol.closest('[data-kv-block="table"]')?.querySelector('table');
      if (table) {
        Array.from(table.rows).forEach((row, ri) => {
          const cell = document.createElement(ri === 0 ? 'th' : 'td');
          cell.contentEditable = 'true';
          cell.setAttribute('style', ri === 0 ? TABLE_HEADER_STYLE : TABLE_BODY_STYLE);
          row.appendChild(cell);
        });
      }
      return;
    }
    const editDiagram = e.target.closest('[data-kv-edit-diagram]');
    if (editDiagram) {
      const block = editDiagram.closest('[data-kv-block="diagram"]');
      if (block) openDiagramModal(block);
    }
  };

  const handleBodyPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          document.execCommand('insertHTML', false, `<img src="${reader.result}" alt="pasted" style="max-width:100%;border-radius:8px;margin:0.6rem 0;" />`);
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  };

  const openDiagramModal = (existingBlock) => {
    saveSelectionRange();
    if (existingBlock) {
      const encoded = existingBlock.getAttribute('data-kv-mermaid-src') || '';
      setDiagramInitialSource(encoded ? decodeMermaidSource(encoded) : '');
      diagramEditTargetRef.current = existingBlock;
    } else {
      setDiagramInitialSource('');
      diagramEditTargetRef.current = null;
    }
    setDiagramModalOpen(true);
  };

  const handleDiagramSubmit = (source) => {
    const target = diagramEditTargetRef.current;
    if (target) {
      const mermaidDiv = target.querySelector('.mermaid');
      if (mermaidDiv) {
        mermaidDiv.removeAttribute('data-processed');
        mermaidDiv.textContent = source;
      }
      target.setAttribute('data-kv-mermaid-src', encodeMermaidSource(source));
      renderMermaidIn(target);
    } else {
      insertHtmlAtCursor(diagramHtml(source));
      renderMermaidIn(bodyEditRef.current);
    }
    diagramEditTargetRef.current = null;
    setDiagramModalOpen(false);
  };

  const triggerImageUpload = () => {
    saveSelectionRange();
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      insertHtmlAtCursor(`<img src="${reader.result}" alt="${escapeHtmlAttr(file.name)}" style="max-width:100%;border-radius:8px;margin:0.6rem 0;" />`);
    };
    reader.readAsDataURL(file);
  };

  const folderOptions = [{ value: '', label: '(フォルダなし)' }, ...folders.map((f) => ({ value: f.id, label: f.label }))];

  const insertCategories = [
    {
      key: 'expression', label: '表現', icon: 'bi bi-chat-square-text',
      items: calloutVariants().map((v) => ({ key: v.variant, icon: v.icon, color: v.color, label: v.label, description: v.description, run: () => insertHtmlAtCursor(calloutHtml(v.variant)) })),
    },
    {
      key: 'insert', label: '挿入', icon: 'bi bi-plus-square',
      items: [
        { key: 'table', icon: 'bi bi-table', label: '表', description: '行・列を後から追加できる表を挿入します', run: () => insertHtmlAtCursor(tableHtml()) },
        { key: 'diagram', icon: 'bi bi-diagram-2', label: '図（フローチャート/UML/ER/ガント）', description: 'コードでも図でも編集できるMermaid図解を挿入します', run: () => openDiagramModal(null) },
        { key: 'image', icon: 'bi bi-image', label: '画像', description: '画像ファイルをアップロードして挿入します', run: () => triggerImageUpload() },
        { key: 'calendar', icon: 'bi bi-calendar3', label: 'カレンダー', description: '月表示のカレンダーを挿入します', run: () => setCalendarModalOpen(true) },
        { key: 'hr', icon: 'bi bi-hr', label: '水平ルーラー', description: '本文を区切る横線を挿入します', run: () => insertHtmlAtCursor(hrHtml()) },
        { key: 'section-divider', icon: 'bi bi-layout-text-sidebar-reverse', label: 'セクション区切り', description: 'ラベル付きの区切り線で本文をセクションに分けます', run: () => insertHtmlAtCursor(sectionDividerHtml()) },
      ],
    },
    {
      key: 'embed', label: '埋め込み', icon: 'bi bi-code-square',
      items: [
        { key: 'markdown', icon: 'bi bi-markdown', label: 'Markdown', description: 'Markdown記法で書いた内容をHTMLに変換して挿入します', run: () => setMarkdownModalOpen(true) },
        { key: 'html', icon: 'bi bi-filetype-html', label: 'HTML', description: 'HTMLコードをそのまま挿入します', run: () => setHtmlModalOpen(true) },
        { key: 'video', icon: 'bi bi-camera-video', label: '動画', description: 'YouTube・Vimeoのリンクやファイルから動画を埋め込みます', run: () => setVideoModalOpen(true) },
      ],
    },
    {
      key: 'tools', label: 'ツール', icon: 'bi bi-tools',
      items: [
        { key: 'ocr', icon: 'bi bi-camera', label: 'メモをOCRで読み込む', description: '手書きメモなどの画像から文字を読み取ります', run: () => runOcr() },
        { key: 'keyword', icon: 'bi bi-stars', label: 'キーワードから整理', description: '入力したキーワードから見出しやタグの案を提案します', run: () => setKeywordMenuOpen(true) },
      ],
    },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 2rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div onClick={onCancel} style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <i className="bi bi-x-lg" />閉じる
        </div>
        <div style={{ flex: 1 }} />
        <Button variant="primary" icon="check2" onClick={handleSave} size="sm">保存する</Button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.6rem 3rem 2.4rem', display: 'flex' }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="タイトルを入力"
            style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '1rem', padding: 0, flexShrink: 0 }}
          />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.2rem', flexWrap: 'wrap', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>フォルダ</div>
              <PillSelect value={draft.folder || ''} onChange={(v) => setDraft((d) => ({ ...d, folder: v }))} options={folderOptions} style={{ width: 180 }} />
            </div>
            <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>タグ</div>
              <div onClick={() => setTagMenuOpen((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.8rem', border: '2px solid var(--border)', borderRadius: 'var(--radius-pill)', cursor: 'pointer', minHeight: 22, flexWrap: 'wrap' }}>
                {draftTags.length > 0 ? (
                  draftTags.map((t) => (
                    <span key={t} style={{ fontSize: '0.74rem', fontWeight: 600, padding: '0.2em 0.6em', borderRadius: 999, background: 'var(--note-bg)', color: 'var(--primary-dark)' }}>#{t}</span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>タグを選択...</span>
                )}
                <i className="bi bi-chevron-down" style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.7rem' }} />
              </div>
              {tagMenuOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.3rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: '0.4rem', zIndex: 20, maxHeight: 220, overflowY: 'auto' }}>
                  {allTags.length === 0 && (
                    <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>タグがまだありません。「整理」画面から追加できます。</div>
                  )}
                  {allTags.map((t) => {
                    const active = draftTags.includes(t.label);
                    return (
                      <div key={t.id} onClick={() => toggleDraftTag(t.label)} className="kv-list-row" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.5rem', borderRadius: 8, cursor: 'pointer' }}>
                        <i className={active ? 'bi bi-check-square-fill' : 'bi bi-square'} style={{ color: active ? 'var(--primary)' : 'var(--border-strong)', fontSize: '0.95rem' }} />
                        <span style={{ fontSize: '0.85rem' }}>#{t.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', padding: '0.5rem', border: '1px solid var(--border)', borderBottom: 'none', borderRadius: '10px 10px 0 0', background: 'var(--slate-100)', position: 'relative', flexShrink: 0 }}>
            <ToolBtn title="太字" icon="bi-type-bold" onMouseDown={() => execCmd('bold')} />
            <ToolBtn title="斜体" icon="bi-type-italic" onMouseDown={() => execCmd('italic')} />
            <ToolBtn title="下線" icon="bi-type-underline" onMouseDown={() => execCmd('underline')} />
            <Sep />
            <ToolBtn title="箇条書き" icon="bi-list-ul" onMouseDown={() => execCmd('insertUnorderedList')} />
            <ToolBtn title="番号付きリスト" icon="bi-list-ol" onMouseDown={() => execCmd('insertOrderedList')} />
            <Sep />
            <select onChange={(e) => execCmd('formatBlock', e.target.value)} defaultValue="P" title="見出し" style={{ height: 30, borderRadius: 6, border: '1px solid var(--border)', fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-body)', background: 'var(--surface)', cursor: 'pointer' }}>
              {HEADING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div style={{ position: 'relative' }}>
              <div
                title="文字色"
                onMouseDown={(e) => { e.preventDefault(); setColorMenuOpen((v) => !v); }}
                className="kv-toolbtn"
                style={{ width: 30, height: 30, borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-body)' }}
              >
                <i className="bi bi-palette-fill" style={{ fontSize: '0.9rem' }} />
              </div>
              {colorMenuOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.3rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: '0.6rem', zIndex: 20, display: 'flex', gap: '0.4rem' }}>
                  {COLOR_SWATCHES.map((sw) => (
                    <div
                      key={sw.color}
                      onMouseDown={(e) => { e.preventDefault(); execCmd('foreColor', sw.color); setColorMenuOpen(false); }}
                      title={sw.label}
                      className="kv-color-swatch"
                      style={{ background: sw.color }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }} />
            <div title="挿入" onMouseDown={(e) => { e.preventDefault(); openInsertModal(); }} className="kv-toolbtn" style={{ width: 30, height: 30, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <i className="bi bi-plus-lg" />
            </div>
            {ocrLoading && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}><i className="bi bi-arrow-repeat" style={{ marginRight: 3 }} />読み取り中...</span>
            )}
            {keywordMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', right: '0.5rem', marginTop: '0.3rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: '0.9rem', zIndex: 20, width: 280 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-strong)' }}>キーワードから整理</div>
                  <div onClick={() => setKeywordMenuOpen(false)} style={{ marginLeft: 'auto', cursor: 'pointer', color: 'var(--text-muted)' }}><i className="bi bi-x-lg" /></div>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.6rem' }}>単語をスペース区切りで入力すると、タグと見出し構成の下書きを作ります。</div>
                <Input icon="chat-left-text" placeholder="例：デプロイ 手順 注意点" value={keywordInput} onChange={setKeywordInput} height={36} style={{ marginBottom: '0.6rem' }} />
                <Button variant="outline" block icon="magic" onClick={runKeywordOrganizer} size="sm">整理する</Button>
                {suggestedTags && (
                  <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>提案タグ</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.6rem' }}>
                      {suggestedTags.map((s) => (
                        <span key={s} onClick={() => addSuggestedTag(s)} style={{ cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, padding: '0.22em 0.6em', borderRadius: 999, background: 'var(--note-bg)', color: 'var(--primary-dark)' }}>+ #{s}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>構成案</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-body)', lineHeight: 1.7 }}>
                      {suggestedOutline.map((line) => <div key={line}>・{line}</div>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            contentEditable
            ref={bodyEditRef}
            onClick={handleBodyClick}
            onPaste={handleBodyPaste}
            data-placeholder="本文を入力..."
            className="kv-body-edit kv-richtext"
            style={{ flex: 1, minHeight: 360, boxSizing: 'border-box', fontFamily: 'var(--font-sans)', padding: '1.2rem 1.4rem', border: '1px solid var(--border)', borderRadius: '0 0 10px 10px', outline: 'none', background: 'var(--surface)' }}
          />
          <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageFileChange} style={{ display: 'none' }} />
        </div>
      </div>

      <InsertModal open={insertModalOpen} onClose={() => setInsertModalOpen(false)} categories={insertCategories} />
      <DiagramModal
        open={diagramModalOpen}
        initialSource={diagramInitialSource}
        onClose={() => { diagramEditTargetRef.current = null; setDiagramModalOpen(false); }}
        onSubmit={handleDiagramSubmit}
      />
      <TextEmbedModal
        open={markdownModalOpen}
        title="Markdownを挿入"
        placeholder={'# 見出し\n\n本文をMarkdownで入力...'}
        toHtml={(text) => sanitizeArticleHtml(marked.parse(text))}
        onClose={() => setMarkdownModalOpen(false)}
        onSubmit={(html) => { insertHtmlAtCursor(html); setMarkdownModalOpen(false); }}
      />
      <TextEmbedModal
        open={htmlModalOpen}
        title="HTMLを挿入"
        placeholder={'<div>ここにHTMLを入力...</div>'}
        toHtml={(text) => sanitizeArticleHtml(text)}
        onClose={() => setHtmlModalOpen(false)}
        onSubmit={(html) => { insertHtmlAtCursor(html); setHtmlModalOpen(false); }}
      />
      <VideoEmbedModal
        open={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        onSubmit={(html) => insertHtmlAtCursor(html)}
      />
      <CalendarModal
        open={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        onSubmit={(html) => insertHtmlAtCursor(html)}
      />
    </div>
  );
}

function ToolBtn({ title, icon, onMouseDown }) {
  return (
    <div
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onMouseDown(); }}
      className="kv-toolbtn"
      style={{ width: 30, height: 30, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-body)' }}
    >
      <i className={`bi ${icon}`} />
    </div>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 0.2rem' }} />;
}
