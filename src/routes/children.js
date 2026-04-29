const express = require('express');
const prisma = require('../data/prisma');
const { authRequired } = require('../middleware/auth');
const router = express.Router();
const AVATARS = ['🦊', '🐻', '🐼', '🦁', '🐸', '🐯', '🐰', '🐨'];
async function ownChild(req, res, next) {
  try {
    const child = await prisma.child.findUnique({ where: { id: req.params.id } });
    if (!child) return res.status(404).json({ message: 'Child not found' });
    if (child.parentId !== req.userId) {
      return res.status(403).json({ message: 'Not your child profile' });
    }
    req.child = child;
    next();
  } catch (e) { next(e); }
}

async function publicChild(childId) {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: {
      badges:      { select: { badgeId: true } },
      completions: { select: { lessonId: true }, distinct: ['lessonId'] },
    },
  });
  if (!child) return null;
  return {
    id: child.id,
    name: child.name,
    age: child.age,
    avatar: child.avatar,
    xp: child.xp,
    streak: child.streak,
    lastActiveDate: child.lastActiveDate,
    completedLessons: child.completions.map((c) => c.lessonId),
    badges: child.badges.map((b) => b.badgeId),
  };
}

router.get('/', authRequired, async (req, res, next) => {
  try {
    const list = await prisma.child.findMany({
      where: { parentId: req.userId },
      include: {
        badges:      { select: { badgeId: true } },
        completions: { select: { lessonId: true }, distinct: ['lessonId'] },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({
      children: list.map((c) => ({
        id: c.id, name: c.name, age: c.age, avatar: c.avatar,
        xp: c.xp, streak: c.streak, lastActiveDate: c.lastActiveDate,
        completedLessons: c.completions.map((x) => x.lessonId),
        badges: c.badges.map((x) => x.badgeId),
      })),
    });
  } catch (e) { next(e); }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const { name, age, avatar } = req.body || {};
    if (!name || name.trim().length < 1) {
      return res.status(422).json({ message: 'Name is required' });
    }
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 3 || ageNum > 8) {
      return res.status(422).json({ message: 'Age must be an integer between 3 and 8' });
    }
    const pickedAvatar = AVATARS.includes(avatar) ? avatar : AVATARS[0];

    const created = await prisma.child.create({
      data: {
        parentId: req.userId,
        name: name.trim(),
        age: ageNum,
        avatar: pickedAvatar,
      },
    });
    const result = await publicChild(created.id);
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.get('/:id', authRequired, ownChild, async (req, res, next) => {
  try {
    res.json(await publicChild(req.child.id));
  } catch (e) { next(e); }
});
router.delete('/:id', authRequired, ownChild, async (req, res, next) => {
  try {
    await prisma.child.delete({ where: { id: req.child.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
