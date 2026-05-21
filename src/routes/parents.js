const express = require('express');
const bcrypt = require('bcryptjs');

const prisma = require('../data/prisma');
const { parentRequired } = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Verify the parent in :id matches the authenticated user.
// Admins can read/update any parent.
function assertSelfOrAdmin(req, targetId) {
  if (req.subjectRole === 'ADMIN') return null;
  if (req.userId !== targetId) {
    return { status: 403, message: 'You can only access your own profile' };
  }
  return null;
}

// GET /api/v1/parents/:id
// Returns parent profile (without password).
router.get('/:id', parentRequired, async (req, res, next) => {
  try {
    const err = assertSelfOrAdmin(req, req.params.id);
    if (err) return res.status(err.status).json({ message: err.message });

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, name: true, role: true, createdAt: true,
        _count: { select: { children: true } },
      },
    });
    if (!user) return res.status(404).json({ message: 'Parent not found' });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      childCount: user._count.children,
    });
  } catch (e) { next(e); }
});

// PUT /api/v1/parents/:id
// Update name / email / password. All fields optional.
// Password change requires currentPassword for security.
router.put('/:id', parentRequired, async (req, res, next) => {
  try {
    const err = assertSelfOrAdmin(req, req.params.id);
    if (err) return res.status(err.status).json({ message: err.message });

    const { name, email, currentPassword, newPassword } = req.body || {};
    const data = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (trimmed.length < 1) {
        return res.status(422).json({ message: 'Name cannot be empty' });
      }
      data.name = trimmed;
    }

    if (email !== undefined) {
      const lower = String(email).toLowerCase().trim();
      if (!EMAIL_RE.test(lower)) {
        return res.status(422).json({ message: 'Invalid email format' });
      }
      // Check email is not already taken by someone else
      const existing = await prisma.user.findUnique({ where: { email: lower } });
      if (existing && existing.id !== req.params.id) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      data.email = lower;
    }

    // Password change — requires current password (unless admin is editing)
    if (newPassword !== undefined && newPassword !== '') {
      if (String(newPassword).length < 6) {
        return res.status(422).json({ message: 'New password must be at least 6 characters' });
      }

      // Admin can reset password without knowing the old one
      if (req.subjectRole !== 'ADMIN') {
        if (!currentPassword) {
          return res.status(422).json({ message: 'Current password is required to change password' });
        }
        const user = await prisma.user.findUnique({
          where: { id: req.params.id },
          select: { passwordHash: true },
        });
        const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
        if (!ok) {
          return res.status(401).json({ message: 'Current password is incorrect' });
        }
      }

      data.passwordHash = await bcrypt.hash(String(newPassword), 10);
    }

    if (Object.keys(data).length === 0) {
      return res.status(422).json({ message: 'No fields to update' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      createdAt: updated.createdAt,
    });
  } catch (e) { next(e); }
});

// GET /api/v1/parents/:id/children
// REST-style alias for "list this parent's children"
router.get('/:id/children', parentRequired, async (req, res, next) => {
  try {
    const err = assertSelfOrAdmin(req, req.params.id);
    if (err) return res.status(err.status).json({ message: err.message });

    const children = await prisma.child.findMany({
      where: { parentId: req.params.id },
      include: {
        badges:      { select: { badgeId: true } },
        completions: { select: { lessonId: true }, distinct: ['lessonId'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      children: children.map((c) => ({
        id: c.id, name: c.name, age: c.age, avatar: c.avatar,
        xp: c.xp, streak: c.streak, lastActiveDate: c.lastActiveDate,
        completedLessons: c.completions.map((x) => x.lessonId),
        badges: c.badges.map((x) => x.badgeId),
        hasPin: !!c.pinHash,
      })),
    });
  } catch (e) { next(e); }
});

module.exports = router;