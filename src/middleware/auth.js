const jwt = require('jsonwebtoken');
const prisma = require('../data/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ACCESS_TTL = '1h';

// JWT payload carries:
//   sub  — user id (for PARENT/ADMIN) or child id (for CHILD)
//   role — 'PARENT' | 'ADMIN' | 'CHILD'
//
// We always include role explicitly so middleware can pick the right gate
// without an extra DB lookup on every request.

function signUserToken(userId, role) {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: ACCESS_TTL });
}

function signChildToken(childId) {
  return jwt.sign({ sub: childId, role: 'CHILD' }, JWT_SECRET, { expiresIn: ACCESS_TTL });
}

// Generic auth — any valid token. Sets req.subjectId, req.subjectRole.
// Use specific gates below for stronger checks.
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Missing access token' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.subjectId = payload.sub;
    req.subjectRole = payload.role || 'PARENT'; // legacy tokens default to parent
    // Convenience: keep userId for routes that already use it
    if (req.subjectRole !== 'CHILD') req.userId = payload.sub;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Only parents (registered users with role=PARENT). Token role check first,
// then we double-check in DB to prevent forged role claims (defense in depth).
async function parentRequired(req, res, next) {
  authRequired(req, res, async () => {
    if (req.subjectRole === 'CHILD') {
      return res.status(403).json({ message: 'Parents only' });
    }
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.subjectId },
        select: { id: true, role: true },
      });
      if (!user) return res.status(401).json({ message: 'User not found' });
      if (user.role !== 'PARENT' && user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Parents only' });
      }
      req.userId = user.id;
      next();
    } catch (e) { next(e); }
  });
}

// Admins only. Token role check + DB check.
async function adminRequired(req, res, next) {
  authRequired(req, res, async () => {
    if (req.subjectRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.subjectId },
        select: { id: true, role: true },
      });
      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      req.userId = user.id;
      next();
    } catch (e) { next(e); }
  });
}

// Children only — used to gate the play/learn endpoints.
async function childRequired(req, res, next) {
  authRequired(req, res, async () => {
    if (req.subjectRole !== 'CHILD') {
      return res.status(403).json({ message: 'Child profile required' });
    }
    try {
      const child = await prisma.child.findUnique({
        where: { id: req.subjectId },
        select: { id: true, parentId: true, name: true },
      });
      if (!child) return res.status(401).json({ message: 'Child profile not found' });
      req.childId = child.id;
      req.child = child;
      next();
    } catch (e) { next(e); }
  });
}

module.exports = {
  signUserToken,
  signChildToken,
  authRequired,
  parentRequired,
  adminRequired,
  childRequired,
  JWT_SECRET,
};
