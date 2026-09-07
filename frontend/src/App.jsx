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
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [editorState, setEditorState] = useState(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const isOwner = currentProject.role === 'owner';

  const refreshArticles = async () => setArticles(await api.listArticles());
  const refreshFolders = async () => setFolders(await api.getFolders());
  const refreshTags = async () => setTags(await api.getTags());
  const refreshProjects = async () => setProjects(await api.listProjects());
  const refreshDiscoverable = async () => setDiscoverableProjects(await api.listDiscoverableProjects());

  const resetWorkspaceView = () => {
    setView('home');
    setFavoritesOnly(false);
    setSelectedId(null);
    setQuery('');
    setActiveFolder('');
    setActiveTag(null);
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
    const pool = favoritesOnly ? articles.filter((a) => a.favorite) : articles;
    return pool
      .filter((a) =>
        (!q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)) &&
        (!activeFolder || a.folder === activeFolder) &&
        (!activeTag || a.tags.includes(activeTag))
      )
      .sort((a, b) => b.updated.localeCompare(a.updated));
  }, [articles, favoritesOnly, query, activeFolder, activeTag]);

  const curArticle = useMemo(
    () => filteredArticles.find((a) => a.id === selectedId) || filteredArticles[0] || null,
    [filteredArticles, selectedId]
  );

  const currentForView = curArticle ? { ...curArticle, folderMeta: folderMeta(folders, curArticle.folder) } : null;

  const relatedArticles = useMemo(() => {
    if (!curArticle) return [];
    return articles
      .filter((x) => x.id !== curArticle.id && (x.folder === curArticle.folder || x.tags.some((t) => curArticle.tags.includes(t))))
      .slice(0, 3);
  }, [articles, curArticle]);

  const goHome = () => setView('home');
  const openLibrary = () => { setView('library'); setFavoritesOnly(false); };
  const openFavorites = () => { setView('library'); setFavoritesOnly(true); setActiveFolder(''); setActiveTag(null); };
  const goOrganize = () => setView('organize');
  const openFolderView = (id) => { setView('library'); setFavoritesOnly(false); setActiveFolder(id); setActiveTag(null); };
  const openTagView = (tag) => { setView('library'); setFavoritesOnly(false); setActiveTag(tag); setActiveFolder(''); };
  const toggleFolderFilterInLibrary = (id) => setActiveFolder((prev) => (prev === id ? '' : id));

  const toggleFavorite = async (id) => {
    const updated = await api.toggleFavorite(id);
    setArticles((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const addFolder = async (label) => setFolders(await api.addFolder(label));
  const addTag = async (label) => setTags(await api.addTag(label));

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
    setFavoritesOnly(false);
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

  const activeKey = view === 'editor' ? null : view === 'library' ? (favoritesOnly ? 'favorites' : 'library') : view;
  const currentStorage = storageOptions.find((o) => o.id === currentProject.storageProvider) || storageOptions[0] || { icon: 'bi bi-hdd-fill', label: '' };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-sans)', color: 'var(--text-body)' }}>
      <IconRail
        activeKey={activeKey}
        onNavigate={(key) => {
          if (key === 'home') goHome();
          else if (key === 'library') openLibrary();
          else if (key === 'organize') goOrganize();
          else if (key === 'favorites') openFavorites();
          else if (key === 'settings') setView('settings');
        }}
        onNewArticle={startNewArticle}
        isOwner={isOwner}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {view === 'home' && (
        <Home
          articles={articles}
          folders={folders}
          tags={tags}
          onOpenArticle={(id) => { setView('library'); setFavoritesOnly(false); setSelectedId(id); }}
          onToggleTagFilter={openTagView}
          onOpenFolder={openFolderView}
          onSearchAll={(q) => { setQuery(q); setView('library'); setFavoritesOnly(false); }}
        />
      )}

      {view === 'library' && (
        <Library
          favoritesOnly={favoritesOnly}
          query={query}
          onQueryChange={setQuery}
          folders={folders}
          folderChipsActive={activeFolder}
          onToggleFolderFilter={toggleFolderFilterInLibrary}
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
    </div>
  );
}
