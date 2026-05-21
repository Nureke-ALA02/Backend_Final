const express = require('express');
const prisma = require('../data/prisma');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/leaderboard?age=5&sortBy=xp&limit=20
// Public-ish leaderboard for parents/children.
// Returns only first name + avatar of other kids — no parent emails leaked.
// If `age` is provided, filters to that age group.
// If the requester is a CHILD, defaults `age` to their own age.
router.get('/', authRequired, async (req, res, next) => {
  try {
    const sortBy = ['xp', 'streak', 'badges'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'xp';
    let ageFilter = req.query.age ? Number(req.query.age) : null;
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    // Children automatically see their own age group only
    if (req.subjectRole === 'CHILD') {
      const me = await prisma.child.findUnique({
        where: { id: req.subjectId },
        select: { age: true },
      });
      if (me) ageFilter = me.age;
    }

    // Collect "my children" ids so we can highlight them
    let myChildIds = new Set();
    if (req.subjectRole === 'PARENT' || req.subjectRole === 'ADMIN') {
      if (req.userId) {
        const mine = await prisma.child.findMany({
          where: { parentId: req.userId },
          select: { id: true },
        });
        myChildIds = new Set(mine.map((c) => c.id));
      }
    } else if (req.subjectRole === 'CHILD') {
      myChildIds = new Set([req.subjectId]);
    }

    const where = {};
    if (ageFilter && ageFilter >= 3 && ageFilter <= 8) {
      where.age = ageFilter;
    }

    const children = await prisma.child.findMany({
      where,
      include: {
        badges: { select: { badgeId: true } },
      },
    });

    const rows = children.map((c) => ({
      id: c.id,
      // Only first name + avatar to other parents/kids
      name: c.name,
      age: c.age,
      avatar: c.avatar,
      xp: c.xp,
      streak: c.streak,
      badgeCount: c.badges.length,
      isMine: myChildIds.has(c.id),
    }));

    rows.sort((a, b) => {
      if (sortBy === 'streak') return b.streak - a.streak || b.xp - a.xp;
      if (sortBy === 'badges') return b.badgeCount - a.badgeCount || b.xp - a.xp;
      return b.xp - a.xp;
    });

    const ranked = rows.slice(0, limit).map((row, i) => ({
      ...row,
      rank: i + 1,
    }));

    res.json({
      sortBy,
      ageFilter,
      total: rows.length,
      leaderboard: ranked,
    });
  } catch (e) { next(e); }
});

module.exports = router;