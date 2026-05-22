(function () {
  const { h } = UI;

  async function AdminLeaderboard(go) {
    let sortBy = 'xp';
    let ageFilter = '';

    const content = h('div', { class: 'leaderboard-content' }, h('p', {}, 'Loading…'));

    const root = h('section', { class: 'admin-page' },
      h('div', { class: 'admin-header' },
        h('div', {},
          h('h1', {}, '🏆 Leaderboard'),
          h('p', {}, 'Top learners by XP, streak, or badges.'),
        ),
        h('div', { style: 'display:flex; gap:10px;' },
          h('button', { class: 'btn btn-ghost', onclick: () => go('/admin') }, '← Stats'),
        ),
      ),
      filterBar(),
      content,
    );

    function filterBar() {
      const bar = h('div', { class: 'leaderboard-filters' });

      const sortGroup = h('div', { class: 'filter-group' },
        h('label', {}, 'Sort by:'),
      );
      for (const opt of [
        { v: 'xp',     label: '⭐ XP' },
        { v: 'streak', label: '🔥 Streak' },
        { v: 'badges', label: '🏅 Badges' },
      ]) {
        const btn = h('button', {
          class: `filter-pill ${sortBy === opt.v ? 'active' : ''}`,
          onclick: () => { sortBy = opt.v; reload(); },
        }, opt.label);
        sortGroup.appendChild(btn);
      }
      bar.appendChild(sortGroup);
      const ageGroup = h('div', { class: 'filter-group' },
        h('label', {}, 'Age:'),
      );
      const ageOptions = [
        { v: '',  label: 'All' }, { v: '3', label: '3' }, { v: '4', label: '4' },
        { v: '5', label: '5' },   { v: '6', label: '6' }, { v: '7', label: '7' },
        { v: '8', label: '8' },
      ];
      for (const opt of ageOptions) {
        const btn = h('button', {
          class: `filter-pill ${ageFilter === opt.v ? 'active' : ''}`,
          onclick: () => { ageFilter = opt.v; reload(); },
        }, opt.label);
        ageGroup.appendChild(btn);
      }
      bar.appendChild(ageGroup);

      return bar;
    }

    async function reload() {
      const oldBar = root.querySelector('.leaderboard-filters');
      if (oldBar) oldBar.replaceWith(filterBar());

      content.innerHTML = '<p>Loading…</p>';
      try {
        const data = await API.adminLeaderboard({
          sortBy,
          age: ageFilter ? Number(ageFilter) : null,
        });
        renderLeaderboard(content, data);
      } catch (e) {
        content.innerHTML = `<p style="color:#c0392b">${e.message}</p>`;
      }
    }

    function renderLeaderboard(container, data) {
      container.innerHTML = '';
      if (data.leaderboard.length === 0) {
        container.appendChild(h('div', { class: 'empty-state' },
          h('div', { class: 'emoji' }, '🏆'),
          h('p', {}, 'No learners yet.'),
        ));
        return;
      }
      const top3 = data.leaderboard.slice(0, 3);
      const rest = data.leaderboard.slice(3);

      const podium = h('div', { class: 'leaderboard-podium' });
      const medals = ['🥇', '🥈', '🥉'];
      const order = top3.length === 3 ? [1, 0, 2] : top3.length === 2 ? [1, 0] : [0];
      for (const idx of order) {
        const row = top3[idx];
        if (!row) continue;
        podium.appendChild(podiumCard(row, medals[idx], idx === 0, data.sortBy));
      }
      container.appendChild(podium);
      if (rest.length > 0) {
        const tbody = h('tbody', {});
        for (const row of rest) {
          tbody.appendChild(h('tr', {},
            h('td', { class: 'rank-cell' }, `#${row.rank}`),
            h('td', { class: 'avatar-cell' }, row.avatar),
            h('td', {}, row.name),
            h('td', {}, `Age ${row.age}`),
            h('td', { class: 'muted' }, row.parentName),
            h('td', { class: `metric ${data.sortBy === 'xp' ? 'highlight' : ''}` }, `⭐ ${row.xp}`),
            h('td', { class: `metric ${data.sortBy === 'streak' ? 'highlight' : ''}` }, `🔥 ${row.streak}`),
            h('td', { class: `metric ${data.sortBy === 'badges' ? 'highlight' : ''}` }, `🏅 ${row.badgeCount}`),
          ));
        }

        container.appendChild(
          h('div', { class: 'leaderboard-table-wrap' },
            h('table', { class: 'admin-table leaderboard-table' },
              h('thead', {}, h('tr', {},
                h('th', {}, 'Rank'),
                h('th', {}, ''),
                h('th', {}, 'Name'),
                h('th', {}, 'Age'),
                h('th', {}, 'Parent'),
                h('th', {}, 'XP'),
                h('th', {}, 'Streak'),
                h('th', {}, 'Badges'),
              )),
              tbody,
            ),
          )
        );
      }

      container.appendChild(
        h('p', { class: 'leaderboard-footer' },
          `Showing ${data.leaderboard.length} of ${data.total} learners`)
      );
    }

    function podiumCard(row, medal, isFirst, sortBy) {
      const metricLabel =
        sortBy === 'streak' ? `🔥 ${row.streak} days` :
        sortBy === 'badges' ? `🏅 ${row.badgeCount} badges` :
        `⭐ ${row.xp} XP`;

      return h('div', { class: `podium-card ${isFirst ? 'first' : ''}` },
        h('div', { class: 'podium-medal' }, medal),
        h('div', { class: 'podium-avatar' }, row.avatar),
        h('div', { class: 'podium-name' }, row.name),
        h('div', { class: 'podium-meta' }, `Age ${row.age} · ${row.parentName}`),
        h('div', { class: 'podium-metric' }, metricLabel),
        h('div', { class: 'podium-stats' },
          sortBy !== 'xp'     ? h('span', {}, `⭐ ${row.xp}`)        : null,
          sortBy !== 'streak' ? h('span', {}, `🔥 ${row.streak}`)    : null,
          sortBy !== 'badges' ? h('span', {}, `🏅 ${row.badgeCount}`) : null,
        ),
      );
    }

    reload();
    return root;
  }

  Views.AdminLeaderboard = AdminLeaderboard;
})();