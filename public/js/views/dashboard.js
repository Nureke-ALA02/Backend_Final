/* eslint-env browser */
/* global API, UI, Views, Toast */
(function () {
  const { h } = UI;
  const AVATARS = ['🦊', '🐻', '🐼', '🦁', '🐸', '🐯', '🐰', '🐨'];
  const PIN_RE = /^\d{4}$/;

  // ============================================================
  // DASHBOARD
  // ============================================================
  async function Dashboard(go) {
    const grid = h('div', { class: 'kid-grid' }, h('p', {}, 'Loading…'));
   const root = h('section', { class: 'parent-page' },
  h('div', { style: 'display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:20px;' },
    h('div', {},
      h('h1', { style: 'margin:0;' }, 'Your learners'),
      h('p', { style: 'color:#6b7280; margin:6px 0 0;' },
        "Each kid logs in separately so their progress stays their own."),
    ),
    h('button', {
      class: 'btn btn-ghost',
      onclick: () => go('/leaderboard'),
    }, '🏆 Leaderboard'),
  ),
  grid,
);

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
    const card = h('div', { class: 'kid-card' });

    card.appendChild(h('div', { class: 'kid-avatar' }, c.avatar));
    card.appendChild(h('div', { class: 'kid-name' }, c.name));
    card.appendChild(h('div', { style: 'color:#6b7280' }, `Age ${c.age}`));

    card.appendChild(h('div', { class: 'kid-stats' },
      h('span', { class: 'stat-chip' }, `⭐ ${c.xp} XP`),
      h('span', { class: 'stat-chip' }, `🔥 ${c.streak} day${c.streak === 1 ? '' : 's'}`),
      h('span', { class: 'stat-chip' }, `🏅 ${c.badges.length}`),
      h('span', { class: 'stat-chip' }, c.hasPin ? '🔒 PIN set' : '⚠️ no PIN'),
    ));

    card.appendChild(h('div', { class: 'kid-actions' },
      h('button', {
        class: 'btn btn-ghost kid-action-btn',
        onclick: () => go(`/child/${c.id}/edit`),
      }, '✏️ Edit'),
      h('button', {
        class: 'btn btn-ghost kid-action-btn danger',
        onclick: async () => {
          if (!confirm(`Delete ${c.name}? All progress will be lost.`)) return;
          try {
            await API.deleteChild(c.id);
            Toast.success(`${c.name} removed`);
            location.hash = '';
            setTimeout(() => { location.hash = '/dashboard'; }, 10);
          } catch (e) {
            Toast.error(e.message);
          }
        },
      }, '🗑 Delete'),
    ));

    return card;
  }

  // ============================================================
  // ADD CHILD
  // ============================================================
  function AddChild(go) {
    return childForm(go, {
      mode: 'create',
      title: 'Add a child',
      sub: 'Pick a name, age, avatar, and optional PIN.',
      submitLabel: 'Add child',
      onSubmit: async (data) => {
        const child = await API.createChild(data);
        Toast.success(`${child.name} added to your family!`);
        go('/dashboard');
        return child;
      },
    });
  }

  // ============================================================
  // EDIT CHILD
  // ============================================================
  async function EditChild(go, childId) {
    let existing;
    try {
      existing = await API.getChild(childId);
    } catch (e) {
      return h('div', { style: 'padding:60px; text-align:center; color:#c0392b;' }, e.message);
    }

    return childForm(go, {
      mode: 'edit',
      title: `Edit ${existing.name}`,
      sub: 'Change name, age, avatar, or update PIN.',
      submitLabel: 'Save changes',
      initial: existing,
      onSubmit: async (data) => {
        await API.updateChild(childId, data);
        Toast.success(`${existing.name} updated`);
        go('/dashboard');
      },
    });
  }

  // ============================================================
  // SHARED FORM
  // ============================================================
  function childForm(go, opts) {
    const initial = opts.initial || {};
    const errBox = h('div', { class: 'form-error hidden' });
    const nameIn = h('input', { type: 'text', placeholder: 'e.g. Mia', required: true, value: initial.name || '' });
    const ageIn  = h('input', { type: 'number', min: '3', max: '8', value: String(initial.age || 5), required: true });
    const pinIn  = h('input', {
      type: 'tel', inputmode: 'numeric', pattern: '\\d{4}', maxlength: '4',
      placeholder: opts.mode === 'edit' && initial.hasPin ? '••••' : '4-digit PIN (optional)',
    });

    let pickedAvatar = initial.avatar || AVATARS[0];
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

    const submit = h('button', { class: 'btn btn-primary', type: 'submit' }, opts.submitLabel);

    let removePin = false;
    const removePinBtn = (opts.mode === 'edit' && initial.hasPin)
      ? h('button', {
          type: 'button',
          class: 'btn btn-ghost',
          style: 'color:#c0392b;',
          onclick: () => {
            if (confirm('Remove the PIN? Anyone with this profile name will be able to log in.')) {
              removePin = true;
              submit.click();
            }
          },
        }, 'Remove PIN')
      : null;

    async function onSubmit(ev) {
      ev.preventDefault();
      errBox.classList.add('hidden');

      const data = {};

      if (opts.mode === 'create' || nameIn.value.trim() !== (initial.name || '')) {
        data.name = nameIn.value.trim();
      }
      if (opts.mode === 'create' || Number(ageIn.value) !== initial.age) {
        data.age = Number(ageIn.value);
      }
      if (opts.mode === 'create' || pickedAvatar !== initial.avatar) {
        data.avatar = pickedAvatar;
      }
      if (pinIn.value) {
        if (!PIN_RE.test(pinIn.value)) {
          errBox.textContent = 'PIN must be 4 digits';
          errBox.classList.remove('hidden');
          return;
        }
        data.pin = pinIn.value;
      }
      if (removePin) data.removePin = true;

      submit.disabled = true; submit.textContent = '…';
      try {
        await opts.onSubmit(data);
      } catch (e) {
        errBox.textContent = e.message;
        errBox.classList.remove('hidden');
        submit.disabled = false; submit.textContent = opts.submitLabel;
        removePin = false;
      }
    }

    return h('section', { class: 'auth-wrap' },
      h('form', { class: 'auth-card', onsubmit: onSubmit },
        h('h2', {}, opts.title),
        h('p', { class: 'sub' }, opts.sub),
        errBox,
        h('div', { class: 'field' }, h('label', {}, 'Name'), nameIn),
        h('div', { class: 'field' }, h('label', {}, 'Age (3–8)'), ageIn),
        h('div', { class: 'field' }, h('label', {}, 'Avatar'), avatarRow),
        h('div', { class: 'field' },
          h('label', {}, opts.mode === 'edit' && initial.hasPin ? 'Change PIN (leave empty to keep current)' : 'PIN (4 digits, optional)'),
          pinIn,
        ),
        submit,
        removePinBtn,
        h('div', { class: 'auth-switch' },
          h('a', { onclick: () => go('/dashboard') }, '← Back to dashboard')),
      ),
    );
  }

  Views.Dashboard = Dashboard;
  Views.AddChild = AddChild;
  Views.EditChild = EditChild;
})();