// Shared setup for integration tests.
// Each test file uses this to get a fresh DB state.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Wipe all user-generated data but keep curriculum + badges (seeded once).
async function resetTestData() {
  // Order matters because of FK constraints.
  await prisma.notification.deleteMany();
  await prisma.childBadge.deleteMany();
  await prisma.completion.deleteMany();
  await prisma.child.deleteMany();
  await prisma.user.deleteMany({ where: { role: 'PARENT' } });
}

async function disconnect() {
  await prisma.$disconnect();
}

module.exports = { prisma, resetTestData, disconnect };
