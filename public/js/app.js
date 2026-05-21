(function () {
  const appEl = document.getElementById('app');
  const topbar = document.getElementById('topbar');
  const parentNameEl = document.getElementById('parent-name');
  const logoutBtn = document.getElementById('logout-btn');

  let currentUser = null;

  function go(path) { location.hash = '#' + path; }

  function homeFor(user) {
    if (!user) return '/';
    if (user.role === 'ADMIN')  return '/admin';
    if (user.role === 'CHILD')  return `/play/${user.id}`;
    return '/dashboard';
  }

  function setUser(user) {
    currentUser = user;
    if (user) {
      topbar.classList.remove('hidden');
      let label = `Hi, ${user.name}`;
      if (user.role === 'ADMIN') label += ' (admin)';
      if (user.role === 'CHILD') label = `${user.avatar || ''} ${user.name}`;
      parentNameEl.textContent = label;
      parentNameEl.style.cursor = 'pointer';
parentNameEl.onclick = () => {
  if (currentUser && currentUser.role !== 'CHILD') go('/profile');
};
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
    if (path === '/kid-login') {
      if (user) return go(homeFor(user));
      return appEl.appendChild(Views.KidLogin(go, (childUser) => { setUser(childUser); go(homeFor(childUser)); }));
    }

    if (!user) return go('/login');

    if (path === '/admin') {
      if (user.role !== 'ADMIN') return go(homeFor(user));
      const node = await Views.AdminPanel(go);
      return appEl.appendChild(node);
    }
    if (path === '/admin/curriculum') {
      if (user.role !== 'ADMIN') return go(homeFor(user));
      const node = await Views.AdminCurriculum(go);
      return appEl.appendChild(node);
    }
    if (path === '/admin/leaderboard') {
  if (user.role !== 'ADMIN') return go(homeFor(user));
  const node = await Views.AdminLeaderboard(go);
  return appEl.appendChild(node);
}

    if (user.role === 'ADMIN') return go('/admin');

    let m;
    if ((m = path.match(/^\/play\/([^/]+)$/))) {
      const childId = m[1];
      if (user.role === 'CHILD' && user.id !== childId) return go(homeFor(user));
      const node = await Views.ChildHome(go, childId);
      return appEl.appendChild(node);
    }
    if ((m = path.match(/^\/play\/([^/]+)\/lesson\/([^/]+)$/))) {
      const childId = m[1];
      if (user.role === 'CHILD' && user.id !== childId) return go(homeFor(user));
      const node = await Views.LessonView(go, childId, m[2]);
      return appEl.appendChild(node);
    }

    if (user.role === 'CHILD') return go(homeFor(user));

    if (path === '/dashboard') {
      const node = await Views.Dashboard(go);
      return appEl.appendChild(node);
    }
    if (path === '/child/new') {
      return appEl.appendChild(Views.AddChild(go));
    }
    if (path === '/profile') {
<<<<<<< HEAD
  const node = await Views.Profile(go);
  return appEl.appendChild(node);
    }
    if (path === '/leaderboard') {
  const node = await Views.Leaderboard(go);
  return appEl.appendChild(node);
=======
      const node = await Views.Profile(go);
      return appEl.appendChild(node);
>>>>>>> 16d75dd7cd15e88b4b7499df16a72e6228c40f7c
    }
    if ((m = path.match(/^\/child\/([^/]+)\/edit$/))) {
      const node = await Views.EditChild(go, m[1]);
      return appEl.appendChild(node);
    }

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
