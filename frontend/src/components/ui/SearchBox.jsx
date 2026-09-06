export default function SearchBox({ placeholder, value, onChange, onFocus, height = 40, style }) {
  return (
    <div className="kv-searchbox" style={{ height, ...style }}>
      <i className="bi bi-search" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }} />
      <input
        placeholder={placeholder}
        value={value}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
