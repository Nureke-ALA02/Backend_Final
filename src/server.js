const path = require('path');
const { buildApp } = require('./app');
const prisma = require('./data/prisma');

const app = buildApp();
const PORT = process.env.PORT || 3000;

// SPA catch-all → index.html for client-side routing (only set up in real server, not in tests)
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

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
