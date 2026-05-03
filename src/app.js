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
  app.use('/api/v1/children', childrenRoutes);
  app.use('/api/v1', curriculumRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/admin', adminCrudRoutes);

  app.get('/api/v1/health', (req, res) => {
    res.json({ ok: true });
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));

 
  app.use((err, req, res, next) => {
    console.error('[error]', err);
    res.status(err.status || 500).json({ message: err.publicMessage || 'Internal server error' });
  });

  return app;
}

module.exports = { buildApp };
