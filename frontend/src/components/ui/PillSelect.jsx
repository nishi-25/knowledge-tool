export default function PillSelect({ value, onChange, options, height = 34, style }) {
  return (
    <select className="kv-pill-select" style={{ height, ...style }} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
