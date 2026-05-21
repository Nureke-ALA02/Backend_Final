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

    register: (email, password, name) =>
      request('/auth/register', { method: 'POST', body: { email, password, name }, auth: false }),
    login: (email, password) =>
      request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
    me: () => request('/auth/me'),

    childProfilesByEmail: (email) =>
      request(`/auth/child-profiles?email=${encodeURIComponent(email)}`, { auth: false }),
    childLogin: (childId, pin) =>
      request('/auth/child-login', { method: 'POST', body: { childId, pin }, auth: false }),

    listChildren:  () => request('/children'),
    createChild:   (data) => request('/children', { method: 'POST', body: data }),
    updateChild:   (id, data) => request(`/children/${id}`, { method: 'PUT', body: data }),
    deleteChild:   (id) => request(`/children/${id}`, { method: 'DELETE' }),
    getChild:      (id) => request(`/children/${id}`),
    // ---- PARENT PROFILE ----
getParent:    (id) => request(`/parents/${id}`),
updateParent: (id, data) => request(`/parents/${id}`, { method: 'PUT', body: data }),

leaderboard: ({ sortBy = 'xp', age = null, limit = 20 } = {}) => {
  const params = new URLSearchParams({ sortBy, limit: String(limit) });
  if (age) params.set('age', String(age));
  return request(`/leaderboard?${params.toString()}`);
},

    curriculumFor: (childId) => request(`/children/${childId}/curriculum`),
    getLesson:     (lessonId) => request(`/lessons/${lessonId}`),
    submitAnswer:  (exerciseId, childId, answer) =>
                    request(`/exercises/${exerciseId}/submit`, { method: 'POST', body: { childId, answer } }),
    completeLesson: (lessonId, payload) =>
                    request(`/lessons/${lessonId}/complete`, { method: 'POST', body: payload }),
    listBadges:    () => request('/badges'),

    adminStats:    () => request('/admin/stats'),
    adminParents:  ({ page = 1, search = '' } = {}) =>
                    request(`/admin/parents?page=${page}&search=${encodeURIComponent(search)}`),
    adminChildren: ({ page = 1 } = {}) =>
                    request(`/admin/children?page=${page}`),
    adminCurriculum: () => request('/admin/curriculum'),
    adminLeaderboard: ({ sortBy = 'xp', age = null, limit = 100 } = {}) => {
  const params = new URLSearchParams({ sortBy, limit: String(limit) });
  if (age) params.set('age', String(age));
  return request(`/admin/leaderboard?${params.toString()}`);
},
    adminCreateUnit: (data) => request('/admin/units', { method: 'POST', body: data }),
    adminUpdateUnit: (id, data) => request(`/admin/units/${id}`, { method: 'PUT', body: data }),
    adminDeleteUnit: (id) => request(`/admin/units/${id}`, { method: 'DELETE' }),

    adminCreateLesson: (data) => request('/admin/lessons', { method: 'POST', body: data }),
    adminUpdateLesson: (id, data) => request(`/admin/lessons/${id}`, { method: 'PUT', body: data }),
    adminDeleteLesson: (id) => request(`/admin/lessons/${id}`, { method: 'DELETE' }),

    adminCreateExercise: (data) => request('/admin/exercises', { method: 'POST', body: data }),
    adminUpdateExercise: (id, data) => request(`/admin/exercises/${id}`, { method: 'PUT', body: data }),
    adminDeleteExercise: (id) => request(`/admin/exercises/${id}`, { method: 'DELETE' }),

    adminDeleteParent: (id) => request(`/admin/parents/${id}`, { method: 'DELETE' }),
    adminDeleteChild:  (id) => request(`/admin/children/${id}`, { method: 'DELETE' }),
  };
})();