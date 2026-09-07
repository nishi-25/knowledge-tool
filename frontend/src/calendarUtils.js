const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export function calendarHtml(year, month) {
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

  const headerCells = DOW_LABELS
    .map((d) => `<th style="padding:0.4rem;background:var(--slate-100);border:1px solid var(--border);font-size:0.72rem;color:var(--text-muted);">${d}</th>`)
    .join('');
  const bodyRows = weeks
    .map((week) => `<tr>${week.map((d) => (d
      ? `<td data-kv-day="${d}" style="padding:0.5rem;border:1px solid var(--border);text-align:center;font-size:0.82rem;color:var(--text-body);cursor:pointer;">${d}</td>`
      : `<td style="padding:0.5rem;border:1px solid var(--border);text-align:center;font-size:0.82rem;color:var(--slate-300);"></td>`
    )).join('')}</tr>`)
    .join('');

  return (
    `<div data-kv-block="calendar" contenteditable="false" style="margin:0.8rem 0; width:420px; max-width:100%; box-sizing:border-box;">` +
    `<div style="display:flex; align-items:center; margin-bottom:0.4rem;">` +
    `<span style="font-size:0.85rem;font-weight:700;color:var(--text-strong);">${year}年${month}月</span>` +
    `<span data-kv-remove contenteditable="false" style="margin-left:auto;cursor:pointer;color:var(--text-muted);font-size:0.8rem;"><i class="bi bi-x-lg"></i></span>` +
    `</div>` +
    `<table style="border-collapse:collapse;width:100%;"><tr>${headerCells}</tr>${bodyRows}</table>` +
    `</div><p><br></p>`
  );
}
