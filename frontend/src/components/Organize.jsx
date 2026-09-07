import { useState } from 'react';
import Card from './ui/Card.jsx';
import Input from './ui/Input.jsx';
import Button from './ui/Button.jsx';

export default function Organize({
  folders, tags, onOpenFolder, onOpenTag, onAddFolder, onAddTag, isOwner,
  onRenameFolder, onDeleteFolder, onRenameTag, onDeleteTag,
}) {
  const [newFolderName, setNewFolderName] = useState('');
  const [newTagName, setNewTagName] = useState('');

  const submitFolder = () => {
    if (!newFolderName.trim()) return;
    onAddFolder(newFolderName.trim());
    setNewFolderName('');
  };
  const submitTag = () => {
    if (!newTagName.trim()) return;
    onAddTag(newTagName.trim());
    setNewTagName('');
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2.4rem 3rem' }}>
      <div style={{ maxWidth: 820 }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.3rem' }}>フォルダ・タグ管理</div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.6rem' }}>整理のかたちを見直して、探しやすさを保ちます</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', alignItems: 'start' }}>
          <Card title="フォルダ" icon="folder2-open">
            {folders.map((f) => (
              <div key={f.id} onClick={() => onOpenFolder(f.id)} className="kv-list-row" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.65rem 0', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: f.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={f.icon} style={{ color: f.color }} />
                </div>
                <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>{f.label}</div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{f.count}件</span>
                {isOwner && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <i
                      className="bi bi-pencil"
                      onClick={(e) => { e.stopPropagation(); onRenameFolder(f); }}
                      style={{ color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer' }}
                    />
                    <i
                      className="bi bi-trash"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`「${f.label}」を削除しますか？中の記事は「フォルダなし」に移動します。`)) onDeleteFolder(f.id);
                      }}
                      style={{ color: 'var(--danger)', fontSize: '0.82rem', cursor: 'pointer' }}
                    />
                  </div>
                )}
              </div>
            ))}
            {isOwner && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem' }}>
                <Input placeholder="新しいフォルダ名" value={newFolderName} onChange={setNewFolderName} height={38} style={{ flex: 1 }} />
                <Button variant="outline" size="sm" onClick={submitFolder} style={{ height: 38 }}>追加</Button>
              </div>
            )}
          </Card>

          <Card title="タグ" icon="tags">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {tags.map((t) => (
                <span key={t.id} style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.4em 0.8em', borderRadius: 999, background: 'var(--note-bg)', color: 'var(--primary-dark)', display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}>
                  <span onClick={() => onOpenTag(t.label)} style={{ cursor: 'pointer' }}>#{t.label} <span style={{ opacity: 0.6, fontWeight: 500 }}>{t.count}</span></span>
                  {isOwner && (
                    <>
                      <i className="bi bi-pencil" onClick={() => onRenameTag(t)} style={{ fontSize: '0.72rem', cursor: 'pointer' }} />
                      <i
                        className="bi bi-trash"
                        onClick={() => { if (window.confirm(`タグ「${t.label}」を削除しますか？`)) onDeleteTag(t.id); }}
                        style={{ fontSize: '0.72rem', cursor: 'pointer', color: 'var(--danger)' }}
                      />
                    </>
                  )}
                </span>
              ))}
            </div>
            {isOwner && (
              <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.6rem' }}>
                <Input placeholder="新しいタグ名" value={newTagName} onChange={setNewTagName} height={38} style={{ flex: 1 }} />
                <Button variant="outline" size="sm" onClick={submitTag} style={{ height: 38 }}>追加</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
