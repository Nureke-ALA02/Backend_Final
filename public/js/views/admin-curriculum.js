(function () {
  const { h } = UI;

  const TYPES = ['PHONICS', 'SIGHT_WORD', 'VOCABULARY', 'HANDWRITING'];

  async function AdminCurriculum(go) {
    const tree = h('div', { class: 'admin-tree' }, h('p', {}, 'Loading…'));

    const root = h('section', { class: 'admin-page' },
      h('div', { class: 'admin-header' },
        h('div', {},
          h('h1', {}, 'Curriculum manager'),
          h('p', {}, 'Add, edit, delete units, lessons, and exercises.'),
        ),
        h('div', { style: 'display:flex; gap:10px;' },
          h('button', { class: 'btn btn-ghost', onclick: () => go('/admin') }, '← Stats'),
          h('button', {
            class: 'btn btn-primary',
            onclick: () => openUnitModal(null, () => reload(tree)),
          }, '+ New unit'),
        ),
      ),
      tree,
    );

    reload(tree);
    return root;
  }

  async function reload(treeContainer) {
    treeContainer.innerHTML = '<p>Loading…</p>';
    try {
      const data = await API.adminCurriculum();
      treeContainer.innerHTML = '';
      if (!data.units || data.units.length === 0) {
        treeContainer.appendChild(h('div', { class: 'empty-state' },
          h('p', {}, 'No units yet. Click "New unit" to start.')));
        return;
      }
      for (const u of data.units) treeContainer.appendChild(unitNode(u, treeContainer));
    } catch (e) {
      treeContainer.innerHTML = `<p style="color:#c0392b">${e.message}</p>`;
    }
  }
  function unitNode(unit, treeContainer) {
    let expanded = true;

    const head = h('div', { class: 'tree-head', onclick: () => { expanded = !expanded; rerender(); } });
    const body = h('div', { class: 'tree-body' });
    const wrap = h('div', { class: 'tree-unit' }, head, body);

    function rerender() {
      head.innerHTML = '';
      head.appendChild(h('span', { class: 'tree-toggle' }, expanded ? '▼' : '▶'));
      head.appendChild(h('span', { class: 'tree-icon' }, '📚'));
      head.appendChild(h('span', { class: 'tree-title' }, unit.title));
      head.appendChild(h('span', { class: 'tree-meta' }, `· ${unit.lessons.length} lessons · order ${unit.order}`));

      const actions = h('div', { class: 'tree-actions' });
      actions.addEventListener('click', (e) => e.stopPropagation());
      actions.appendChild(h('button', {
        class: 'admin-row-btn',
        onclick: () => openLessonModal(null, unit.id, () => reload(treeContainer)),
      }, '+ Lesson'));
      actions.appendChild(h('button', {
        class: 'admin-row-btn',
        onclick: () => openUnitModal(unit, () => reload(treeContainer)),
      }, '✏️'));
      actions.appendChild(h('button', {
        class: 'admin-row-btn danger',
        onclick: async () => {
          if (!confirm(`Delete unit "${unit.title}" and all its lessons & exercises?`)) return;
          try {
            await API.adminDeleteUnit(unit.id);
            reload(treeContainer);
          } catch (e) { alert(e.message); }
        },
      }, '🗑'));
      head.appendChild(actions);

      body.innerHTML = '';
      if (expanded) {
        for (const l of unit.lessons) body.appendChild(lessonNode(l, treeContainer));
      }
    }

    rerender();
    return wrap;
  }
  function lessonNode(lesson, treeContainer) {
    let expanded = false;
    const head = h('div', { class: 'tree-head sub', onclick: () => { expanded = !expanded; rerender(); } });
    const body = h('div', { class: 'tree-body' });
    const wrap = h('div', { class: 'tree-lesson' }, head, body);

    function rerender() {
      head.innerHTML = '';
      head.appendChild(h('span', { class: 'tree-toggle' }, expanded ? '▼' : '▶'));
      head.appendChild(h('span', { class: 'tree-icon' }, '📖'));
      head.appendChild(h('span', { class: 'tree-title' }, lesson.title));
      head.appendChild(h('span', { class: 'tree-meta' }, `· ${lesson.exercises.length} exercises · order ${lesson.order}`));

      const actions = h('div', { class: 'tree-actions' });
      actions.addEventListener('click', (e) => e.stopPropagation());
      actions.appendChild(h('button', {
        class: 'admin-row-btn',
        onclick: () => openExerciseModal(null, lesson.id, () => reload(treeContainer)),
      }, '+ Exercise'));
      actions.appendChild(h('button', {
        class: 'admin-row-btn',
        onclick: () => openLessonModal(lesson, lesson.unitId, () => reload(treeContainer)),
      }, '✏️'));
      actions.appendChild(h('button', {
        class: 'admin-row-btn danger',
        onclick: async () => {
          if (!confirm(`Delete lesson "${lesson.title}" and all its exercises?`)) return;
          try {
            await API.adminDeleteLesson(lesson.id);
            reload(treeContainer);
          } catch (e) { alert(e.message); }
        },
      }, '🗑'));
      head.appendChild(actions);

      body.innerHTML = '';
      if (expanded) {
        for (const ex of lesson.exercises) body.appendChild(exerciseNode(ex, treeContainer));
      }
    }

    rerender();
    return wrap;
  }
  function exerciseNode(ex, treeContainer) {
    const actions = h('div', { class: 'tree-actions' });
    actions.appendChild(h('button', {
      class: 'admin-row-btn',
      onclick: () => openExerciseModal(ex, ex.lessonId, () => reload(treeContainer)),
    }, '✏️'));
    actions.appendChild(h('button', {
      class: 'admin-row-btn danger',
      onclick: async () => {
        if (!confirm(`Delete this exercise?`)) return;
        try {
          await API.adminDeleteExercise(ex.id);
          reload(treeContainer);
        } catch (e) { alert(e.message); }
      },
    }, '🗑'));

    return h('div', { class: 'tree-exercise' },
      h('span', { class: 'tree-icon' }, '✏️'),
      h('span', { class: 'tree-title' }, `[${ex.type}]`),
      h('span', { class: 'tree-meta' }, ex.prompt),
      actions,
    );
  }

  function modal(title, fields, onSave) {
    const errBox = h('div', { class: 'form-error hidden' });
    const overlay = h('div', { class: 'modal-overlay' });
    const card = h('div', { class: 'modal-card' });
    overlay.appendChild(card);

    function close() { overlay.remove(); }
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    card.appendChild(h('h2', {}, title));
    card.appendChild(errBox);

    const inputs = {};
    for (const f of fields) {
      let input;
      if (f.type === 'textarea') {
        input = h('textarea', { rows: '3' });
        input.value = f.value || '';
      } else if (f.type === 'select') {
        input = h('select', {});
        for (const opt of f.options) {
          const o = h('option', { value: opt.value }, opt.label);
          if (String(opt.value) === String(f.value)) o.selected = true;
          input.appendChild(o);
        }
      } else if (f.type === 'json') {
        input = h('textarea', { rows: '5', placeholder: '["A", "B", "C"] or [{"label":"Apple","emoji":"🍎"}]' });
        input.value = f.value ? JSON.stringify(f.value, null, 2) : '';
      } else {
        input = h('input', { type: f.type || 'text', placeholder: f.placeholder || '' });
        input.value = f.value != null ? String(f.value) : '';
      }
      inputs[f.key] = input;
      card.appendChild(h('div', { class: 'field' }, h('label', {}, f.label), input));
    }

    const saveBtn = h('button', { class: 'btn btn-primary' }, 'Save');
    const cancelBtn = h('button', { class: 'btn btn-ghost', onclick: close }, 'Cancel');

    saveBtn.addEventListener('click', async () => {
      errBox.classList.add('hidden');
      const data = {};
      for (const f of fields) {
        const raw = inputs[f.key].value;
        if (f.type === 'json') {
          if (!raw.trim()) { data[f.key] = []; continue; }
          try { data[f.key] = JSON.parse(raw); }
          catch (_) {
            errBox.textContent = `${f.label}: invalid JSON`;
            errBox.classList.remove('hidden');
            return;
          }
        } else if (f.type === 'number') {
          data[f.key] = Number(raw);
        } else if (f.type === 'checkbox') {
          data[f.key] = inputs[f.key].checked;
        } else {
          data[f.key] = raw;
        }
      }
      saveBtn.disabled = true; saveBtn.textContent = '…';
      try {
        await onSave(data);
        close();
      } catch (e) {
        errBox.textContent = e.message;
        errBox.classList.remove('hidden');
        saveBtn.disabled = false; saveBtn.textContent = 'Save';
      }
    });

    card.appendChild(h('div', { class: 'modal-actions' }, cancelBtn, saveBtn));
    document.body.appendChild(overlay);
  }

  function openUnitModal(existing, onDone) {
    const isEdit = !!existing;
    modal(isEdit ? `Edit unit: ${existing.title}` : 'New unit', [
      { key: 'title',       label: 'Title',       value: existing?.title || '' },
      { key: 'description', label: 'Description', type: 'textarea', value: existing?.description || '' },
      { key: 'order',       label: 'Order (number)', type: 'number', value: existing?.order || 0 },
    ], async (data) => {
      if (isEdit) await API.adminUpdateUnit(existing.id, data);
      else        await API.adminCreateUnit(data);
      onDone();
    });
  }

  function openLessonModal(existing, unitId, onDone) {
    const isEdit = !!existing;
    modal(isEdit ? `Edit lesson: ${existing.title}` : 'New lesson', [
      { key: 'title', label: 'Title', value: existing?.title || '' },
      { key: 'order', label: 'Order (number)', type: 'number', value: existing?.order || 0 },
    ], async (data) => {
      if (isEdit) {
        await API.adminUpdateLesson(existing.id, data);
      } else {
        await API.adminCreateLesson({ ...data, unitId });
      }
      onDone();
    });
  }

  function openExerciseModal(existing, lessonId, onDone) {
    const isEdit = !!existing;
    modal(isEdit ? 'Edit exercise' : 'New exercise', [
      { key: 'type', label: 'Type', type: 'select',
        value: existing?.type || 'PHONICS',
        options: TYPES.map((t) => ({ value: t, label: t })) },
      { key: 'prompt', label: 'Prompt (question shown to child)', type: 'textarea', value: existing?.prompt || '' },
      { key: 'options', label: 'Options (JSON array)', type: 'json', value: existing?.options || [] },
      { key: 'answer',  label: 'Correct answer (string)', value: existing?.answer || '' },
      { key: 'order',   label: 'Order (number)', type: 'number', value: existing?.order || 0 },
    ], async (data) => {
      if (isEdit) await API.adminUpdateExercise(existing.id, data);
      else        await API.adminCreateExercise({ ...data, lessonId });
      onDone();
    });
  }

  Views.AdminCurriculum = AdminCurriculum;
})();
