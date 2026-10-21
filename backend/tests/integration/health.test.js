jest.mock('../../src/db/pool', () => ({
  pool: { end: jest.fn() },
  query: jest.fn().mockResolvedValue({ rows: [{ count: '0' }] }),
  waitForDb: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const app = require('../../src/app');

describe('GET /api/*', () => {
  test('unknown route returns 404 JSON', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/gyms returns 501 (not implemented stub)', async () => {
    const res = await request(app).get('/api/gyms');
    expect(res.status).toBe(501);
    expect(res.body).toEqual({ error: 'Not implemented', endpoint: 'GET /gyms' });
  });
});
