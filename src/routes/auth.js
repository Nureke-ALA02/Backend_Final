const express = require('express');
const bcrypt = require('bcryptjs');

const prisma = require('../data/prisma');
const {
  signUserToken,
  signChildToken,
  authRequired,
} = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_RE = /^\d{4}$/;



router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(422).json({ message: 'Invalid email' });
    }
    if (!password || password.length < 6) {
      return res.status(422).json({ message: 'Password must be at least 6 characters' });
    }
    if (!name || name.trim().length < 1) {
      return res.status(422).json({ message: 'Name is required' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name: name.trim(),
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = signUserToken(user.id, user.role);
    res.status(201).json({ token, user });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(422).json({ message: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signUserToken(user.id, user.role);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) { next(e); }
});

router.get('/me', authRequired, async (req, res, next) => {
  try {
    if (req.subjectRole === 'CHILD') {
      const child = await prisma.child.findUnique({
        where: { id: req.subjectId },
        select: { id: true, name: true, age: true, avatar: true, xp: true, streak: true },
      });
      if (!child) return res.status(404).json({ message: 'Child not found' });
      return res.json({ ...child, role: 'CHILD' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.subjectId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e) { next(e); }
});

router.get('/child-profiles', async (req, res, next) => {
  try {
    const email = String(req.query.email || '').toLowerCase().trim();
    if (!EMAIL_RE.test(email)) {
      return res.json({ children: [] });
    }
    const parent = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });
    if (!parent || parent.role !== 'PARENT') {
      return res.json({ children: [] });
    }
    const children = await prisma.child.findMany({
      where: { parentId: parent.id },
      select: {
        id: true, name: true, age: true, avatar: true,
      
      },
      orderBy: { createdAt: 'asc' },
    });
  
    const withPinFlag = await Promise.all(children.map(async (c) => {
      const row = await prisma.child.findUnique({ where: { id: c.id }, select: { pinHash: true } });
      return { ...c, hasPin: !!row.pinHash };
    }));
    res.json({ children: withPinFlag });
  } catch (e) { next(e); }
});

router.post('/child-login', async (req, res, next) => {
  try {
    const { childId, pin } = req.body || {};
    if (!childId) return res.status(422).json({ message: 'childId required' });

    const child = await prisma.child.findUnique({
      where: { id: childId },
      select: { id: true, name: true, avatar: true, pinHash: true },
    });
    if (!child) return res.status(401).json({ message: 'Invalid login' });

    if (child.pinHash) {
      if (!pin || !PIN_RE.test(String(pin))) {
        return res.status(401).json({ message: 'Invalid PIN' });
      }
      const ok = await bcrypt.compare(String(pin), child.pinHash);
      if (!ok) return res.status(401).json({ message: 'Invalid PIN' });
    }
  

    const token = signChildToken(child.id);
    res.json({
      token,
      child: { id: child.id, name: child.name, avatar: child.avatar, role: 'CHILD' },
    });
  } catch (e) { next(e); }
});

module.exports = router;
