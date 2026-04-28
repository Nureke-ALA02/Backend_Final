/* eslint-env browser */
(function () {
  const TOKEN_KEY = 'readyabc.token';
  const BASE = '/api/v1';

  const Auth = {
    get token() { return localStorage.getItem(TOKEN_KEY); },
    set token(v) {
      if (v) localStorage.setItem(TOKEN_KEY, v);
      else localStorage.removeItem(TOKEN_KEY);
    },
    clear() { localStorage.removeItem(TOKEN_KEY); },
  };

  async function request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && Auth.token) headers.Authorization = `Bearer ${Auth.token}`;

    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try { data = await res.json(); } catch (_) { /* no body */ }

    if (!res.ok) {
      const err = new Error((data && data.message) || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  window.API = {
    Auth,
    register: (email, password, name) => request('/auth/register', { method: 'POST', body: { email, password, name }, auth: false }),
    login:    (email, password)        => request('/auth/login',    { method: 'POST', body: { email, password }, auth: false }),
    me:       () => request('/auth/me'),

    listChildren:  () => request('/children'),
    createChild:   (data) => request('/children', { method: 'POST', body: data }),
    deleteChild:   (id) => request(`/children/${id}`, { method: 'DELETE' }),
    getChild:      (id) => request(`/children/${id}`),

    curriculumFor: (childId) => request(`/children/${childId}/curriculum`),
    getLesson:     (lessonId) => request(`/lessons/${lessonId}`),
    submitAnswer:  (exerciseId, childId, answer) =>
                    request(`/exercises/${exerciseId}/submit`, { method: 'POST', body: { childId, answer } }),
    completeLesson: (lessonId, payload) =>
                    request(`/lessons/${lessonId}/complete`, { method: 'POST', body: payload }),
    listBadges:    () => request('/badges'),

    // Admin endpoints
    adminStats:    () => request('/admin/stats'),
    adminParents:  ({ page = 1, search = '' } = {}) =>
                    request(`/admin/parents?page=${page}&search=${encodeURIComponent(search)}`),
    adminChildren: ({ page = 1 } = {}) =>
                    request(`/admin/children?page=${page}`),
  };
})();
