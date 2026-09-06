export default function Button({
  children, variant = 'primary', size = 'md', block = false,
  icon, iconRight, disabled = false, onClick, style, type = 'button',
}) {
  const classes = ['kv-btn', `variant-${variant}`, `size-${size}`, block ? 'block' : '']
    .filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick} style={style}>
      {icon && <i className={`bi bi-${icon}`} />}
      {children}
      {iconRight && <i className={`bi bi-${iconRight}`} />}
    </button>
  );
}
