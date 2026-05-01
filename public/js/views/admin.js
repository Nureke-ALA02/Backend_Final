(function () {
  const { h } = UI;

  async function AdminPanel() {
    const statsGrid = h('div', { class: 'stats-grid' }, h('p', {}, 'Loading stats…'));
    const parentsPanel  = h('div', { class: 'admin-panel' }, h('h2', {}, 'Parents'),  h('p', {}, 'Loading…'));
    const childrenPanel = h('div', { class: 'admin-panel' }, h('h2', {}, 'Learners'), h('p', {}, 'Loading…'));
    const root = h('section', { class: 'admin-page' },
      h('div', { class: 'admin-header' },
        h('h1', {}, 'Admin Panel'),
        h('p', {}, 'Platform overview and learner progress.'),
      ),
      statsGrid,
      h('div', { class: 'admin-columns' }, parentsPanel, childrenPanel),
    );
    loadStats(statsGrid);
    loadParents(parentsPanel);
    loadChildren(childrenPanel);

    return root;
  }

  async function loadStats(container) {
    try {
      const s = await API.adminStats();
      const cards = [
        { label: 'Parents',           value: s.totals.parents,                    emoji: '👨‍👩‍👧' },
        { label: 'Learners',          value: s.totals.children,                   emoji: '🧒' },
        { label: 'Active today',      value: s.activity.activeChildrenToday,      emoji: '⚡' },
        { label: 'Lessons this week', value: s.activity.lessonsCompletedThisWeek, emoji: '📚' },
        { label: 'Lessons total',     value: s.activity.lessonsCompletedTotal,    emoji: '🏁' },
        { label: 'Badges awarded',    value: s.totals.badgesAwarded,              emoji: '🏅' },
        { label: 'Avg completion',    value: Math.round(s.activity.avgCompletionRate * 100) + '%', emoji: '📊' },
        { label: 'Curriculum',        value: `${s.totals.units} units · ${s.totals.lessons} lessons`, emoji: '📖' },
      ];
      container.innerHTML = '';
      for (const c of cards) {
        container.appendChild(h('div', { class: 'stat-card' },
          h('div', { class: 'stat-emoji' }, c.emoji),
          h('div', { class: 'stat-value' }, String(c.value)),
          h('div', { class: 'stat-label' }, c.label),
        ));
      }
    } catch (e) {
      container.innerHTML = `<p style="color:#c0392b">${e.message}</p>`;
    }
  }

  async function loadParents(container) {
    try {
      const data = await API.adminParents({ page: 1 });
      container.innerHTML = '';
      container.appendChild(h('h2', {}, `Parents (${data.total})`));

      if (data.parents.length === 0) {
        container.appendChild(h('p', { class: 'empty' }, 'No parents registered yet.'));
        return;
      }

      const tbody = h('tbody', {});
      for (const p of data.parents) {
        tbody.appendChild(h('tr', {},
          h('td', {}, p.name),
          h('td', {}, p.email),
          h('td', {}, String(p.childCount)),
          h('td', {}, new Date(p.createdAt).toLocaleDateString()),
        ));
      }
      container.appendChild(h('table', { class: 'admin-table' },
        h('thead', {}, h('tr', {},
          h('th', {}, 'Name'), h('th', {}, 'Email'),
          h('th', {}, 'Children'), h('th', {}, 'Joined'),
        )),
        tbody,
      ));
    } catch (e) {
      container.innerHTML = `<h2>Parents</h2><p style="color:#c0392b">${e.message}</p>`;
    }
  }
  async function loadChildren(container) {
    try {
      const data = await API.adminChildren({ page: 1 });
      container.innerHTML = '';
      container.appendChild(h('h2', {}, `Learners (${data.total})`));

      if (data.children.length === 0) {
        container.appendChild(h('p', { class: 'empty' }, 'No learners yet.'));
        return;
      }
      const tbody = h('tbody', {});
      for (const c of data.children) {
        const bar = h('div', { class: 'mini-bar' },
          h('div', { class: 'mini-bar-fill', style: `width:${c.progressPct}%` }),
        );
        tbody.appendChild(h('tr', {},
          h('td', { class: 'avatar-cell' }, c.avatar),
          h('td', {}, c.name),
          h('td', {}, String(c.age)),
          h('td', { class: 'muted' }, c.parent ? c.parent.name : '—'),
          h('td', {}, String(c.xp)),
          h('td', {}, `🔥 ${c.streak}`),
          h('td', { class: 'progress-cell' }, bar, h('span', { class: 'muted' }, `${c.progressPct}%`)),
          h('td', {}, `🏅 ${c.badgeCount}`),
        ));
      }
      container.appendChild(h('table', { class: 'admin-table' },
        h('thead', {}, h('tr', {},
          h('th', {}, ''), h('th', {}, 'Name'), h('th', {}, 'Age'),
          h('th', {}, 'Parent'), h('th', {}, 'XP'), h('th', {}, 'Streak'),
          h('th', {}, 'Progress'), h('th', {}, 'Badges'),
        )),
        tbody,
      ));
    } catch (e) {
      container.innerHTML = `<h2>Learners</h2><p style="color:#c0392b">${e.message}</p>`;
    }
  }
  Views.AdminPanel = AdminPanel;
})();
