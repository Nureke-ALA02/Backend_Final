/* eslint-env browser */
/* global API */
(function () {
  const AVATARS = ['🦊', '🐻', '🐼', '🦁', '🐸', '🐯', '🐰', '🐨'];

  // Tiny DOM helper
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  function confettiBurst(count = 80) {
    const layer = document.getElementById('celebrate-layer');
    const colors = ['#ff5a5f', '#2d9cdb', '#ffcc29', '#58c468', '#a06cd5'];
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      c.style.animationDelay = (Math.random() * 0.4) + 's';
      layer.appendChild(c);
      setTimeout(() => c.remove(), 3500);
    }
  }

  // -------------------- LANDING --------------------
  function Landing(go) {
    return h('section', { class: 'landing' },
      h('div', {},
        h('h1', {}, 'Reading is ', h('span', { class: 'accent' }, 'fun!')),
        h('p', {}, 'ReadyABC turns letters, sounds, and first words into a daily adventure for children aged 3–8.'),
        h('div', { class: 'landing-cta' },
          h('button', { class: 'btn btn-primary btn-big', onclick: () => go('/register') }, 'Start free'),
          h('button', { class: 'btn btn-ghost btn-big', onclick: () => go('/login') }, 'I already have an account'),
        ),
      ),
      h('div', { class: 'landing-art' }, '🦊'),
    );
  }

  // -------------------- LOGIN --------------------
  function Login(go, onAuth) {
    const errBox = h('div', { class: 'form-error hidden' });
    const emailIn = h('input', { type: 'email', placeholder: 'you@example.com', required: true });
    const pwIn    = h('input', { type: 'password', placeholder: '••••••', required: true });
    const submit  = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Log in');

    async function onSubmit(ev) {
      ev.preventDefault();
      errBox.classList.add('hidden');
      submit.disabled = true; submit.textContent = 'Logging in…';
      try {
        const { token, user } = await API.login(emailIn.value.trim(), pwIn.value);
        API.Auth.token = token;
        onAuth(user);
      } catch (e) {
        errBox.textContent = e.message;
        errBox.classList.remove('hidden');
      } finally {
        submit.disabled = false; submit.textContent = 'Log in';
      }
    }

    return h('section', { class: 'auth-wrap' },
      h('form', { class: 'auth-card', onsubmit: onSubmit },
        h('h2', {}, 'Welcome back'),
        h('p', { class: 'sub' }, 'Log in to keep learning together.'),
        errBox,
        h('div', { class: 'field' }, h('label', {}, 'Email'), emailIn),
        h('div', { class: 'field' }, h('label', {}, 'Password'), pwIn),
        submit,
        h('div', { class: 'auth-switch' }, 'New here? ',
          h('a', { onclick: () => go('/register') }, 'Create an account')),
      ),
    );
  }

  // -------------------- REGISTER --------------------
  function Register(go, onAuth) {
    const errBox = h('div', { class: 'form-error hidden' });
    const nameIn  = h('input', { type: 'text', placeholder: 'Your name', required: true });
    const emailIn = h('input', { type: 'email', placeholder: 'you@example.com', required: true });
    const pwIn    = h('input', { type: 'password', placeholder: 'At least 6 characters', minlength: '6', required: true });
    const submit  = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Create account');

    async function onSubmit(ev) {
      ev.preventDefault();
      errBox.classList.add('hidden');
      submit.disabled = true; submit.textContent = 'Creating…';
      try {
        const { token, user } = await API.register(emailIn.value.trim(), pwIn.value, nameIn.value.trim());
        API.Auth.token = token;
        onAuth(user);
      } catch (e) {
        errBox.textContent = e.message;
        errBox.classList.remove('hidden');
      } finally {
        submit.disabled = false; submit.textContent = 'Create account';
      }
    }

    return h('section', { class: 'auth-wrap' },
      h('form', { class: 'auth-card', onsubmit: onSubmit },
        h('h2', {}, 'Hello, parent!'),
        h('p', { class: 'sub' }, "Create an account to set up your child's learning."),
        errBox,
        h('div', { class: 'field' }, h('label', {}, 'Your name'), nameIn),
        h('div', { class: 'field' }, h('label', {}, 'Email'), emailIn),
        h('div', { class: 'field' }, h('label', {}, 'Password'), pwIn),
        submit,
        h('div', { class: 'auth-switch' }, 'Already a parent here? ',
          h('a', { onclick: () => go('/login') }, 'Log in')),
      ),
    );
  }

  // -------------------- DASHBOARD --------------------
  async function Dashboard(go) {
    const root = h('section', { class: 'parent-page' },
      h('h1', {}, 'Your learners'),
      h('div', { class: 'kid-grid', id: 'kid-grid' }, h('p', {}, 'Loading…')),
    );

    try {
      const { children } = await API.listChildren();
      const grid = root.querySelector('#kid-grid');
      grid.innerHTML = '';

      if (children.length === 0) {
        grid.appendChild(h('div', { class: 'empty-state' },
          h('div', { class: 'emoji' }, '🧸'),
          h('p', {}, 'No children yet. Add one to start learning!'),
        ));
      } else {
        for (const c of children) {
          grid.appendChild(
            h('div', { class: 'kid-card', onclick: () => go(`/child/${c.id}`) },
              h('div', { class: 'kid-avatar' }, c.avatar),
              h('div', { class: 'kid-name' }, c.name),
              h('div', { style: 'color:#6b7280' }, `Age ${c.age}`),
              h('div', { class: 'kid-stats' },
                h('span', { class: 'stat-chip' }, `⭐ ${c.xp} XP`),
                h('span', { class: 'stat-chip' }, `🔥 ${c.streak} day${c.streak === 1 ? '' : 's'}`),
                h('span', { class: 'stat-chip' }, `🏅 ${c.badges.length}`),
              ),
              h('button', { class: 'play-btn', onclick: (e) => { e.stopPropagation(); go(`/child/${c.id}`); } }, "Let's learn"),
            )
          );
        }
      }

      grid.appendChild(
        h('div', { class: 'add-kid', onclick: () => go('/child/new') }, '＋', 'Add a child')
      );
    } catch (e) {
      root.querySelector('#kid-grid').innerHTML = `<p style="color:#c0392b">${e.message}</p>`;
    }

    return root;
  }

  // -------------------- ADD CHILD --------------------
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

  // -------------------- CURRICULUM MAP --------------------
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

      for (const u of units) {
        const unitEl = h('div', { class: 'unit-block' },
          h('h3', { class: 'unit-title' }, u.title),
          h('p', { class: 'unit-desc' }, u.description),
        );

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
        unitEl.appendChild(path);
        root.appendChild(unitEl);
      }
    } catch (e) {
      root.innerHTML = `<p style="color:#c0392b; text-align:center; padding:40px;">${e.message}</p>`;
    }
    return root;
  }

  // -------------------- LESSON --------------------
  async function LessonView(go, childId, lessonId) {
    const root = h('section', { class: 'lesson-page' }, h('p', {}, 'Loading…'));
    let lesson;
    try {
      lesson = await API.getLesson(lessonId);
    } catch (e) {
      root.innerHTML = `<p style="color:#c0392b; text-align:center; padding:40px;">${e.message}</p>`;
      return root;
    }

    const total = lesson.exercises.length;
    let idx = 0;
    let correctCount = 0;
    let acceptingInput = true;
    const startedAt = Date.now();

    const progressFill = h('div', { class: 'progress-fill' });
    const promptEl = h('h2', { class: 'exercise-prompt' });
    const choicesEl = h('div', { class: 'choice-grid' });
    const feedbackEl = h('div', { class: 'feedback' });
    const nextBtn = h('button', { class: 'btn btn-accent', disabled: true, onclick: advance }, 'Continue');

    const shell = h('section', { class: 'lesson-shell' },
      h('div', { class: 'progress-track' }, progressFill),
      promptEl,
      choicesEl,
      h('div', { class: 'lesson-foot' }, feedbackEl, nextBtn),
    );
    root.innerHTML = '';
    root.appendChild(shell);

    function render() {
      acceptingInput = true;
      const ex = lesson.exercises[idx];
      progressFill.style.width = `${(idx / total) * 100}%`;
      promptEl.textContent = ex.prompt;
      choicesEl.innerHTML = '';
      feedbackEl.textContent = '';
      feedbackEl.className = 'feedback';
      nextBtn.disabled = true;

      // Render choices: phonics & sight_word use letter/word style; vocabulary uses emoji+label.
      const isVocab = ex.type === 'vocabulary';
      for (const opt of ex.options) {
        let choice;
        if (isVocab) {
          choice = h('div', { class: 'choice', 'data-value': opt.label },
            h('div', { class: 'emoji' }, opt.emoji),
            h('div', {}, opt.label),
          );
        } else {
          // letter or word — display value as-is, big
          const valueText = String(opt);
          choice = h('div', { class: 'choice letter', 'data-value': valueText }, valueText);
        }
        choice.addEventListener('click', () => onPick(choice, isVocab ? choice.dataset.value : choice.dataset.value));
        choicesEl.appendChild(choice);
      }
    }

    async function onPick(node, value) {
      if (!acceptingInput) return;
      acceptingInput = false;

      const ex = lesson.exercises[idx];
      try {
        const { correct, correctAnswer } = await API.submitAnswer(ex.id, childId, value);
        if (correct) {
          correctCount++;
          node.classList.add('correct');
          feedbackEl.textContent = 'Yes! 🎉';
          feedbackEl.classList.add('ok');
        } else {
          node.classList.add('wrong');
          feedbackEl.textContent = `Almost! The answer was “${correctAnswer}”.`;
          feedbackEl.classList.add('bad');
          // also highlight the right one
          [...choicesEl.children].forEach((c) => {
            if (c.dataset.value === String(correctAnswer)) c.classList.add('correct');
          });
        }
        nextBtn.disabled = false;
      } catch (e) {
        feedbackEl.textContent = e.message;
        feedbackEl.classList.add('bad');
        acceptingInput = true;
      }
    }

    async function advance() {
      idx++;
      if (idx < total) {
        render();
        return;
      }
      // Finished — submit completion
      progressFill.style.width = '100%';
      try {
        const result = await API.completeLesson(lesson.id, {
          childId,
          correctCount,
          totalCount: total,
          durationSec: Math.round((Date.now() - startedAt) / 1000),
        });
        const screen = ResultsView(go, childId, result);
        root.innerHTML = '';
        root.appendChild(screen);
        if (result.stars >= 2) confettiBurst(result.stars === 3 ? 120 : 60);
      } catch (e) {
        feedbackEl.textContent = e.message;
        feedbackEl.classList.add('bad');
      }
    }

    render();
    return root;
  }

  // -------------------- RESULTS --------------------
  function ResultsView(go, childId, result) {
    const stars = h('div', { class: 'stars' });
    for (let i = 1; i <= 3; i++) {
      stars.appendChild(h('span', { class: i <= result.stars ? 'filled' : 'empty' }, '★'));
    }

    const root = h('div', { class: 'results' },
      h('h2', {}, result.stars === 3 ? 'Perfect!' : result.stars === 2 ? 'Great job!' : 'Nice try!'),
      h('p', {}, "You're getting better every day."),
      stars,
      h('div', { class: 'xp-pill' }, `+${result.xpGained} XP`),
      h('p', { style: 'color:#6b7280' }, `Total: ${result.totalXp} XP · 🔥 ${result.streak}-day streak`),
    );

    if (result.newBadges && result.newBadges.length) {
      for (const b of result.newBadges) {
        root.appendChild(
          h('div', { class: 'badge-popup' },
            h('div', { class: 'emoji' }, b.emoji),
            h('h4', {}, `New badge: ${b.name}`),
            h('p', {}, b.description),
          )
        );
      }
    }

    root.appendChild(
      h('div', { style: 'margin-top:24px; display:flex; gap:10px; justify-content:center;' },
        h('button', { class: 'btn btn-ghost', onclick: () => go('/dashboard') }, 'Parent view'),
        h('button', { class: 'btn btn-primary btn-big', onclick: () => go(`/child/${childId}`) }, 'Keep going'),
      )
    );

    return root;
  }

  // -------------------- ADMIN PANEL --------------------
  async function AdminPanel(go) {
    const root = h('section', { class: 'admin-page' });

    // Header
    root.appendChild(
      h('div', { class: 'admin-header' },
        h('h1', {}, 'Admin Panel'),
        h('p', {}, 'Platform overview and learner progress.'),
      )
    );

    // Stats grid (placeholder, filled below)
    const statsGrid = h('div', { class: 'stats-grid' }, h('p', {}, 'Loading stats…'));
    root.appendChild(statsGrid);

    // Two side-by-side panels: parents and children
    const parentsPanel  = h('div', { class: 'admin-panel' }, h('h2', {}, 'Parents'), h('p', {}, 'Loading…'));
    const childrenPanel = h('div', { class: 'admin-panel' }, h('h2', {}, 'Learners'), h('p', {}, 'Loading…'));
    root.appendChild(h('div', { class: 'admin-columns' }, parentsPanel, childrenPanel));

    // ----- load stats -----
    try {
      const s = await API.adminStats();
      statsGrid.innerHTML = '';
      const cards = [
        { label: 'Parents',           value: s.totals.parents,                  emoji: '👨‍👩‍👧' },
        { label: 'Learners',          value: s.totals.children,                 emoji: '🧒' },
        { label: 'Active today',      value: s.activity.activeChildrenToday,    emoji: '⚡' },
        { label: 'Lessons this week', value: s.activity.lessonsCompletedThisWeek, emoji: '📚' },
        { label: 'Lessons total',     value: s.activity.lessonsCompletedTotal,  emoji: '🏁' },
        { label: 'Badges awarded',    value: s.totals.badgesAwarded,            emoji: '🏅' },
        { label: 'Avg completion',    value: Math.round(s.activity.avgCompletionRate * 100) + '%', emoji: '📊' },
        { label: 'Curriculum',        value: `${s.totals.units} units · ${s.totals.lessons} lessons`, emoji: '📖' },
      ];
      for (const c of cards) {
        statsGrid.appendChild(
          h('div', { class: 'stat-card' },
            h('div', { class: 'stat-emoji' }, c.emoji),
            h('div', { class: 'stat-value' }, String(c.value)),
            h('div', { class: 'stat-label' }, c.label),
          )
        );
      }
    } catch (e) {
      statsGrid.innerHTML = `<p style="color:#c0392b">${e.message}</p>`;
    }

    // ----- load parents -----
    try {
      const data = await API.adminParents({ page: 1 });
      parentsPanel.innerHTML = '';
      parentsPanel.appendChild(h('h2', {}, `Parents (${data.total})`));

      if (data.parents.length === 0) {
        parentsPanel.appendChild(h('p', { class: 'empty' }, 'No parents registered yet.'));
      } else {
        const table = h('table', { class: 'admin-table' });
        table.appendChild(
          h('thead', {}, h('tr', {},
            h('th', {}, 'Name'),
            h('th', {}, 'Email'),
            h('th', {}, 'Children'),
            h('th', {}, 'Joined'),
          ))
        );
        const tbody = h('tbody', {});
        for (const p of data.parents) {
          tbody.appendChild(
            h('tr', {},
              h('td', {}, p.name),
              h('td', {}, p.email),
              h('td', {}, String(p.childCount)),
              h('td', {}, new Date(p.createdAt).toLocaleDateString()),
            )
          );
        }
        table.appendChild(tbody);
        parentsPanel.appendChild(table);
      }
    } catch (e) {
      parentsPanel.innerHTML = `<h2>Parents</h2><p style="color:#c0392b">${e.message}</p>`;
    }

    // ----- load children -----
    try {
      const data = await API.adminChildren({ page: 1 });
      childrenPanel.innerHTML = '';
      childrenPanel.appendChild(h('h2', {}, `Learners (${data.total})`));

      if (data.children.length === 0) {
        childrenPanel.appendChild(h('p', { class: 'empty' }, 'No learners yet.'));
      } else {
        const table = h('table', { class: 'admin-table' });
        table.appendChild(
          h('thead', {}, h('tr', {},
            h('th', {}, ''),
            h('th', {}, 'Name'),
            h('th', {}, 'Age'),
            h('th', {}, 'Parent'),
            h('th', {}, 'XP'),
            h('th', {}, 'Streak'),
            h('th', {}, 'Progress'),
            h('th', {}, 'Badges'),
          ))
        );
        const tbody = h('tbody', {});
        for (const c of data.children) {
          const bar = h('div', { class: 'mini-bar' },
            h('div', {
              class: 'mini-bar-fill',
              style: `width:${c.progressPct}%`,
            }),
          );
          tbody.appendChild(
            h('tr', {},
              h('td', { class: 'avatar-cell' }, c.avatar),
              h('td', {}, c.name),
              h('td', {}, String(c.age)),
              h('td', { class: 'muted' }, c.parent ? c.parent.name : '—'),
              h('td', {}, String(c.xp)),
              h('td', {}, `🔥 ${c.streak}`),
              h('td', { class: 'progress-cell' },
                bar,
                h('span', { class: 'muted' }, `${c.progressPct}%`),
              ),
              h('td', {}, `🏅 ${c.badgeCount}`),
            )
          );
        }
        table.appendChild(tbody);
        childrenPanel.appendChild(table);
      }
    } catch (e) {
      childrenPanel.innerHTML = `<h2>Learners</h2><p style="color:#c0392b">${e.message}</p>`;
    }

    return root;
  }

  window.Views = { Landing, Login, Register, Dashboard, AddChild, ChildHome, LessonView, AdminPanel };
})();
