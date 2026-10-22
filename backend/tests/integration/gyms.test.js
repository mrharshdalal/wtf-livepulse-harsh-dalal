const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/db/pool');

afterAll(async () => {
  await pool.end();
});

describe('GET /api/gyms', () => {
  test('returns 200 with exactly the 10 seeded gyms, correct structure', async () => {
    const res = await request(app).get('/api/gyms');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(10);
    const gym = res.body[0];
    expect(gym).toHaveProperty('id');
    expect(gym).toHaveProperty('name');
    expect(gym).toHaveProperty('city');
    expect(gym).toHaveProperty('capacity');
    expect(gym).toHaveProperty('current_occupancy');
    expect(gym).toHaveProperty('today_revenue');
    expect(gym).toHaveProperty('status');
  });
});

describe('GET /api/gyms/:id/live', () => {
  let gymId;

  beforeAll(async () => {
    const res = await request(app).get('/api/gyms');
    gymId = res.body[0].id;
  });

  test('returns 200 with all required live-snapshot fields', async () => {
    const res = await request(app).get(`/api/gyms/${gymId}/live`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      gym_id: gymId,
      gym_name: expect.any(String),
      capacity: expect.any(Number),
      status: expect.any(String),
      current_occupancy: expect.any(Number),
      today_revenue: expect.any(Number),
      capacity_pct: expect.any(Number),
    });
    expect(Array.isArray(res.body.recent_events)).toBe(true);
    expect(Array.isArray(res.body.active_anomalies)).toBe(true);
  });

  test('returns 400 for a malformed id', async () => {
    const res = await request(app).get('/api/gyms/not-a-uuid/live');
    expect(res.status).toBe(400);
  });

  test('returns 404 for a well-formed but nonexistent id', async () => {
    const res = await request(app).get('/api/gyms/00000000-0000-4000-8000-000000000000/live');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/gyms/:id/analytics', () => {
  let gymId;

  beforeAll(async () => {
    const res = await request(app).get('/api/gyms');
    gymId = res.body[0].id;
  });

  test('returns 200 with all analytics widgets for a valid gym', async () => {
    const res = await request(app).get(`/api/gyms/${gymId}/analytics`);
    expect(res.status).toBe(200);
    expect(res.body.date_range).toBe('30d');
    expect(Array.isArray(res.body.heatmap)).toBe(true);
    expect(Array.isArray(res.body.revenue_by_plan)).toBe(true);
    expect(Array.isArray(res.body.churn_risk)).toBe(true);
    expect(Array.isArray(res.body.new_vs_renewal)).toBe(true);
  });

  test('returns 400 for an invalid dateRange', async () => {
    const res = await request(app).get(`/api/gyms/${gymId}/analytics?dateRange=bogus`);
    expect(res.status).toBe(400);
  });

  test('returns 404 for a nonexistent gym', async () => {
    const res = await request(app).get('/api/gyms/00000000-0000-4000-8000-000000000000/analytics');
    expect(res.status).toBe(404);
  });
});
