const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// AuthContext registers these so this module can silently refresh an
// expired access token without every page having to handle 401s itself.
let authHooks = {
  getRefreshToken: () => null,
  onRefreshed: () => {},
  onRefreshFailed: () => {},
};
export function setAuthHooks(hooks) {
  authHooks = hooks;
}

let refreshPromise = null;
async function refreshAccessToken() {
  const refreshToken = authHooks.getRefreshToken();
  if (!refreshToken) return null;
  if (!refreshPromise) {
    refreshPromise = rawRequest('/auth/refresh', { method: 'POST', body: { refreshToken } })
      .then((r) => (r.ok ? r.data.accessToken : null))
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function rawRequest(path, { method = 'GET', body, token, isJson = true } = {}) {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function request(path, opts = {}) {
  let { ok, status, data } = await rawRequest(path, opts);

  if (!ok && status === 401 && opts.token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      authHooks.onRefreshed(newToken);
      ({ ok, status, data } = await rawRequest(path, { ...opts, token: newToken }));
    } else {
      authHooks.onRefreshFailed();
    }
  }

  if (!ok) {
    throw new Error(data.error || `Request failed (${status})`);
  }
  return data;
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),

  getTodayEntry: (token) => request('/entries/today', { token }),
  submitEntry: (token, payload) => request('/entries', { method: 'POST', body: payload, token }),
  getHistory: (token, page = 1) => request(`/entries/history?page=${page}`, { token }),
  generateSticker: (token, entryId, regenerate = false) =>
    request(`/entries/${entryId}/sticker`, { method: 'POST', body: { regenerate }, token }),
  regenerateHumor: (token, entryId) =>
    request(`/entries/${entryId}/regenerate-humor`, { method: 'POST', token }),

  getDashboardSummary: (token) => request('/dashboard/summary', { token }),
  getWeeklyReport: (token) => request('/dashboard/weekly', { token }),
  getMonthlyReport: (token) => request('/dashboard/monthly', { token }),

  getProfile: (token) => request('/profile', { token }),
  updateProfile: (token, payload) => request('/profile', { method: 'PATCH', body: payload, token }),
  deleteAccount: (token) => request('/profile', { method: 'DELETE', token }),

  getInterests: (token) => request('/interests/me', { token }),
  saveInterestCategory: (token, categoryKey, items) =>
    request(`/interests/me/${categoryKey}`, { method: 'PUT', body: { items }, token }),

  getRandomPuzzle: (token, category, excludeId) =>
    request(`/puzzles/random?category=${category}${excludeId ? `&exclude=${excludeId}` : ''}`, { token }),
  getPuzzleAnswer: (token, id) => request(`/puzzles/${id}`, { token }),

  getRandomSong: (token, excludeId) =>
    request(`/songs/random${excludeId ? `?exclude=${excludeId}` : ''}`, { token }),
  getSongAnswer: (token, id) => request(`/songs/${id}`, { token }),
};
