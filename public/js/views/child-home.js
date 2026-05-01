(function () {
  const { h } = UI;

  async function ChildHome(go, childId) {
    const root = h('section', { class: 'child-page' }, h('p', {}, 'Loading…'));
    try {
      const child = await API.getChild(childId);
      const { units } = await API.curriculumFor(childId);

      root.innerHTML = '';
      root.appendChild(
        h('div', { class: 'child-header' },
          h('button', { class: 'child-back', onclick: () => go('/dashboard') }, '← Parents'),
          h('div', { class: 'avatar' }, child.avatar),
          h('div', {},
            h('h2', {}, `Hi, ${child.name}!`),
            h('div', { class: 'meta' }, `⭐ ${child.xp} XP   🔥 ${child.streak}-day streak`),
          ),
        )
      );

      for (const u of units) root.appendChild(unitBlock(u, childId, go));
    } catch (e) {
      root.innerHTML = `<p style="color:#c0392b; text-align:center; padding:40px;">${e.message}</p>`;
    }
    return root;
  }

  function unitBlock(u, childId, go) {
    const path = h('div', { class: 'lesson-path' });
    for (const l of u.lessons) {
      const node = h('div', { class: `lesson-node ${l.status}` },
        h('div', { class: 'lesson-icon' },
          l.status === 'completed' ? '✓' : l.status === 'locked' ? '🔒' : '▶'),
        h('div', { class: 'lesson-info' },
          h('h4', {}, l.title),
          h('p', {}, `${l.exerciseCount} exercise${l.exerciseCount === 1 ? '' : 's'}`),
        ),
      );
      if (l.status !== 'locked') {
        node.addEventListener('click', () => go(`/lesson/${childId}/${l.id}`));
      }
      path.appendChild(node);
    }
    return h('div', { class: 'unit-block' },
      h('h3', { class: 'unit-title' }, u.title),
      h('p', { class: 'unit-desc' }, u.description),
      path,
    );
  }

  Views.ChildHome = ChildHome;
})();
