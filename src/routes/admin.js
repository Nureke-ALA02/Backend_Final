const express = require('express');

const prisma = require('../data/prisma');
const { adminRequired } = require('../middleware/auth');

const router = express.Router();

router.use(adminRequired);

router.get('/stats', async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      totalParents,
      totalAdmins,
      totalChildren,
      totalUnits,
      totalLessons,
      lessonsCompletedTotal,
      lessonsCompletedThisWeek,
      activeChildrenToday,
      totalBadgesAwarded,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'PARENT' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.child.count(),
      prisma.unit.count(),
      prisma.lesson.count(),
      prisma.completion.count(),
      prisma.completion.count({ where: { completedAt: { gte: startOfWeek } } }),
      prisma.child.count({ where: { lastActiveDate: { gte: startOfToday } } }),
      prisma.childBadge.count(),
    ]);

    let avgCompletionRate = 0;
    if (totalChildren > 0 && totalLessons > 0) {
      const distinctPerChild = await prisma.completion.groupBy({
        by: ['childId', 'lessonId'],
      });
      const perChild = new Map();
      for (const row of distinctPerChild) {
        perChild.set(row.childId, (perChild.get(row.childId) || 0) + 1);
      }
      let sum = 0;
      for (const c of perChild.values()) sum += c / totalLessons;
      avgCompletionRate = sum / totalChildren;
    }

    res.json({
      totals: {
        parents: totalParents,
        admins: totalAdmins,
        children: totalChildren,
        units: totalUnits,
        lessons: totalLessons,
        badgesAwarded: totalBadgesAwarded,
      },
      activity: {
        lessonsCompletedTotal,
        lessonsCompletedThisWeek,
        activeChildrenToday,
        avgCompletionRate: Number(avgCompletionRate.toFixed(3)),
      },
    });
  } catch (e) { next(e); }
});

router.get('/parents', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = (req.query.search || '').trim();

    const where = {
      role: 'PARENT',
      ...(search ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name:  { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, name: true, createdAt: true,
          _count: { select: { children: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      page, limit, total,
      pages: Math.max(1, Math.ceil(total / limit)),
      parents: rows.map((p) => ({
        id: p.id,
        email: p.email,
        name: p.name,
        createdAt: p.createdAt,
        childCount: p._count.children,
      })),
    });
  } catch (e) { next(e); }
});

router.get('/children', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const totalLessons = await prisma.lesson.count();

    const [total, rows] = await Promise.all([
      prisma.child.count(),
      prisma.child.findMany({
        select: {
          id: true, name: true, age: true, avatar: true, xp: true,
          streak: true, lastActiveDate: true, createdAt: true,
          parent: { select: { id: true, email: true, name: true } },
          completions: { select: { lessonId: true }, distinct: ['lessonId'] },
          badges: { select: { badgeId: true } },
        },
        orderBy: { xp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      page, limit, total,
      pages: Math.max(1, Math.ceil(total / limit)),
      totalLessons,
      children: rows.map((c) => ({
        id: c.id,
        name: c.name,
        age: c.age,
        avatar: c.avatar,
        xp: c.xp,
        streak: c.streak,
        lastActiveDate: c.lastActiveDate,
        createdAt: c.createdAt,
        parent: c.parent,
        lessonsCompleted: c.completions.length,
        badgeCount: c.badges.length,
        progressPct: totalLessons > 0
          ? Math.round((c.completions.length / totalLessons) * 100)
          : 0,
      })),
    });
  } catch (e) { next(e); }
});

// GET /api/v1/admin/leaderboard?sortBy=xp&age=5&limit=50
// Returns ranked list of children. sortBy = xp | streak | badges
router.get('/leaderboard', async (req, res, next) => {
  try {
    const sortBy = ['xp', 'streak', 'badges'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'xp';
    const ageFilter = req.query.age ? Number(req.query.age) : null;
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const where = {};
    if (ageFilter && ageFilter >= 3 && ageFilter <= 8) {
      where.age = ageFilter;
    }

    const children = await prisma.child.findMany({
      where,
      include: {
        parent: { select: { name: true } },
        badges: { select: { badgeId: true } },
      },
    });

    const rows = children.map((c) => ({
      id: c.id,
      name: c.name,
      age: c.age,
      avatar: c.avatar,
      parentName: c.parent ? c.parent.name : '—',
      xp: c.xp,
      streak: c.streak,
      badgeCount: c.badges.length,
      lastActiveDate: c.lastActiveDate,
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