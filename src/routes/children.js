const express = require('express');
const bcrypt = require('bcryptjs');

const prisma = require('../data/prisma');
const { parentRequired } = require('../middleware/auth');

const router = express.Router();

const AVATARS = ['🦊', '🐻', '🐼', '🦁', '🐸', '🐯', '🐰', '🐨'];
const PIN_RE = /^\d{4}$/;


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
    hasPin: !!child.pinHash,
  };
}


router.get('/', parentRequired, async (req, res, next) => {
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
        hasPin: !!c.pinHash,
      })),
    });
  } catch (e) { next(e); }
});


router.post('/', parentRequired, async (req, res, next) => {
  try {
    const { name, age, avatar, pin } = req.body || {};

    if (!name || name.trim().length < 1) {
      return res.status(422).json({ message: 'Name is required' });
    }
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 3 || ageNum > 8) {
      return res.status(422).json({ message: 'Age must be an integer between 3 and 8' });
    }
    const pickedAvatar = AVATARS.includes(avatar) ? avatar : AVATARS[0];

    
    let pinHash = null;
    if (pin !== undefined && pin !== null && pin !== '') {
      if (!PIN_RE.test(String(pin))) {
        return res.status(422).json({ message: 'PIN must be exactly 4 digits' });
      }
      pinHash = await bcrypt.hash(String(pin), 10);
    }

    const created = await prisma.child.create({
      data: {
        parentId: req.userId,
        name: name.trim(),
        age: ageNum,
        avatar: pickedAvatar,
        pinHash,
      },
    });
    res.status(201).json(await publicChild(created.id));
  } catch (e) { next(e); }
});


router.get('/:id', parentRequired, ownChild, async (req, res, next) => {
  try {
    res.json(await publicChild(req.child.id));
  } catch (e) { next(e); }
});


router.put('/:id', parentRequired, ownChild, async (req, res, next) => {
  try {
    const { name, age, avatar, pin, removePin } = req.body || {};
    const data = {};

    if (name !== undefined) {
      if (!name || String(name).trim().length < 1) {
        return res.status(422).json({ message: 'Name cannot be empty' });
      }
      data.name = String(name).trim();
    }

    if (age !== undefined) {
      const ageNum = Number(age);
      if (!Number.isInteger(ageNum) || ageNum < 3 || ageNum > 8) {
        return res.status(422).json({ message: 'Age must be an integer between 3 and 8' });
      }
      data.age = ageNum;
    }

    if (avatar !== undefined) {
      if (!AVATARS.includes(avatar)) {
        return res.status(422).json({ message: 'Invalid avatar' });
      }
      data.avatar = avatar;
    }

    if (removePin === true) {
      data.pinHash = null;
    } else if (pin !== undefined && pin !== null && pin !== '') {
      if (!PIN_RE.test(String(pin))) {
        return res.status(422).json({ message: 'PIN must be exactly 4 digits' });
      }
      data.pinHash = await bcrypt.hash(String(pin), 10);
    }

    if (Object.keys(data).length === 0) {
      return res.status(422).json({ message: 'No fields to update' });
    }

    await prisma.child.update({ where: { id: req.child.id }, data });
    res.json(await publicChild(req.child.id));
  } catch (e) { next(e); }
});

router.delete('/:id', parentRequired, ownChild, async (req, res, next) => {
  try {
    await prisma.child.delete({ where: { id: req.child.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
