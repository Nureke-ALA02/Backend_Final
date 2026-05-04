const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@readyabc.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Site Admin';

const BADGES = [
  { id: 'first_lesson', name: 'First Lesson',  description: 'Complete your very first lesson', emoji: '🌟' },
  { id: 'xp_100',       name: '100 XP Club',   description: 'Earn 100 XP',                     emoji: '💯' },
  { id: 'streak_3',     name: '3-Day Streak',  description: 'Practice 3 days in a row',        emoji: '🔥' },
  { id: 'unit_done',    name: 'Unit Champion', description: 'Finish a whole unit',             emoji: '🏆' },
];

const UNITS = [
  {
    id: 'u1',
    title: 'Letters A–E',
    description: 'Meet your first five letters',
    order: 1,
    lessons: [
      {
        id: 'l1',
        title: 'The letter A',
        order: 1,
        exercises: [
          { id: 'e1', type: 'PHONICS',    prompt: 'Which letter says "ahh" like in apple?', options: ['A','B','C','D'], answer: 'A',  order: 1 },
          { id: 'e2', type: 'VOCABULARY', prompt: 'Tap the picture that starts with A',
            options: [{ label: 'Apple', emoji: '🍎' }, { label: 'Bear', emoji: '🐻' }, { label: 'Cat', emoji: '🐱' }],
            answer: 'Apple', order: 2 },
          { id: 'e3', type: 'SIGHT_WORD', prompt: 'Find the word "AT"', options: ['IT','AT','OT','UT'], answer: 'AT', order: 3 },
        ],
      },
      {
        id: 'l2',
        title: 'The letter B',
        order: 2,
        exercises: [
          { id: 'e4', type: 'PHONICS',    prompt: 'Which letter says "buh" like in ball?', options: ['B','P','D','V'], answer: 'B', order: 1 },
          { id: 'e5', type: 'VOCABULARY', prompt: 'Tap the picture that starts with B',
            options: [{ label: 'Sun', emoji: '☀️' }, { label: 'Ball', emoji: '⚽' }, { label: 'Tree', emoji: '🌳' }],
            answer: 'Ball', order: 2 },
        ],
      },
      {
        id: 'l3',
        title: 'A & B together',
        order: 3,
        exercises: [
          { id: 'e6', type: 'SIGHT_WORD', prompt: 'Which word starts with B?', options: ['ANT','BAT','CAT','EGG'], answer: 'BAT', order: 1 },
          { id: 'e7', type: 'VOCABULARY', prompt: 'Which one is a Bee?',
            options: [{ label: 'Bee', emoji: '🐝' }, { label: 'Apple', emoji: '🍎' }, { label: 'Fish', emoji: '🐟' }],
            answer: 'Bee', order: 2 },
        ],
      },
    ],
  },
  {
    id: 'u2',
    title: 'First Words',
    description: 'Read your first short words',
    order: 2,
    lessons: [
      {
        id: 'l4',
        title: 'Three-letter words',
        order: 1,
        exercises: [
          { id: 'e8', type: 'SIGHT_WORD', prompt: 'Which word means a small animal that says "meow"?', options: ['DOG','CAT','COW','PIG'], answer: 'CAT', order: 1 },
          { id: 'e9', type: 'VOCABULARY', prompt: 'Tap the dog',
            options: [{ label: 'Cat', emoji: '🐱' }, { label: 'Dog', emoji: '🐶' }, { label: 'Pig', emoji: '🐷' }],
            answer: 'Dog', order: 2 },
        ],
      },
    ],
  },
];

async function main() {
  console.log('Seeding admin user…');
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where:  { email: ADMIN_EMAIL.toLowerCase() },
    update: { role: 'ADMIN', name: ADMIN_NAME }, // don't reset password on re-seed
    create: {
      email: ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      name: ADMIN_NAME,
      role: 'ADMIN',
    },
  });
  console.log(`  → admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  console.log('Seeding badges…');
  for (const b of BADGES) {
    await prisma.badge.upsert({
      where:  { id: b.id },
      update: { name: b.name, description: b.description, emoji: b.emoji },
      create: b,
    });
  }

  console.log('Seeding curriculum…');
  for (const u of UNITS) {
    await prisma.unit.upsert({
      where:  { id: u.id },
      update: { title: u.title, description: u.description, order: u.order },
      create: { id: u.id, title: u.title, description: u.description, order: u.order },
    });

    for (const l of u.lessons) {
      await prisma.lesson.upsert({
        where:  { id: l.id },
        update: { title: l.title, order: l.order, unitId: u.id },
        create: { id: l.id, title: l.title, order: l.order, unitId: u.id },
      });

      for (const e of l.exercises) {
        await prisma.exercise.upsert({
          where:  { id: e.id },
          update: { type: e.type, prompt: e.prompt, options: e.options, answer: e.answer, order: e.order, lessonId: l.id },
          create: { id: e.id, type: e.type, prompt: e.prompt, options: e.options, answer: e.answer, order: e.order, lessonId: l.id },
        });
      }
    }
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
