(function () {
  const { h } = UI;
  function makeForm({ title, sub, fields, submitLabel, switchPrompt, switchLabel, switchTo, onSubmit, go }) {
    const errBox = h('div', { class: 'form-error hidden' });
    const inputs = fields.map((f) => h('input', { type: f.type, placeholder: f.placeholder, required: true, ...(f.minlength ? { minlength: f.minlength } : {}) }));
    const submit = h('button', { class: 'btn btn-primary', type: 'submit' }, submitLabel);

    async function submitHandler(ev) {
      ev.preventDefault();
      errBox.classList.add('hidden');
      submit.disabled = true; submit.textContent = '…';
      try {
        await onSubmit(inputs.map((i) => i.value.trim()));
      } catch (e) {
        errBox.textContent = e.message;
        errBox.classList.remove('hidden');
      } finally {
        submit.disabled = false; submit.textContent = submitLabel;
      }
    }

    return h('section', { class: 'auth-wrap' },
      h('form', { class: 'auth-card', onsubmit: submitHandler },
        h('h2', {}, title),
        h('p', { class: 'sub' }, sub),
        errBox,
        ...fields.map((f, i) => h('div', { class: 'field' }, h('label', {}, f.label), inputs[i])),
        submit,
        h('div', { class: 'auth-switch' }, switchPrompt, ' ',
          h('a', { onclick: () => go(switchTo) }, switchLabel)),
      ),
    );
  }

  function Login(go, onAuth) {
    return makeForm({
      go,
      title: 'Welcome back',
      sub: 'Log in to keep learning together.',
      fields: [
        { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        { label: 'Password', type: 'password', placeholder: '••••••' },
      ],
      submitLabel: 'Log in',
      switchPrompt: 'New here?',
      switchLabel: 'Create an account',
      switchTo: '/register',
      onSubmit: async ([email, password]) => {
        const { token, user } = await API.login(email, password);
        API.Auth.token = token;
        onAuth(user);
      },
    });
  }

  function Register(go, onAuth) {
    return makeForm({
      go,
      title: 'Hello, parent!',
      sub: "Create an account to set up your child's learning.",
      fields: [
        { label: 'Your name', type: 'text', placeholder: 'Your name' },
        { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        { label: 'Password', type: 'password', placeholder: 'At least 6 characters', minlength: '6' },
      ],
      submitLabel: 'Create account',
      switchPrompt: 'Already a parent here?',
      switchLabel: 'Log in',
      switchTo: '/login',
      onSubmit: async ([name, email, password]) => {
        const { token, user } = await API.register(email, password, name);
        API.Auth.token = token;
        onAuth(user);
      },
    });
  }
  Views.Login = Login;
  Views.Register = Register;
})();
