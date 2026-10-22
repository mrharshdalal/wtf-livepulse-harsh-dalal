const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/db/pool');

afterAll(async () => {
  await pool.end();
});

describe('GET /api/health', () => {
  test('returns 200 with db: up against the real database', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe('up');
  });
});

describe('GET /api/events/recent', () => {
  test('returns up to the requested limit of cross-gym events', async () => {
    const res = await request(app).get('/api/events/recent?limit=5');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeLessThanOrEqual(5);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('event_type');
      expect(res.body[0]).toHaveProperty('gym_name');
      expect(res.body[0]).toHaveProperty('gym_id');
    }
  });

  test('clamps an out-of-range limit instead of erroring', async () => {
    const res = await request(app).get('/api/events/recent?limit=9999');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(50);
  });
});
