(function () {
  const { h } = UI;

  async function AdminProfile(go) {
    const root = h('section', { class: 'admin-page' }, h('p', {}, 'Loading…'));

    let me;
    try {
      me = await API.me();
    } catch (e) {
      root.innerHTML = `<p style="color:#c0392b">${e.message}</p>`;
      return root;
    }

    let stats;
    try {
      stats = await API.adminStats();
    } catch (_) {
      stats = null;
    }

    root.innerHTML = '';

    const errBox = h('div', { class: 'form-error hidden' });
    const nameIn  = h('input', { type: 'text',  value: me.name,  required: true });
    const emailIn = h('input', { type: 'email', value: me.email, required: true });
    const currPwIn = h('input', { type: 'password', placeholder: 'Required to change password' });
    const newPwIn  = h('input', { type: 'password', placeholder: 'New password (min 6 chars)' });
    const saveBtn  = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Save changes');

    async function onSubmit(ev) {
      ev.preventDefault();
      errBox.classList.add('hidden');

      const data = {};
      const newName  = nameIn.value.trim();
      const newEmail = emailIn.value.trim().toLowerCase();
      const newPw    = newPwIn.value;
      const currPw   = currPwIn.value;

      if (newName  !== me.name)  data.name = newName;
      if (newEmail !== me.email) data.email = newEmail;
      if (newPw) {
        data.newPassword     = newPw;
        data.currentPassword = currPw;
      }

      if (Object.keys(data).length === 0) {
        errBox.textContent = 'Nothing to update';
        errBox.classList.remove('hidden');
        return;
      }

      saveBtn.disabled = true; saveBtn.textContent = '…';
      try {
        const updated = await API.updateParent(me.id, data);
        me = { ...me, ...updated };
        Toast.success('Profile updated!');
        currPwIn.value = '';
        newPwIn.value  = '';
        const topName = document.getElementById('parent-name');
        if (topName) topName.textContent = `${updated.name} (admin)`;
      } catch (e) {
        errBox.textContent = e.message;
        errBox.classList.remove('hidden');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save changes';
      }
    }
    const statsBlock = stats ? h('div', { class: 'admin-profile-stats' },
      statCard('👨‍👩‍👧', 'Parents', stats.totals.parents),
      statCard('🧒', 'Learners', stats.totals.children),
      statCard('📖', 'Lessons', stats.totals.lessons),
      statCard('🏅', 'Badges awarded', stats.totals.badgesAwarded),
    ) : null;

    function statCard(emoji, label, value) {
      return h('div', { class: 'admin-profile-stat-card' },
        h('div', { class: 'stat-emoji' }, emoji),
        h('div', { class: 'stat-value' }, String(value)),
        h('div', { class: 'stat-label' }, label),
      );
    }

    const form = h('form', { class: 'auth-card', onsubmit: onSubmit },
      h('h2', {}, '⚙️ Admin profile'),
      h('p', { class: 'sub' }, 'Update your name, email, or password.'),
      errBox,

      h('div', { class: 'profile-meta' },
        h('div', { class: 'profile-meta-item' },
          h('span', { class: 'profile-meta-label' }, 'Role'),
          h('span', { class: 'profile-meta-value' }, '🛡 Admin'),
        ),
        h('div', { class: 'profile-meta-item' },
          h('span', { class: 'profile-meta-label' }, 'Joined'),
          h('span', { class: 'profile-meta-value' },
            me.createdAt
              ? new Date(me.createdAt).toLocaleDateString()
              : '—'
          ),
        ),
      ),

      h('div', { class: 'field' }, h('label', {}, 'Name'),  nameIn),
      h('div', { class: 'field' }, h('label', {}, 'Email'), emailIn),

      h('div', { class: 'profile-divider' }, 'Change password (optional)'),
      h('div', { class: 'field' }, h('label', {}, 'Current password'), currPwIn),
      h('div', { class: 'field' }, h('label', {}, 'New password'),     newPwIn),

      saveBtn,
      h('div', { class: 'auth-switch' },
        h('a', { onclick: () => go('/admin') }, '← Back to admin panel')),
    );

    root.appendChild(
      h('div', { class: 'admin-profile-layout' },
        h('div', { class: 'admin-profile-left' }, form),
        statsBlock
          ? h('div', { class: 'admin-profile-right' },
              h('h2', { style: 'margin:0 0 16px;' }, 'Platform overview'),
              statsBlock,
            )
          : null,
      )
    );

    return root;
  }

  Views.AdminProfile = AdminProfile;
})();