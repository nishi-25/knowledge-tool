import { useState } from 'react';
import Button from './ui/Button.jsx';
import { calendarHtml } from '../calendarUtils.js';

export default function CalendarModal({ open, onClose, onSubmit }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  if (!open) return null;

  const close = () => onClose();
  const submit = () => { onSubmit(calendarHtml(year, month)); close(); };

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 340, maxWidth: '92vw', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)' }}>カレンダーを挿入</div>
          <div style={{ flex: 1 }} />
          <div onClick={close} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}><i className="bi bi-x-lg" /></div>
        </div>
        <div style={{ padding: '1.1rem', display: 'flex', gap: '0.6rem' }}>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="kv-input" style={{ height: 40, flex: 1 }}>
            {Array.from({ length: 6 }, (_, i) => now.getFullYear() - 1 + i).map((y) => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="kv-input" style={{ height: 40, flex: 1 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}
          </select>
        </div>
        <div style={{ padding: '0 1.1rem 1.1rem' }}>
          <Button variant="primary" block icon="check2" onClick={submit}>挿入する</Button>
        </div>
      </div>
    </div>
  );
}
