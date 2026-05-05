const request = require('supertest');
const { buildApp } = require('../../src/app');
const { resetTestData, disconnect } = require('./setup');

const app = buildApp();

beforeEach(async () => {
  await resetTestData();
});

afterAll(async () => {
  await disconnect();
});

describe('POST /api/v1/auth/register', () => {
  test('creates a parent and returns a token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'mom@example.com', password: 'secret123', name: 'Mom' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ email: 'mom@example.com', name: 'Mom' });
  });

  test('rejects duplicate email', async () => {
    await request(app).post('/api/v1/auth/register')
      .send({ email: 'a@b.com', password: 'secret123', name: 'A' });

    const res = await request(app).post('/api/v1/auth/register')
      .send({ email: 'a@b.com', password: 'secret123', name: 'B' });

    expect(res.status).toBe(409);
  });

  test('rejects short passwords', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ email: 'a@b.com', password: '123', name: 'A' });

    expect(res.status).toBe(422);
  });

  test('rejects invalid email format', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'secret123', name: 'A' });

    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register')
      .send({ email: 'mom@example.com', password: 'secret123', name: 'Mom' });
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: 'mom@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('rejects wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: 'mom@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  test('rejects unknown email', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'secret123' });

    expect(res.status).toBe(401);
  });
});

describe('Children CRUD', () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ email: 'mom@example.com', password: 'secret123', name: 'Mom' });
    token = res.body.token;
  });

  test('GET /children without token returns 401', async () => {
    const res = await request(app).get('/api/v1/children');
    expect(res.status).toBe(401);
  });

  test('POST /children creates a child profile', async () => {
    const res = await request(app)
      .post('/api/v1/children')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mia', age: 5, avatar: '🦊' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Mia', age: 5, xp: 0, streak: 0 });
  });

  test('rejects age outside 3–8', async () => {
    const res = await request(app)
      .post('/api/v1/children')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mia', age: 12, avatar: '🦊' });

    expect(res.status).toBe(422);
  });

  test('parent A cannot read parent B\'s child', async () => {
    // Parent A creates a child
    const aChild = await request(app)
      .post('/api/v1/children')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mia', age: 5, avatar: '🦊' });

    // Parent B registers
    const bRes = await request(app).post('/api/v1/auth/register')
      .send({ email: 'dad@example.com', password: 'secret123', name: 'Dad' });
    const bToken = bRes.body.token;

    // Parent B tries to read parent A's child
    const stealAttempt = await request(app)
      .get(`/api/v1/children/${aChild.body.id}`)
      .set('Authorization', `Bearer ${bToken}`);

    expect(stealAttempt.status).toBe(403);
  });
});
