(function () {
  const { h } = UI;
  const AVATARS = ['🦊', '🐻', '🐼', '🦁', '🐸', '🐯', '🐰', '🐨'];

  async function Dashboard(go) {
    const grid = h('div', { class: 'kid-grid' }, h('p', {}, 'Loading…'));
    const root = h('section', { class: 'parent-page' }, h('h1', {}, 'Your learners'), grid);

    try {
      const { children } = await API.listChildren();
      grid.innerHTML = '';

      if (children.length === 0) {
        grid.appendChild(h('div', { class: 'empty-state' },
          h('div', { class: 'emoji' }, '🧸'),
          h('p', {}, 'No children yet. Add one to start learning!'),
        ));
      } else {
        for (const c of children) grid.appendChild(kidCard(c, go));
      }

      grid.appendChild(h('div', { class: 'add-kid', onclick: () => go('/child/new') }, '＋', 'Add a child'));
    } catch (e) {
      grid.innerHTML = `<p style="color:#c0392b">${e.message}</p>`;
    }

    return root;
  }

  function kidCard(c, go) {
    return h('div', { class: 'kid-card', onclick: () => go(`/child/${c.id}`) },
      h('div', { class: 'kid-avatar' }, c.avatar),
      h('div', { class: 'kid-name' }, c.name),
      h('div', { style: 'color:#6b7280' }, `Age ${c.age}`),
      h('div', { class: 'kid-stats' },
        h('span', { class: 'stat-chip' }, `⭐ ${c.xp} XP`),
        h('span', { class: 'stat-chip' }, `🔥 ${c.streak} day${c.streak === 1 ? '' : 's'}`),
        h('span', { class: 'stat-chip' }, `🏅 ${c.badges.length}`),
      ),
      h('button', {
        class: 'play-btn',
        onclick: (e) => { e.stopPropagation(); go(`/child/${c.id}`); },
      }, "Let's learn"),
    );
  }

  function AddChild(go) {
    const errBox = h('div', { class: 'form-error hidden' });
    const nameIn = h('input', { type: 'text', placeholder: 'e.g. Mia', required: true });
    const ageIn  = h('input', { type: 'number', min: '3', max: '8', value: '5', required: true });

    let pickedAvatar = AVATARS[0];
    const avatarRow = h('div', { style: 'display:flex; gap:10px; flex-wrap:wrap;' });
    AVATARS.forEach((a) => {
      const btn = h('button', {
        type: 'button',
        style: `font-size:36px; width:60px; height:60px; border-radius:14px; border:3px solid ${a === pickedAvatar ? '#2d9cdb' : '#e8eaf0'}; background:white; cursor:pointer;`,
        onclick: () => {
          pickedAvatar = a;
          [...avatarRow.children].forEach((c, i) => {
            c.style.borderColor = AVATARS[i] === pickedAvatar ? '#2d9cdb' : '#e8eaf0';
          });
        },
      }, a);
      avatarRow.appendChild(btn);
    });

    const submit = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Add child');

    async function onSubmit(ev) {
      ev.preventDefault();
      errBox.classList.add('hidden');
      submit.disabled = true; submit.textContent = 'Saving…';
      try {
        const child = await API.createChild({
          name: nameIn.value.trim(),
          age: Number(ageIn.value),
          avatar: pickedAvatar,
        });
        go(`/child/${child.id}`);
      } catch (e) {
        errBox.textContent = e.message;
        errBox.classList.remove('hidden');
        submit.disabled = false; submit.textContent = 'Add child';
      }
    }

    return h('section', { class: 'auth-wrap' },
      h('form', { class: 'auth-card', onsubmit: onSubmit },
        h('h2', {}, 'Add a child'),
        h('p', { class: 'sub' }, 'Pick a name, age, and avatar.'),
        errBox,
        h('div', { class: 'field' }, h('label', {}, 'Name'), nameIn),
        h('div', { class: 'field' }, h('label', {}, 'Age (3–8)'), ageIn),
        h('div', { class: 'field' }, h('label', {}, 'Avatar'), avatarRow),
        submit,
      ),
    );
  }

  Views.Dashboard = Dashboard;
  Views.AddChild = AddChild;
})();
