const path = require('path');
const express = require('express');
const cors = require('cors');
 
const authRoutes = require('./routes/auth');
const childrenRoutes = require('./routes/children');
const curriculumRoutes = require('./routes/curriculum');
const adminRoutes = require('./routes/admin');
const adminCrudRoutes = require('./routes/admin-crud');
 
function buildApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));
 
  app.use('/api/v1/auth', authRoutes);
  // curriculum first — it owns /children/:id/curriculum and allows CHILD tokens.
  // children.js comes after; it owns the rest of /children/* and is parent-only.
  app.use('/api/v1', curriculumRoutes);
  app.use('/api/v1/children', childrenRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/admin', adminCrudRoutes);
 
  app.get('/api/v1/health', (req, res) => {
    res.json({ ok: true });
  });
 
  app.use(express.static(path.join(__dirname, '..', 'public')));
 
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[error]', err);
    res.status(err.status || 500).json({ message: err.publicMessage || 'Internal server error' });
  });
 
  return app;
}
 
module.exports = { buildApp };