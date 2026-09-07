import { useEffect, useState } from 'react';
import Input from './ui/Input.jsx';
import Button from './ui/Button.jsx';

export default function PromptModal({ open, title, label, initialValue, submitLabel, onSubmit, onClose }) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue(initialValue || '');
  }, [open, initialValue]);

  if (!open) return null;

  const submit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 360, maxWidth: '92vw', background: 'var(--surface)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', padding: '1.4rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '1rem' }}>{title}</div>
        <Input
          label={label}
          value={value}
          onChange={setValue}
          height={40}
          style={{ marginBottom: '1.2rem' }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>キャンセル</Button>
          <Button variant="primary" icon="check2" disabled={!value.trim()} onClick={submit}>{submitLabel || '保存する'}</Button>
        </div>
      </div>
    </div>
  );
}
