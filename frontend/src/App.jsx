import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { folderMeta } from './utils.js';
import IconRail from './components/IconRail.jsx';
import SetupWizard from './components/SetupWizard.jsx';
import Home from './components/Home.jsx';
import Library from './components/Library.jsx';
import Organize from './components/Organize.jsx';
import Settings from './components/Settings.jsx';
import Editor from './components/Editor.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import ForcedPasswordChangeModal from './components/ForcedPasswordChangeModal.jsx';
import InviteScreen from './components/InviteScreen.jsx';
import AdminApp from './components/AdminApp.jsx';
import TemplatePickerModal from './components/TemplatePickerModal.jsx';
import PromptModal from './components/PromptModal.jsx';

function parseInviteToken() {
  const match = window.location.pathname.match(/^\/invite\/([^/]+)/);
  return match ? match[1] : null;
}

export default function App() {
  if (window.location.pathname.startsWith('/admin')) {
    return <AdminApp />;
  }

  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [inviteToken, setInviteToken] = useState(parseInviteToken);

  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState({ configured: false });
  const [projects, setProjects] = useState([]);
  const [discoverableProjects, setDiscoverableProjects] = useState([]);
  const [storageOptions, setStorageOptions] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [showSetup, setShowSetup] = useState(true);
  const [wizardMode, setWizardMode] = useState('step1'); // 'select' | 'step1' | 'step2'
  const [projectNameDraft, setProjectNameDraft] = useState('');

  const [articles, setArticles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [tags, setTags] = useState([]);

  const [view, setView] = useState('home');
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [editorState, setEditorState] = useState(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [namePrompt, setNamePrompt] = useState(null);

  const isOwner = currentProject.role === 'owner';

  const refreshArticles = async () => setArticles(await api.listArticles());
  const refreshFolders = async () => setFolders(await api.getFolders());
  const refreshTags = async () => setTags(await api.getTags());
  const refreshProjects = async () => setProjects(await api.listProjects());
  const refreshDiscoverable = async () => setDiscoverableProjects(await api.listDiscoverableProjects());

  const resetWorkspaceView = () => {
    setView('home');
    setSelectedId(null);
    setQuery('');
    setActiveFolder('');
    setActiveTag(null);
    setShowFavoritesOnly(false);
    setEditorState(null);
  };

  // 認証確認（最初に一度だけ）
  useEffect(() => {
    (async () => {
      try {
        const user = await api.me();
        setCurrentUser(user);
      } catch (e) {
        setCurrentUser(null);
      }
      try {
        setSystemInfo(await api.getSystemInfo());
      } catch (e) {
        // ignore
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  // ログイン済みになったらプロジェクト等を読み込む
  useEffect(() => {
    if (!currentUser || inviteToken) return;
    (async () => {
      const [current, projectList, options, sysInfo] = await Promise.all([
        api.getCurrentProject(), api.listProjects(), api.getStorageOptions(), api.getSystemInfo(),
      ]);
      setCurrentProject(current);
      setProjects(projectList);
      setStorageOptions(options);
      setSystemInfo(sysInfo);
      if (current.configured) {
        await Promise.all([refreshArticles(), refreshFolders(), refreshTags()]);
        setShowSetup(false);
      } else {
        setDiscoverableProjects(await api.listDiscoverableProjects());
        setShowSetup(true);
        setWizardMode('select');
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, inviteToken]);

  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles
      .filter((a) =>
        (!q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)) &&
        (!activeFolder || a.folder === activeFolder) &&
        (!activeTag || a.tags.includes(activeTag))
      )
      .sort((a, b) => b.updated.localeCompare(a.updated));
  }, [articles, query, activeFolder, activeTag]);

  const curArticle = useMemo(
    () => filteredArticles.find((a) => a.id === selectedId) || articles.find((a) => a.id === selectedId) || filteredArticles[0] || null,
    [filteredArticles, articles, selectedId]
  );

  const currentForView = curArticle ? { ...curArticle, folderMeta: folderMeta(folders, curArticle.folder) } : null;

  const relatedArticles = useMemo(() => {
    if (!curArticle) return [];
    return articles
      .filter((x) => x.id !== curArticle.id && (x.folder === curArticle.folder || x.tags.some((t) => curArticle.tags.includes(t))))
      .slice(0, 3);
  }, [articles, curArticle]);

  const goHome = () => setView('home');
  const openLibrary = () => { setView('library'); setQuery(''); setActiveTag(null); setShowFavoritesOnly(false); };
  const goOrganize = () => setView('organize');
  const openFolderView = (id) => { setView('library'); setQuery(''); setActiveFolder(id); setActiveTag(null); setShowFavoritesOnly(false); };
  const openTagView = (tag) => { setView('library'); setActiveTag(tag); setActiveFolder(''); setShowFavoritesOnly(false); };
  const openFavoritesView = () => { setShowFavoritesOnly(true); setQuery(''); setActiveTag(null); };

  const toggleFavorite = async (id) => {
    const updated = await api.toggleFavorite(id);
    setArticles((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const addFolder = async (label) => setFolders(await api.addFolder(label));
  const addTag = async (label) => setTags(await api.addTag(label));

  const openNewFolderPrompt = () => setNamePrompt({ mode: 'new-folder', title: '新規フォルダ', label: 'フォルダ名' });
  const openNewTagPrompt = () => setNamePrompt({ mode: 'new-tag', title: '新規タグ', label: 'タグ名' });
  const openRenameFolderPrompt = (folder) => setNamePrompt({ mode: 'rename-folder', targetId: folder.id, initialValue: folder.label, title: 'フォルダ名を変更', label: 'フォルダ名' });
  const openRenameTagPrompt = (tag) => setNamePrompt({ mode: 'rename-tag', targetId: tag.id, initialValue: tag.label, title: 'タグ名を変更', label: 'タグ名' });

  const submitNamePrompt = async (value) => {
    const { mode, targetId } = namePrompt;
    if (mode === 'new-folder') {
      await addFolder(value);
    } else if (mode === 'rename-folder') {
      await api.renameFolder(targetId, value);
      await Promise.all([refreshFolders(), refreshArticles()]);
    } else if (mode === 'new-tag') {
      await addTag(value);
    } else if (mode === 'rename-tag') {
      await api.renameTag(targetId, value);
      await Promise.all([refreshTags(), refreshArticles()]);
    }
    setNamePrompt(null);
  };

  const deleteFolder = async (id) => {
    await api.deleteFolder(id);
    await Promise.all([refreshFolders(), refreshArticles()]);
    if (activeFolder === id) setActiveFolder('');
  };

  const deleteTag = async (id) => {
    await api.deleteTag(id);
    await Promise.all([refreshTags(), refreshArticles()]);
  };

  const deleteArticle = async (id) => {
    await api.deleteArticle(id);
    await refreshArticles();
    if (selectedId === id) setSelectedId(null);
  };

  const startNewArticle = () => {
    if (!isOwner) return;
    setTemplatePickerOpen(true);
  };

  const beginArticleFromTemplate = (template) => {
    setTemplatePickerOpen(false);
    setEditorState({
      draftId: null,
      initialDraft: { title: template.titlePrefix || '', folder: '', bodyHtml: template.bodyHtml || '' },
      initialTags: [],
    });
    setView('editor');
  };

  const editCurrent = () => {
    if (!isOwner || !currentForView) return;
    setEditorState({
      draftId: currentForView.id,
      initialDraft: {
        title: currentForView.title,
        folder: currentForView.folder || '',
        bodyHtml: currentForView.bodyHtml,
      },
      initialTags: [...currentForView.tags],
    });
    setView('editor');
  };

  const cancelEdit = () => {
    setView(editorState?.draftId ? 'library' : 'home');
    setEditorState(null);
  };

  const saveDraft = async (payload) => {
    const saved = editorState.draftId
      ? await api.updateArticle(editorState.draftId, payload)
      : await api.createArticle(payload);
    await Promise.all([refreshArticles(), refreshFolders(), refreshTags()]);
    setView('library');
    setSelectedId(saved.id);
    setEditorState(null);
  };

  // --- プロジェクト（ワークスペース）切り替え ---------------------------------

  const openProjectSwitcher = async () => {
    await Promise.all([refreshProjects(), refreshDiscoverable()]);
    setWizardMode('select');
    setShowSetup(true);
  };

  const requestJoinProject = async (id) => {
    await api.requestJoinProject(id);
    await refreshDiscoverable();
  };

  const startCreateProject = () => {
    setProjectNameDraft('');
    setWizardMode('step1');
  };

  const selectExistingProject = async (id) => {
    await api.activateProject(id);
    const current = await api.getCurrentProject();
    setCurrentProject(current);
    resetWorkspaceView();
    await Promise.all([refreshArticles(), refreshFolders(), refreshTags()]);
    setShowSetup(false);
  };

  const finishCreateProject = async (storageConfig) => {
    if (!projectNameDraft.trim()) return;
    const created = await api.createProject(projectNameDraft.trim(), storageConfig);
    setCurrentProject({ configured: true, ...created });
    await refreshProjects();
    resetWorkspaceView();
    await Promise.all([refreshArticles(), refreshFolders(), refreshTags()]);
    setShowSetup(false);
  };

  const changeCurrentStorage = async (storageConfig) => {
    const updated = await api.updateCurrentStorage(storageConfig);
    setCurrentProject((prev) => ({ ...prev, ...updated }));
    await Promise.all([refreshArticles(), refreshFolders(), refreshTags()]);
  };

  const handleLogout = async () => {
    await api.logout();
    window.location.href = '/';
  };

  const goToAppRoot = () => {
    window.history.pushState({}, '', '/');
    setInviteToken(null);
  };

  if (!authChecked) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        読み込み中...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onAuthenticated={setCurrentUser} loginEnabled={systemInfo?.loginEnabled !== false} />;
  }

  if (currentUser.mustChangePassword) {
    return <ForcedPasswordChangeModal onDone={() => setCurrentUser({ ...currentUser, mustChangePassword: false })} />;
  }

  if (inviteToken) {
    return <InviteScreen token={inviteToken} onGoToApp={goToAppRoot} />;
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        読み込み中...
      </div>
    );
  }

  if (showSetup) {
    return (
      <SetupWizard
        mode={wizardMode}
        projects={projects}
        onSelectProject={selectExistingProject}
        onStartCreate={startCreateProject}
        discoverableProjects={discoverableProjects}
        onRequestJoin={requestJoinProject}
        projectName={projectNameDraft}
        onProjectNameChange={setProjectNameDraft}
        storageOptions={storageOptions}
        systemInfo={systemInfo}
        onNext={() => { if (projectNameDraft.trim()) setWizardMode('step2'); }}
        onPrev={() => setWizardMode(wizardMode === 'step2' ? 'step1' : 'select')}
        onFinish={finishCreateProject}
        canGoBackToSelect
      />
    );
  }

  const activeKey = view === 'editor' ? null : view;
  const currentStorage = storageOptions.find((o) => o.id === currentProject.storageProvider) || storageOptions[0] || { icon: 'bi bi-hdd-fill', label: '' };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-sans)', color: 'var(--text-body)' }}>
      <IconRail
        activeKey={activeKey}
        onNavigate={(key) => {
          if (key === 'home') goHome();
          else if (key === 'library') openLibrary();
          else if (key === 'organize') goOrganize();
          else if (key === 'settings') setView('settings');
        }}
        onNewArticle={startNewArticle}
        onNewFolder={openNewFolderPrompt}
        onNewTag={openNewTagPrompt}
        isOwner={isOwner}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {view === 'home' && (
        <Home
          articles={articles}
          folders={folders}
          tags={tags}
          onOpenArticle={(id) => { setView('library'); setSelectedId(id); }}
          onToggleTagFilter={openTagView}
          onOpenFolder={openFolderView}
          onSearchAll={(q) => { setQuery(q); setView('library'); }}
        />
      )}

      {view === 'library' && (
        <Library
          query={query}
          onQueryChange={setQuery}
          activeTag={activeTag}
          onClearTag={() => setActiveTag(null)}
          folders={folders}
          articles={articles}
          activeFolder={activeFolder}
          filteredArticles={filteredArticles}
          selectedId={curArticle?.id ?? null}
          onSelectArticle={setSelectedId}
          current={currentForView}
          relatedArticles={relatedArticles}
          onToggleFavorite={toggleFavorite}
          onEditCurrent={editCurrent}
          onOpenArticle={setSelectedId}
          isOwner={isOwner}
          currentUser={currentUser}
          onNewFolder={openNewFolderPrompt}
          onRenameFolder={openRenameFolderPrompt}
          onDeleteFolder={deleteFolder}
          onNewArticle={startNewArticle}
          onDeleteArticle={deleteArticle}
          showFavoritesOnly={showFavoritesOnly}
          onShowFavorites={openFavoritesView}
          onClearFavorites={() => setShowFavoritesOnly(false)}
        />
      )}

      {view === 'organize' && (
        <Organize
          folders={folders}
          tags={tags}
          onOpenFolder={openFolderView}
          onOpenTag={openTagView}
          onAddFolder={addFolder}
          onAddTag={addTag}
          isOwner={isOwner}
          onRenameFolder={openRenameFolderPrompt}
          onDeleteFolder={deleteFolder}
          onRenameTag={openRenameTagPrompt}
          onDeleteTag={deleteTag}
        />
      )}

      {view === 'settings' && (
        <Settings
          projectName={currentProject.name}
          currentStorage={currentStorage}
          resolvedPath={currentProject.resolvedPath}
          systemInfo={systemInfo}
          isOwner={isOwner}
          currentUserId={currentUser.id}
          onChangeStorage={changeCurrentStorage}
          onSwitchProject={openProjectSwitcher}
        />
      )}

      {view === 'editor' && editorState && isOwner && (
        <Editor
          key={editorState.draftId ?? 'new'}
          initialDraft={editorState.initialDraft}
          initialTags={editorState.initialTags}
          folders={folders}
          allTags={tags}
          onCancel={cancelEdit}
          onSave={saveDraft}
        />
      )}

      <TemplatePickerModal
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSelect={beginArticleFromTemplate}
      />

      <PromptModal
        open={!!namePrompt}
        title={namePrompt?.title}
        label={namePrompt?.label}
        initialValue={namePrompt?.initialValue}
        onSubmit={submitNamePrompt}
        onClose={() => setNamePrompt(null)}
      />
    </div>
  );
}
