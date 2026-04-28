/* eslint-env browser */
/* global API, Views */
(function () {
  const appEl = document.getElementById('app');
  const topbar = document.getElementById('topbar');
  const parentNameEl = document.getElementById('parent-name');
  const logoutBtn = document.getElementById('logout-btn');

  let currentUser = null;

  function go(path) {
    location.hash = '#' + path;
  }

  // Where should this user land after auth?
  function homeFor(user) {
    return user && user.role === 'ADMIN' ? '/admin' : '/dashboard';
  }

  function setUser(user) {
    currentUser = user;
    if (user) {
      topbar.classList.remove('hidden');
      const tag = user.role === 'ADMIN' ? ' (admin)' : '';
      parentNameEl.textContent = `Hi, ${user.name}${tag}`;
    } else {
      topbar.classList.add('hidden');
      parentNameEl.textContent = '';
    }
  }

  logoutBtn.addEventListener('click', () => {
    API.Auth.clear();
    setUser(null);
    go('/');
  });

  // Brand click → home if logged in, else landing
  document.querySelector('.brand').addEventListener('click', () => {
    go(currentUser ? homeFor(currentUser) : '/');
  });

  async function ensureUser() {
    if (currentUser) return currentUser;
    if (!API.Auth.token) return null;
    try {
      const u = await API.me();
      setUser(u);
      return u;
    } catch (_) {
      API.Auth.clear();
      setUser(null);
      return null;
    }
  }

  async function render() {
    const path = location.hash.replace(/^#/, '') || '/';
    appEl.innerHTML = '';

    const user = await ensureUser();

    // ---- Public routes ----
    if (path === '/' || path === '') {
      if (user) return go(homeFor(user));
      return appEl.appendChild(Views.Landing(go));
    }
    if (path === '/login') {
      if (user) return go(homeFor(user));
      return appEl.appendChild(Views.Login(go, (u) => { setUser(u); go(homeFor(u)); }));
    }
    if (path === '/register') {
      if (user) return go(homeFor(user));
      return appEl.appendChild(Views.Register(go, (u) => { setUser(u); go(homeFor(u)); }));
    }

    // ---- Auth-required routes below ----
    if (!user) return go('/login');

    // Admin route — admins only
    if (path === '/admin') {
      if (user.role !== 'ADMIN') return go('/dashboard');
      const node = await Views.AdminPanel(go);
      return appEl.appendChild(node);
    }

    // Parent routes — admins shouldn't be in here, redirect them to /admin
    if (user.role === 'ADMIN') return go('/admin');

    if (path === '/dashboard') {
      const node = await Views.Dashboard(go);
      return appEl.appendChild(node);
    }
    if (path === '/child/new') {
      return appEl.appendChild(Views.AddChild(go));
    }

    let m;
    if ((m = path.match(/^\/child\/([^/]+)$/))) {
      const node = await Views.ChildHome(go, m[1]);
      return appEl.appendChild(node);
    }
    if ((m = path.match(/^\/lesson\/([^/]+)\/([^/]+)$/))) {
      const node = await Views.LessonView(go, m[1], m[2]);
      return appEl.appendChild(node);
    }

    // 404
    appEl.appendChild(
      Object.assign(document.createElement('div'), {
        innerHTML: '<div style="padding:60px; text-align:center;"><h2>Page not found</h2><a href="#/dashboard">Back</a></div>',
      })
    );
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('DOMContentLoaded', render);
  if (document.readyState !== 'loading') render();
})();
