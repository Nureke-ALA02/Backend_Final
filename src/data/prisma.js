// Single shared Prisma client. Re-using one instance avoids exhausting
// the Postgres connection pool when the dev server hot-reloads.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
