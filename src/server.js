const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const childrenRoutes = require('./routes/children');
const curriculumRoutes = require('./routes/curriculum');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/children', childrenRoutes);
app.use('/api/v1', curriculumRoutes);
app.use('/api/v1/admin', adminRoutes);

app.get('/api/v1/health', (req, res) => {
  res.json({ ok: true, service: 'readyabc', time: new Date().toISOString() });
});
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({
    message: err.publicMessage || 'Internal server error',
  });
});

const prisma = require('./data/prisma');

const server = app.listen(PORT, () => {
  console.log(`ReadyABC running at http://localhost:${PORT}`);
});
async function shutdown() {
  console.log('Shutting down…');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
