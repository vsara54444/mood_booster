const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, token, isJson = true } = {}) {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),

  getTodayEntry: (token) => request('/entries/today', { token }),
  submitEntry: (token, payload) => request('/entries', { method: 'POST', body: payload, token }),
  getHistory: (token, page = 1) => request(`/entries/history?page=${page}`, { token }),

  getFeed: (token, page = 1) => request(`/community/feed?page=${page}`, { token }),
  shareEntry: (token, entryId) => request(`/community/share/${entryId}`, { method: 'POST', token }),
  voteOnPost: (token, postId, voteType) =>
    request(`/community/feed/${postId}/vote`, { method: 'POST', body: { voteType }, token }),

  getDashboardSummary: (token) => request('/dashboard/summary', { token }),
  getWeeklyReport: (token) => request('/dashboard/weekly', { token }),
  getMonthlyReport: (token) => request('/dashboard/monthly', { token }),

  getProfile: (token) => request('/profile', { token }),
  updateProfile: (token, payload) => request('/profile', { method: 'PATCH', body: payload, token }),
  deleteAccount: (token) => request('/profile', { method: 'DELETE', token }),
};
