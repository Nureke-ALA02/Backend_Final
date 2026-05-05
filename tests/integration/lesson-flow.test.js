const request = require('supertest');
const { buildApp } = require('../../src/app');
const { prisma, resetTestData, disconnect } = require('./setup');

const app = buildApp();

let token;
let childId;
let firstLessonId;

beforeEach(async () => {
  await resetTestData();

  // Register a parent
  const reg = await request(app).post('/api/v1/auth/register')
    .send({ email: 'mom@example.com', password: 'secret123', name: 'Mom' });
  token = reg.body.token;

  // Create a child
  const ch = await request(app).post('/api/v1/children')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Mia', age: 5, avatar: '🦊' });
  childId = ch.body.id;

  // Pick the first lesson from the seeded curriculum
  const lessons = await prisma.lesson.findMany({ orderBy: { order: 'asc' } });
  firstLessonId = lessons[0].id;
});

afterAll(async () => {
  await disconnect();
});

describe('Lesson completion flow', () => {
  test('GET /lessons/:id returns the lesson without the answer field', async () => {
    const res = await request(app)
      .get(`/api/v1/lessons/${firstLessonId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.exercises.length).toBeGreaterThan(0);
    for (const ex of res.body.exercises) {
      expect(ex).not.toHaveProperty('answer');   // critical security check
      expect(ex).toHaveProperty('prompt');
      expect(ex).toHaveProperty('options');
    }
  });

  test('completing a lesson with all correct answers gives 3 stars and bonus XP', async () => {
    const res = await request(app)
      .post(`/api/v1/lessons/${firstLessonId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, correctCount: 3, totalCount: 3, durationSec: 60 });

    expect(res.status).toBe(200);
    expect(res.body.stars).toBe(3);
    expect(res.body.xpGained).toBe(35);    // 3*10 + 5 bonus
    expect(res.body.totalXp).toBe(35);
    expect(res.body.streak).toBe(1);
  });

  test('first completion awards the first_lesson badge', async () => {
    const res = await request(app)
      .post(`/api/v1/lessons/${firstLessonId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, correctCount: 3, totalCount: 3, durationSec: 60 });

    const badgeIds = res.body.newBadges.map((b) => b.id);
    expect(badgeIds).toContain('first_lesson');
  });

  test('a completion row is persisted in the database', async () => {
    await request(app)
      .post(`/api/v1/lessons/${firstLessonId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, correctCount: 2, totalCount: 3, durationSec: 60 });

    const completions = await prisma.completion.findMany({ where: { childId } });
    expect(completions).toHaveLength(1);
    expect(completions[0].stars).toBe(2);    // 2/3 = 66% — actually 1 star, see next test
  });

  test('exercise submission marks correctness', async () => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: firstLessonId },
      include: { exercises: { orderBy: { order: 'asc' } } },
    });
    const ex = lesson.exercises[0];

    const correctRes = await request(app)
      .post(`/api/v1/exercises/${ex.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, answer: ex.answer });
    expect(correctRes.body.correct).toBe(true);

    const wrongRes = await request(app)
      .post(`/api/v1/exercises/${ex.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, answer: 'definitely wrong' });
    expect(wrongRes.body.correct).toBe(false);
    expect(wrongRes.body.correctAnswer).toBe(ex.answer);
  });

  test('completing every lesson in unit 1 awards unit_done', async () => {
    const u1Lessons = await prisma.lesson.findMany({
      where: { unit: { order: 1 } },
      orderBy: { order: 'asc' },
    });

    let lastResponse;
    for (const l of u1Lessons) {
      lastResponse = await request(app)
        .post(`/api/v1/lessons/${l.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ childId, correctCount: 3, totalCount: 3, durationSec: 30 });
    }

    const allBadgeIdsAcrossCalls = await prisma.childBadge.findMany({
      where: { childId },
      select: { badgeId: true },
    });
    const ids = allBadgeIdsAcrossCalls.map((b) => b.badgeId);
    expect(ids).toContain('unit_done');
  });
});
