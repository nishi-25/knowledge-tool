export default function Input({ label, placeholder, value, onChange, icon, style, height = 40, onKeyDown }) {
  return (
    <div style={style}>
      {label && <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>{label}</div>}
      <div style={{ position: 'relative' }}>
        {icon && (
          <i className={`bi bi-${icon}`} style={{
            position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', fontSize: '0.85rem',
          }} />
        )}
        <input
          className="kv-input"
          style={{ height, paddingLeft: icon ? '2.1rem' : undefined }}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
}
