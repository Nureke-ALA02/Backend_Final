const express = require('express');
const prisma = require('../data/prisma');
const { authRequired } = require('../middleware/auth');
const router = express.Router();
async function fetchCurriculum() {
  return prisma.unit.findMany({
    where:  { isPublished: true },
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        where:   { isPublished: true },
        orderBy: { order: 'asc' },
        include: {
          exercises: { orderBy: { order: 'asc' } },
        },
      },
    },
  });
}
function flattenLessonIds(units) {
  const out = [];
  for (const u of units) for (const l of u.lessons) out.push(l.id);
  return out;
}
async function assertOwnsChild(userId, childId) {
  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) return { error: { status: 404, message: 'Child not found' } };
  if (child.parentId !== userId) return { error: { status: 403, message: 'Forbidden' } };
  return { child };
}
router.get('/children/:childId/curriculum', authRequired, async (req, res, next) => {
  try {
    const { error, child } = await assertOwnsChild(req.userId, req.params.childId);
    if (error) return res.status(error.status).json({ message: error.message });

    const units = await fetchCurriculum();
    const order = flattenLessonIds(units);

    const completedRows = await prisma.completion.findMany({
      where: { childId: child.id },
      select: { lessonId: true },
      distinct: ['lessonId'],
    });
    const completed = new Set(completedRows.map((r) => r.lessonId));

    const result = units.map((u) => ({
      id: u.id,
      title: u.title,
      description: u.description,
      order: u.order,
      lessons: u.lessons.map((l) => {
        const idx = order.indexOf(l.id);
        const prev = idx === 0 ? null : order[idx - 1];
        const unlocked = idx === 0 || completed.has(prev);
        return {
          id: l.id,
          unitId: l.unitId,
          title: l.title,
          order: l.order,
          exerciseCount: l.exercises.length,
          status: completed.has(l.id) ? 'completed' : (unlocked ? 'available' : 'locked'),
        };
      }),
    }));

    res.json({ units: result });
  } catch (e) { next(e); }
});
router.get('/lessons/:lessonId', authRequired, async (req, res, next) => {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.lessonId },
      include: { exercises: { orderBy: { order: 'asc' } } },
    });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    res.json({
      id: lesson.id,
      unitId: lesson.unitId,
      title: lesson.title,
      exercises: lesson.exercises.map(({ answer, ...rest }) => rest), // strip answer
    });
  } catch (e) { next(e); }
});
router.post('/exercises/:exerciseId/submit', authRequired, async (req, res, next) => {
  try {
    const { childId, answer } = req.body || {};
    const { error } = await assertOwnsChild(req.userId, childId);
    if (error) return res.status(error.status).json({ message: error.message });

    const ex = await prisma.exercise.findUnique({ where: { id: req.params.exerciseId } });
    if (!ex) return res.status(404).json({ message: 'Exercise not found' });

    const correct = String(answer) === String(ex.answer);
    res.json({
      correct,
      correctAnswer: correct ? undefined : ex.answer,
    });
  } catch (e) { next(e); }
});
router.post('/lessons/:lessonId/complete', authRequired, async (req, res, next) => {
  try {
    const { childId, correctCount = 0, totalCount = 1, durationSec = 0 } = req.body || {};
    const { error, child: ownedChild } = await assertOwnsChild(req.userId, childId);
    if (error) return res.status(error.status).json({ message: error.message });
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.lessonId },
      include: { unit: { include: { lessons: { select: { id: true } } } } },
    });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
    const stars = accuracy >= 1 ? 3 : (accuracy >= 0.7 ? 2 : 1);
    const xpGained = correctCount * 10 + (stars === 3 ? 5 : 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let newStreak = ownedChild.streak;
    let touchLastActive = false;

    if (!ownedChild.lastActiveDate) {
      newStreak = 1;
      touchLastActive = true;
    } else {
      const last = new Date(ownedChild.lastActiveDate);
      last.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today - last) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
      } else if (diffDays === 1) {
        newStreak = ownedChild.streak + 1;
        touchLastActive = true;
      } else {
        newStreak = 1;
        touchLastActive = true;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const prevCompletion = await tx.completion.findFirst({
        where: { childId, lessonId: lesson.id },
        select: { id: true },
      });
      await tx.completion.create({
        data: {
          childId,
          lessonId: lesson.id,
          correctCount,
          totalCount,
          stars,
          xpGained,
          durationSec,
        },
      });
      const updatedChild = await tx.child.update({
        where: { id: childId },
        data: {
          xp: { increment: xpGained },
          streak: newStreak,
          lastActiveDate: touchLastActive ? today : ownedChild.lastActiveDate,
        },
      });
      const earned = await tx.childBadge.findMany({
        where: { childId },
        select: { badgeId: true },
      });
      const earnedIds = new Set(earned.map((b) => b.badgeId));
      const toAward = [];

      if (!prevCompletion && !earnedIds.has('first_lesson')) toAward.push('first_lesson');
      if (updatedChild.xp >= 100 && !earnedIds.has('xp_100'))    toAward.push('xp_100');
      if (updatedChild.streak >= 3 && !earnedIds.has('streak_3')) toAward.push('streak_3');
      const lessonIdsInUnit = lesson.unit.lessons.map((l) => l.id);
      const completionsInUnit = await tx.completion.findMany({
        where: { childId, lessonId: { in: lessonIdsInUnit } },
        select: { lessonId: true },
        distinct: ['lessonId'],
      });
      if (
        completionsInUnit.length === lessonIdsInUnit.length &&
        !earnedIds.has('unit_done')
      ) {
        toAward.push('unit_done');
      }

      let newBadges = [];
      if (toAward.length) {
        await tx.childBadge.createMany({
          data: toAward.map((badgeId) => ({ childId, badgeId })),
          skipDuplicates: true,
        });
        newBadges = await tx.badge.findMany({ where: { id: { in: toAward } } });
        await tx.notification.createMany({
          data: newBadges.map((b) => ({
            userId: req.userId,
            type: 'achievement',
            title: `${ownedChild.name} earned a badge!`,
            body: `${b.emoji} ${b.name} — ${b.description}`,
          })),
        });
      }

      return { updatedChild, newBadges };
    });

    res.json({
      xpGained,
      totalXp: result.updatedChild.xp,
      stars,
      newBadges: result.newBadges,
      streak: result.updatedChild.streak,
    });
  } catch (e) { next(e); }
});
router.get('/badges', authRequired, async (req, res, next) => {
  try {
    const badges = await prisma.badge.findMany();
    res.json({ badges });
  } catch (e) { next(e); }
});

module.exports = router;
