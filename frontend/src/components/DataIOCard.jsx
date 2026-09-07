import { useRef, useState } from 'react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import { api } from '../api.js';
import { downloadJson, readJsonFile } from '../utils.js';

export default function DataIOCard({ projectName, isOwner, onImported }) {
  const projectFileRef = useRef(null);
  const articleFileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { kind: 'ok'|'error', text }

  const exportProject = async () => {
    setMessage(null);
    try {
      const data = await api.exportProject();
      downloadJson(data, `${projectName || 'project'}.knowledge-view.json`);
    } catch (e) {
      setMessage({ kind: 'error', text: e.message || 'エクスポートに失敗しました' });
    }
  };

  const importProject = async (file) => {
    setBusy(true);
    setMessage(null);
    try {
      const data = await readJsonFile(file);
      if (data.type !== 'knowledge-view-project-export') {
        throw new Error('プロジェクト全体のエクスポートファイルではないようです');
      }
      const result = await api.importProject(data);
      setMessage({ kind: 'ok', text: `${result.importedArticles}件の記事をインポートしました` });
      await onImported?.();
    } catch (e) {
      setMessage({ kind: 'error', text: e.message || 'インポートに失敗しました' });
    } finally {
      setBusy(false);
    }
  };

  const importArticle = async (file) => {
    setBusy(true);
    setMessage(null);
    try {
      const data = await readJsonFile(file);
      if (data.type !== 'knowledge-view-article-export') {
        throw new Error('記事単位のエクスポートファイルではないようです');
      }
      await api.importArticle(data);
      setMessage({ kind: 'ok', text: '記事をインポートしました' });
      await onImported?.();
    } catch (e) {
      setMessage({ kind: 'error', text: e.message || 'インポートに失敗しました' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="データのエクスポート・インポート" icon="filetype-json" style={{ marginTop: '1.2rem' }}>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
        フォルダ・タグ・記事をJSON形式でエクスポート・インポートできます。AIツールへの読み込みやバックアップにご利用ください。
        インポートは既存の記事に追加される形で取り込まれます（上書きはされません）。
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
        <Button variant="outline" size="sm" icon="download" onClick={exportProject}>プロジェクト全体をJSONでエクスポート</Button>
        {isOwner && (
          <Button variant="outline" size="sm" icon="upload" disabled={busy} onClick={() => projectFileRef.current?.click()}>
            プロジェクト全体をJSONからインポート
          </Button>
        )}
      </div>

      {isOwner && (
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" icon="upload" disabled={busy} onClick={() => articleFileRef.current?.click()}>
            記事1件をJSONからインポート
          </Button>
        </div>
      )}

      {message && (
        <div style={{ fontSize: '0.8rem', marginTop: '0.7rem', color: message.kind === 'ok' ? 'var(--primary-dark)' : '#dc2626' }}>
          {message.text}
        </div>
      )}

      <input
        ref={projectFileRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importProject(f); }}
      />
      <input
        ref={articleFileRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importArticle(f); }}
      />
    </Card>
  );
}
