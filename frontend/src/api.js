const REMOTE_LINK_KEY = 'kv_remote_link';

function getRemoteLink() {
  try {
    return JSON.parse(localStorage.getItem(REMOTE_LINK_KEY) || 'null');
  } catch {
    return null;
  }
}

function setRemoteLink(link) {
  if (link) localStorage.setItem(REMOTE_LINK_KEY, JSON.stringify(link));
  else localStorage.removeItem(REMOTE_LINK_KEY);
}

function currentBase() {
  const remote = getRemoteLink();
  if (remote) return `${remote.url}/api`;
  return (typeof window !== 'undefined' && window.__KV_API_BASE__) || '/api';
}

async function request(path, options = {}) {
  const remote = getRemoteLink();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const fetchOpts = { ...options, headers };
  if (remote) {
    headers.Authorization = `Bearer ${remote.token}`;
  } else {
    fetchOpts.credentials = 'include';
  }
  const res = await fetch(`${currentBase()}${path}`, fetchOpts);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const err = new Error(detail.detail || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getRemoteLink,

  ping: async (url) => {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/ping`, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error(`接続に失敗しました (HTTP ${res.status})`);
    return res.json();
  },

  linkToServer: async (url, email, password) => {
    const normalized = url.replace(/\/$/, '');
    const res = await fetch(`${normalized}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'ログインに失敗しました');
    setRemoteLink({ url: normalized, token: data.token });
    return data;
  },

  unlinkServer: () => setRemoteLink(null),

  signup: (email, password, displayName) => request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, displayName }) }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  listProjects: () => request('/projects'),
  listDiscoverableProjects: () => request('/projects/discoverable'),
  requestJoinProject: (id) => request(`/projects/${id}/request`, { method: 'POST' }),
  getCurrentProject: () => request('/projects/current'),
  createProject: (name, storageConfig) => request('/projects', { method: 'POST', body: JSON.stringify({ name, storageConfig }) }),
  activateProject: (id) => request(`/projects/${id}/activate`, { method: 'POST' }),
  updateCurrentStorage: (storageConfig) => request('/projects/current/storage', { method: 'PUT', body: JSON.stringify(storageConfig) }),
  testStorageConfig: (storageConfig) => request('/projects/storage-test', { method: 'POST', body: JSON.stringify(storageConfig) }),
  getStorageOptions: () => request('/projects/storage-options'),

  createInvite: () => request('/projects/current/invite', { method: 'POST' }),
  listMembers: () => request('/projects/current/members'),
  listPendingRequests: () => request('/projects/current/requests'),
  approveRequest: (userId) => request(`/projects/current/requests/${userId}/approve`, { method: 'POST' }),
  rejectRequest: (userId) => request(`/projects/current/requests/${userId}/reject`, { method: 'POST' }),
  removeMember: (userId) => request(`/projects/current/members/${userId}/remove`, { method: 'POST' }),
  promoteMember: (userId) => request(`/projects/current/members/${userId}/promote`, { method: 'POST' }),
  demoteMember: (userId) => request(`/projects/current/members/${userId}/demote`, { method: 'POST' }),

  getInvite: (token) => request(`/invites/${token}`),
  requestInviteAccess: (token) => request(`/invites/${token}/request`, { method: 'POST' }),

  getSystemInfo: () => request('/system/info'),
  browseFs: (path) => request(`/fs/browse${path ? `?path=${encodeURIComponent(path)}` : ''}`),
  createFsFolder: (path, name) => request('/fs/mkdir', { method: 'POST', body: JSON.stringify({ path, name }) }),

  getFolders: () => request('/folders'),
  addFolder: (label) => request('/folders', { method: 'POST', body: JSON.stringify({ label }) }),

  getTags: () => request('/tags'),
  addTag: (label) => request('/tags', { method: 'POST', body: JSON.stringify({ label }) }),

  listArticles: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.folder) qs.set('folder', params.folder);
    if (params.tag) qs.set('tag', params.tag);
    if (params.favoritesOnly) qs.set('favorites_only', 'true');
    const s = qs.toString();
    return request(`/articles${s ? `?${s}` : ''}`);
  },
  getArticle: (id) => request(`/articles/${id}`),
  createArticle: (data) => request('/articles', { method: 'POST', body: JSON.stringify(data) }),
  updateArticle: (id, data) => request(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleFavorite: (id) => request(`/articles/${id}/favorite`, { method: 'POST' }),

  runOcr: () => request('/tools/ocr', { method: 'POST' }),
  runOrganize: (keywords) => request('/tools/organize', { method: 'POST', body: JSON.stringify({ keywords }) }),

  getComments: (articleId) => request(`/articles/${articleId}/comments`),
  addComment: (articleId, text) => request(`/articles/${articleId}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  deleteComment: (commentId) => request(`/comments/${commentId}`, { method: 'DELETE' }),

  adminGetStatus: () => request('/admin/status'),
  adminSetup: (username, password, setupToken) => request('/admin/setup', { method: 'POST', body: JSON.stringify({ username, password, setupToken }) }),
  adminLogin: (username, password) => request('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  adminLogout: () => request('/admin/logout', { method: 'POST' }),
  adminMe: () => request('/admin/me'),
  adminChangePassword: (currentPassword, newPassword) => request('/admin/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  adminGetLoginSettings: () => request('/admin/login-settings'),
  adminSetLoginSettings: (loginEnabled) => request('/admin/login-settings', { method: 'PUT', body: JSON.stringify({ loginEnabled }) }),
  adminListProjects: () => request('/admin/projects'),
  adminGetProject: (id) => request(`/admin/projects/${id}`),
  adminApproveMember: (pid, uid) => request(`/admin/projects/${pid}/members/${uid}/approve`, { method: 'POST' }),
  adminRejectMember: (pid, uid) => request(`/admin/projects/${pid}/members/${uid}/reject`, { method: 'POST' }),
  adminRemoveMember: (pid, uid) => request(`/admin/projects/${pid}/members/${uid}/remove`, { method: 'POST' }),
  adminPromoteMember: (pid, uid) => request(`/admin/projects/${pid}/members/${uid}/promote`, { method: 'POST' }),
  adminDemoteMember: (pid, uid) => request(`/admin/projects/${pid}/members/${uid}/demote`, { method: 'POST' }),
  adminDeleteArticle: (pid, aid) => request(`/admin/projects/${pid}/articles/${aid}`, { method: 'DELETE' }),
  adminMoveArticle: (pid, aid, folder) => request(`/admin/projects/${pid}/articles/${aid}/move`, { method: 'PUT', body: JSON.stringify({ folder }) }),
};
