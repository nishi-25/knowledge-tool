export default function Card({ title, icon, children, style }) {
  return (
    <div className="kv-card" style={style}>
      {title && (
        <div className="kv-card-title">
          {icon && <i className={`bi bi-${icon}`} />}
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
