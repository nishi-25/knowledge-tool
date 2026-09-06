export default function Avatar({ name = '自分', size = 32 }) {
  const initial = name.trim().slice(0, 1);
  return (
    <div className="kv-avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initial}
    </div>
  );
}
