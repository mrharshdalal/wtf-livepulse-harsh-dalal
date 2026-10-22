const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/db/pool');

afterAll(async () => {
  await pool.end();
});

describe('GET /api/analytics/cross-gym', () => {
  test('returns all 10 gyms ranked by revenue descending', async () => {
    const res = await request(app).get('/api/analytics/cross-gym');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);

    const revenues = res.body.map((g) => g.total_revenue);
    const sorted = [...revenues].sort((a, b) => b - a);
    expect(revenues).toEqual(sorted);

    expect(res.body[0]).toMatchObject({
      gym_id: expect.any(String),
      gym_name: expect.any(String),
      total_revenue: expect.any(Number),
      rank: expect.any(Number),
    });
  });
});
