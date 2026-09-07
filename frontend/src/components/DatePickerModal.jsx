import { useState } from 'react';
import Button from './ui/Button.jsx';

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function buildWeeks(year, month) {
  const first = new Date(year, month - 1, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks = [];
  let day = 1 - startWeekday;
  while (day <= daysInMonth) {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(day >= 1 && day <= daysInMonth ? day : null);
      day += 1;
    }
    weeks.push(week);
  }
  return weeks;
}

export default function DatePickerModal({ open, onClose, onSubmit }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState(null);

  if (!open) return null;

  const close = () => { setSelected(null); onClose(); };
  const submit = () => {
    if (!selected) return;
    const d = new Date(year, month - 1, selected);
    const label = `${year}年${month}月${selected}日（${DOW_LABELS[d.getDay()]}）`;
    onSubmit(label);
    setSelected(null);
  };

  const shiftMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
    setSelected(null);
  };

  const weeks = buildWeeks(year, month);
  const today = new Date();
  const isToday = (d) => d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 340, maxWidth: '92vw', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)' }}>日付を選択</div>
          <div style={{ flex: 1 }} />
          <div onClick={close} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}><i className="bi bi-x-lg" /></div>
        </div>

        <div style={{ padding: '1rem 1.1rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.8rem' }}>
            <div onClick={() => shiftMonth(-1)} style={{ cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem 0.5rem' }}><i className="bi bi-chevron-left" /></div>
            <div style={{ flex: 1, textAlign: 'center', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-strong)' }}>{year}年{month}月</div>
            <div onClick={() => shiftMonth(1)} style={{ cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem 0.5rem' }}><i className="bi bi-chevron-right" /></div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {DOW_LABELS.map((d) => (
                  <th key={d} style={{ padding: '0.3rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => (
                <tr key={wi}>
                  {week.map((d, di) => (
                    <td key={di} style={{ padding: '0.15rem', textAlign: 'center' }}>
                      {d && (
                        <div
                          onClick={() => setSelected(d)}
                          style={{
                            width: 30, height: 30, lineHeight: '30px', borderRadius: '50%', margin: '0 auto', cursor: 'pointer',
                            fontSize: '0.82rem', fontWeight: selected === d ? 700 : 500,
                            background: selected === d ? 'var(--primary)' : 'transparent',
                            color: selected === d ? '#fff' : isToday(d) ? 'var(--primary-dark)' : 'var(--text-body)',
                            border: isToday(d) && selected !== d ? '1px solid var(--primary)' : 'none',
                          }}
                        >
                          {d}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '1rem 1.1rem 1.1rem' }}>
          <Button variant="primary" block icon="check2" disabled={!selected} onClick={submit}>
            {selected ? `${year}年${month}月${selected}日を追加` : '日付を選んでください'}
          </Button>
        </div>
      </div>
    </div>
  );
}
