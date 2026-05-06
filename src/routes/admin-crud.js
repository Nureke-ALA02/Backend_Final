const express = require('express');

const prisma = require('../data/prisma');
const { adminRequired } = require('../middleware/auth');

const router = express.Router();
router.use(adminRequired);

// ===================================================================
// UNITS
// ===================================================================

// POST /api/v1/admin/units
router.post('/units', async (req, res, next) => {
  try {
    const { title, description, order, isPublished } = req.body || {};
    if (!title || !description) {
      return res.status(422).json({ message: 'title and description required' });
    }
    const unit = await prisma.unit.create({
      data: {
        title: String(title).trim(),
        description: String(description).trim(),
        order: Number.isInteger(Number(order)) ? Number(order) : 0,
        isPublished: isPublished !== false,
      },
    });
    res.status(201).json(unit);
  } catch (e) { next(e); }
});

// PUT /api/v1/admin/units/:id
router.put('/units/:id', async (req, res, next) => {
  try {
    const { title, description, order, isPublished } = req.body || {};
    const data = {};
    if (title !== undefined)       data.title = String(title).trim();
    if (description !== undefined) data.description = String(description).trim();
    if (order !== undefined)       data.order = Number(order);
    if (isPublished !== undefined) data.isPublished = !!isPublished;

    if (Object.keys(data).length === 0) {
      return res.status(422).json({ message: 'No fields to update' });
    }
    const unit = await prisma.unit.update({ where: { id: req.params.id }, data });
    res.json(unit);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ message: 'Unit not found' });
    next(e);
  }
});

// DELETE /api/v1/admin/units/:id
// Cascade removes all child lessons + exercises (defined in the schema).
router.delete('/units/:id', async (req, res, next) => {
  try {
    await prisma.unit.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ message: 'Unit not found' });
    next(e);
  }
});

// ===================================================================
// LESSONS
// ===================================================================

// POST /api/v1/admin/lessons
router.post('/lessons', async (req, res, next) => {
  try {
    const { unitId, title, order, isPublished } = req.body || {};
    if (!unitId || !title) {
      return res.status(422).json({ message: 'unitId and title required' });
    }
    // Make sure the unit exists before creating the lesson.
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) return res.status(404).json({ message: 'Unit not found' });

    const lesson = await prisma.lesson.create({
      data: {
        unitId,
        title: String(title).trim(),
        order: Number.isInteger(Number(order)) ? Number(order) : 0,
        isPublished: isPublished !== false,
      },
    });
    res.status(201).json(lesson);
  } catch (e) { next(e); }
});

// PUT /api/v1/admin/lessons/:id
router.put('/lessons/:id', async (req, res, next) => {
  try {
    const { title, order, isPublished, unitId } = req.body || {};
    const data = {};
    if (title !== undefined)       data.title = String(title).trim();
    if (order !== undefined)       data.order = Number(order);
    if (isPublished !== undefined) data.isPublished = !!isPublished;
    if (unitId !== undefined)      data.unitId = unitId;

    if (Object.keys(data).length === 0) {
      return res.status(422).json({ message: 'No fields to update' });
    }
    const lesson = await prisma.lesson.update({ where: { id: req.params.id }, data });
    res.json(lesson);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ message: 'Lesson not found' });
    next(e);
  }
});

// DELETE /api/v1/admin/lessons/:id
router.delete('/lessons/:id', async (req, res, next) => {
  try {
    await prisma.lesson.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ message: 'Lesson not found' });
    next(e);
  }
});

// ===================================================================
// EXERCISES
// ===================================================================

const VALID_TYPES = new Set(['PHONICS', 'HANDWRITING', 'SIGHT_WORD', 'VOCABULARY']);

// POST /api/v1/admin/exercises
router.post('/exercises', async (req, res, next) => {
  try {
    const { lessonId, type, prompt, options, answer, order } = req.body || {};
    if (!lessonId || !type || !prompt || !options || !answer) {
      return res.status(422).json({ message: 'lessonId, type, prompt, options, answer required' });
    }
    if (!VALID_TYPES.has(String(type).toUpperCase())) {
      return res.status(422).json({ message: `type must be one of ${[...VALID_TYPES].join(', ')}` });
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const exercise = await prisma.exercise.create({
      data: {
        lessonId,
        type: String(type).toUpperCase(),
        prompt: String(prompt).trim(),
        options,         // JSON
        answer: String(answer),
        order: Number.isInteger(Number(order)) ? Number(order) : 0,
      },
    });
    res.status(201).json(exercise);
  } catch (e) { next(e); }
});

// PUT /api/v1/admin/exercises/:id
router.put('/exercises/:id', async (req, res, next) => {
  try {
    const { type, prompt, options, answer, order, lessonId } = req.body || {};
    const data = {};
    if (type !== undefined) {
      if (!VALID_TYPES.has(String(type).toUpperCase())) {
        return res.status(422).json({ message: 'invalid type' });
      }
      data.type = String(type).toUpperCase();
    }
    if (prompt !== undefined)   data.prompt = String(prompt).trim();
    if (options !== undefined)  data.options = options;
    if (answer !== undefined)   data.answer = String(answer);
    if (order !== undefined)    data.order = Number(order);
    if (lessonId !== undefined) data.lessonId = lessonId;

    if (Object.keys(data).length === 0) {
      return res.status(422).json({ message: 'No fields to update' });
    }
    const exercise = await prisma.exercise.update({ where: { id: req.params.id }, data });
    res.json(exercise);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ message: 'Exercise not found' });
    next(e);
  }
});

// DELETE /api/v1/admin/exercises/:id
router.delete('/exercises/:id', async (req, res, next) => {
  try {
    await prisma.exercise.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ message: 'Exercise not found' });
    next(e);
  }
});

// ===================================================================
// PARENTS — admin can delete a parent (cascades to children)
// ===================================================================

router.delete('/parents/:id', async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, role: true },
    });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.role === 'ADMIN') {
      return res.status(403).json({ message: 'Cannot delete admin accounts via this endpoint' });
    }
    if (target.id === req.userId) {
      return res.status(403).json({ message: 'Cannot delete your own account' });
    }
    await prisma.user.delete({ where: { id: target.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

// ===================================================================
// CHILDREN — admin can delete any child profile
// ===================================================================

router.delete('/children/:id', async (req, res, next) => {
  try {
    const child = await prisma.child.findUnique({ where: { id: req.params.id } });
    if (!child) return res.status(404).json({ message: 'Child not found' });
    await prisma.child.delete({ where: { id: child.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

// ===================================================================
// FULL CONTENT TREE — convenience endpoint for the admin UI
// ===================================================================

router.get('/curriculum', async (req, res, next) => {
  try {
    const units = await prisma.unit.findMany({
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          include: {
            exercises: { orderBy: { order: 'asc' } },
          },
        },
      },
    });
    res.json({ units });
  } catch (e) { next(e); }
});

module.exports = router;