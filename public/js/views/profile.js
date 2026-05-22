(function () {
  const { h } = UI;

  async function Profile(go) {
    const root = h('section', { class: 'auth-wrap' }, h('p', {}, 'Loading…'));

    let me;
    try {
      me = await API.me();
    } catch (e) {
      root.innerHTML = `<p style="color:#c0392b">${e.message}</p>`;
      return root;
    }

    if (me.role === 'CHILD') {
      root.innerHTML = '<p style="padding:40px; text-align:center;">Children cannot edit their profile here.</p>';
      return root;
    }

    let profile;
    try {
      profile = await API.getParent(me.id);
    } catch (e) {
      root.innerHTML = `<p style="color:#c0392b">${e.message}</p>`;
      return root;
    }

    root.innerHTML = '';
    const errBox = h('div', { class: 'form-error hidden' });
    const okBox  = h('div', { class: 'form-success hidden' });

    const nameIn  = h('input', { type: 'text',  value: profile.name, required: true });
    const emailIn = h('input', { type: 'email', value: profile.email, required: true });

    const currentPwIn = h('input', { type: 'password', placeholder: 'Required to change password' });
    const newPwIn     = h('input', { type: 'password', placeholder: 'Leave empty to keep current' });

    const saveBtn = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Save changes');

    async function onSubmit(ev) {
      ev.preventDefault();
      errBox.classList.add('hidden');
      okBox.classList.add('hidden');

      const data = {};
      const newName  = nameIn.value.trim();
      const newEmail = emailIn.value.trim().toLowerCase();
      const newPw    = newPwIn.value;
      const currPw   = currentPwIn.value;

      if (newName !== profile.name)             data.name = newName;
      if (newEmail !== profile.email)           data.email = newEmail;
      if (newPw) {
        data.newPassword = newPw;
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
        profile = updated;
        Toast.success('Profile updated!');
        currentPwIn.value = '';
        newPwIn.value = '';
        const topName = document.getElementById('parent-name');
        if (topName) topName.textContent = `Hi, ${updated.name}`;
      } catch (e) {
        errBox.textContent = e.message;
        errBox.classList.remove('hidden');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save changes';
      }
    }

    const card = h('form', { class: 'auth-card', onsubmit: onSubmit },
      h('h2', {}, 'Your profile'),
      h('p', { class: 'sub' }, 'Update your name, email, or password.'),
      errBox,
      okBox,

      h('div', { class: 'profile-meta' },
        h('div', { class: 'profile-meta-item' },
          h('span', { class: 'profile-meta-label' }, 'Children'),
          h('span', { class: 'profile-meta-value' }, String(profile.childCount || 0)),
        ),
        h('div', { class: 'profile-meta-item' },
          h('span', { class: 'profile-meta-label' }, 'Joined'),
          h('span', { class: 'profile-meta-value' }, new Date(profile.createdAt).toLocaleDateString()),
        ),
      ),

      h('div', { class: 'field' }, h('label', {}, 'Name'),  nameIn),
      h('div', { class: 'field' }, h('label', {}, 'Email'), emailIn),

      h('div', { class: 'profile-divider' }, 'Change password (optional)'),
      h('div', { class: 'field' }, h('label', {}, 'Current password'), currentPwIn),
      h('div', { class: 'field' }, h('label', {}, 'New password'), newPwIn),

      saveBtn,
      h('div', { class: 'auth-switch' },
        h('a', { onclick: () => go('/dashboard') }, '← Back to dashboard')),
    );

    root.appendChild(card);
    return root;
  }

  Views.Profile = Profile;
})();