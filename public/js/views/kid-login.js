/* eslint-env browser */
/* global API, UI, Views */
(function () {
  const { h } = UI;

  function KidLogin(go, onAuth) {
    // Step state: 'email' → 'pickChild' → 'pin'
    let step = 'email';
    let parentEmail = '';
    let children = [];
    let chosenChild = null;

    const root = h('section', { class: 'kid-login-page' });

    function render() {
      root.innerHTML = '';
      root.appendChild(h('div', { class: 'kid-login-shell' }, contentForStep()));
    }

    function contentForStep() {
      if (step === 'email')      return emailStep();
      if (step === 'pickChild')  return pickChildStep();
      if (step === 'pin')        return pinStep();
    }

    // --- Step 1: parent's email ---
    function emailStep() {
      const errBox = h('div', { class: 'form-error hidden' });
      const emailIn = h('input', { type: 'email', placeholder: "parent's email", required: true });
      const submit = h('button', { class: 'btn btn-primary btn-big', type: 'submit' }, 'Find me');

      async function onSubmit(ev) {
        ev.preventDefault();
        errBox.classList.add('hidden');
        submit.disabled = true; submit.textContent = '…';
        try {
          const email = emailIn.value.trim();
          const data = await API.childProfilesByEmail(email);
          if (!data.children || data.children.length === 0) {
            errBox.textContent = 'No kids found for this email. Ask your parent to check.';
            errBox.classList.remove('hidden');
            return;
          }
          parentEmail = email;
          children = data.children;
          step = 'pickChild';
          render();
        } catch (e) {
          errBox.textContent = e.message;
          errBox.classList.remove('hidden');
        } finally {
          submit.disabled = false; submit.textContent = 'Find me';
        }
      }

      return h('form', { class: 'kid-login-card', onsubmit: onSubmit },
        h('div', { class: 'kid-mascot' }, '🦊'),
        h('h2', {}, 'Hi, kid!'),
        h('p', { class: 'sub' }, "Type your parent's email to see your card."),
        errBox,
        h('div', { class: 'field' }, h('label', {}, "Parent's email"), emailIn),
        submit,
        h('div', { class: 'auth-switch' }, 'Are you a parent? ',
          h('a', { onclick: () => go('/login') }, 'Log in here')),
      );
    }

    // --- Step 2: pick a child card ---
    function pickChildStep() {
      const grid = h('div', { class: 'kid-card-grid' });
      for (const c of children) {
        grid.appendChild(
          h('div', {
            class: 'kid-pick-card',
            onclick: () => {
              chosenChild = c;
              if (c.hasPin) {
                step = 'pin';
              } else {
                // No PIN set → log in directly
                doLogin(null);
                return;
              }
              render();
            },
          },
            h('div', { class: 'kid-pick-avatar' }, c.avatar),
            h('div', { class: 'kid-pick-name' }, c.name),
            h('div', { class: 'kid-pick-age' }, `Age ${c.age}`),
            c.hasPin ? h('div', { class: 'kid-pick-lock' }, '🔒 PIN') : h('div', { class: 'kid-pick-lock open' }, '✓ ready'),
          )
        );
      }

      return h('div', { class: 'kid-pick-card-wrap' },
        h('h2', {}, 'Who are you?'),
        h('p', { class: 'sub' }, 'Tap your card.'),
        grid,
        h('button', {
          class: 'btn btn-ghost',
          onclick: () => { step = 'email'; render(); },
        }, '← Back'),
      );
    }

    // --- Step 3: PIN ---
    function pinStep() {
      const errBox = h('div', { class: 'form-error hidden' });
      const pinIn = h('input', {
        type: 'tel',
        inputmode: 'numeric',
        pattern: '\\d{4}',
        maxlength: '4',
        placeholder: '••••',
        autocomplete: 'one-time-code',
        class: 'pin-input',
        required: true,
      });
      const submit = h('button', { class: 'btn btn-primary btn-big', type: 'submit' }, 'Let me in!');

      async function onSubmit(ev) {
        ev.preventDefault();
        errBox.classList.add('hidden');
        if (!/^\d{4}$/.test(pinIn.value)) {
          errBox.textContent = 'PIN must be 4 digits';
          errBox.classList.remove('hidden');
          return;
        }
        submit.disabled = true; submit.textContent = '…';
        try {
          await doLogin(pinIn.value);
        } catch (e) {
          errBox.textContent = e.message;
          errBox.classList.remove('hidden');
          submit.disabled = false; submit.textContent = 'Let me in!';
          pinIn.value = '';
          pinIn.focus();
        }
      }

      // auto-focus
      setTimeout(() => pinIn.focus(), 50);

      return h('form', { class: 'kid-login-card', onsubmit: onSubmit },
        h('div', { class: 'kid-pick-avatar big' }, chosenChild.avatar),
        h('h2', {}, `Hi, ${chosenChild.name}!`),
        h('p', { class: 'sub' }, 'Type your PIN to start.'),
        errBox,
        h('div', { class: 'field' }, h('label', {}, '4-digit PIN'), pinIn),
        submit,
        h('button', {
          class: 'btn btn-ghost',
          type: 'button',
          onclick: () => { step = 'pickChild'; render(); },
        }, '← Different kid'),
      );
    }

    async function doLogin(pin) {
      const { token, child } = await API.childLogin(chosenChild.id, pin);
      API.Auth.token = token;
      onAuth({ ...child, role: 'CHILD' });
    }

    render();
    return root;
  }

  Views.KidLogin = KidLogin;
})();
