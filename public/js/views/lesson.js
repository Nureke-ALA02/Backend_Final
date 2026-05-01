(function () {
  const { h, confettiBurst } = UI;

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

    root.innerHTML = '';
    root.appendChild(h('section', { class: 'lesson-shell' },
      h('div', { class: 'progress-track' }, progressFill),
      promptEl,
      choicesEl,
      h('div', { class: 'lesson-foot' }, feedbackEl, nextBtn),
    ));

    function render() {
      acceptingInput = true;
      const ex = lesson.exercises[idx];
      progressFill.style.width = `${(idx / total) * 100}%`;
      promptEl.textContent = ex.prompt;
      choicesEl.innerHTML = '';
      feedbackEl.textContent = '';
      feedbackEl.className = 'feedback';
      nextBtn.disabled = true;
      const isVocab = String(ex.type).toLowerCase() === 'vocabulary';

      for (const opt of ex.options) {
        let choice;
        if (isVocab) {
          choice = h('div', { class: 'choice', 'data-value': opt.label },
            h('div', { class: 'emoji' }, opt.emoji),
            h('div', {}, opt.label),
          );
        } else {
          const valueText = String(opt);
          choice = h('div', { class: 'choice letter', 'data-value': valueText }, valueText);
        }
        choice.addEventListener('click', () => onPick(choice, choice.dataset.value));
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
      if (idx < total) { render(); return; }

      progressFill.style.width = '100%';
      try {
        const result = await API.completeLesson(lesson.id, {
          childId,
          correctCount,
          totalCount: total,
          durationSec: Math.round((Date.now() - startedAt) / 1000),
        });
        root.innerHTML = '';
        root.appendChild(ResultsView(go, childId, result));
        if (result.stars >= 2) confettiBurst(result.stars === 3 ? 120 : 60);
      } catch (e) {
        feedbackEl.textContent = e.message;
        feedbackEl.classList.add('bad');
      }
    }

    render();
    return root;
  }

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

  Views.LessonView = LessonView;
})();
