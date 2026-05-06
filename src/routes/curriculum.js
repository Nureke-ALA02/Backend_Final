const express = require('express');

const prisma = require('../data/prisma');
const { authRequired } = require('../middleware/auth');
const {
  calculateStars,
  calculateXp,
  calculateStreak,
  decideBadges,
} = require('../services/progress');

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

async function assertCanAccessChild(req, childId) {
  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) return { error: { status: 404, message: 'Child not found' } };

  if (req.subjectRole === 'CHILD') {
    if (child.id !== req.subjectId) {
      return { error: { status: 403, message: 'Children can only access their own profile' } };
    }
    return { child };
  }
  if (req.subjectRole === 'ADMIN') {
    return { child };
  }

  if (child.parentId !== req.userId) {
    return { error: { status: 403, message: 'Not your child profile' } };
  }
  return { child };
}

router.get('/children/:childId/curriculum', authRequired, async (req, res, next) => {
  try {
    const { error, child } = await assertCanAccessChild(req, req.params.childId);
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
    const { answer } = req.body || {};
    const childId = req.subjectRole === 'CHILD' ? req.subjectId : (req.body && req.body.childId);
    if (!childId) return res.status(422).json({ message: 'childId required' });

    const { error } = await assertCanAccessChild(req, childId);
    if (error) return res.status(error.status).json({ message: error.message });

    const ex = await prisma.exercise.findUnique({ where: { id: req.params.exerciseId } });
    if (!ex) return res.status(404).json({ message: 'Exercise not found' });

    const correct = String(answer) === String(ex.answer);
    res.json({
      correct,
      correctAnswer: correct ? undefined : ex.answer,
    });
  } catch (e) { next(e); }
})
router.post('/lessons/:lessonId/complete', authRequired, async (req, res, next) => {
  try {
    const { correctCount = 0, totalCount = 1, durationSec = 0 } = req.body || {};
    const childId = req.subjectRole === 'CHILD' ? req.subjectId : (req.body && req.body.childId);
    if (!childId) return res.status(422).json({ message: 'childId required' });

    const { error, child: ownedChild } = await assertCanAccessChild(req, childId);
    if (error) return res.status(error.status).json({ message: error.message });

    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.lessonId },
      include: { unit: { include: { lessons: { select: { id: true } } } } },
    });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    
    const stars = calculateStars(correctCount, totalCount);
    const xpGained = calculateXp(correctCount, stars);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { newStreak, touchLastActive } = calculateStreak(
      ownedChild.streak,
      ownedChild.lastActiveDate,
      today,
    );

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

      const lessonIdsInUnit = lesson.unit.lessons.map((l) => l.id);
      const completionsInUnit = await tx.completion.findMany({
        where: { childId, lessonId: { in: lessonIdsInUnit } },
        select: { lessonId: true },
        distinct: ['lessonId'],
      });
      const allUnitLessonsDone = completionsInUnit.length === lessonIdsInUnit.length;

      const toAward = decideBadges({
        wasFirstCompletion: !prevCompletion,
        totalXpAfter: updatedChild.xp,
        streakAfter: updatedChild.streak,
        allUnitLessonsDone,
        alreadyEarnedIds: earnedIds,
      });

      let newBadges = [];
      if (toAward.length) {
        await tx.childBadge.createMany({
          data: toAward.map((badgeId) => ({ childId, badgeId })),
          skipDuplicates: true,
        });
        newBadges = await tx.badge.findMany({ where: { id: { in: toAward } } });

        await tx.notification.createMany({
          data: newBadges.map((b) => ({
            userId: ownedChild.parentId,
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