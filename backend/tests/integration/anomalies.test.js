const request = require('supertest');
const app = require('../../src/app');
const { pool, query } = require('../../src/db/pool');

let gymId;
let gymIdB;
const fixtureIds = [];

async function insertFixtureAnomaly({ gymId: gid, type = 'zero_checkins', severity = 'warning' }) {
  const { rows } = await query(
    `INSERT INTO anomalies (gym_id, type, severity, message) VALUES ($1, $2, $3, $4) RETURNING id`,
    [gid, type, severity, `fixture: ${severity} ${type}`]
  );
  fixtureIds.push(rows[0].id);
  return rows[0].id;
}

beforeAll(async () => {
  const { rows } = await query('SELECT id FROM gyms ORDER BY name LIMIT 2');
  gymId = rows[0].id;
  gymIdB = rows[1].id;
});

afterAll(async () => {
  if (fixtureIds.length) {
    await query('DELETE FROM anomalies WHERE id = ANY($1::uuid[])', [fixtureIds]);
  }
  await pool.end();
});

describe('GET /api/anomalies', () => {
  test('returns 200 with an array', async () => {
    const res = await request(app).get('/api/anomalies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns an empty array for a gym_id + severity combination with no matches', async () => {
    // Determined dynamically against real data, rather than assuming an
    // empty DB -- the seeded/simulator-driven DB always has some
    // anomalies, so we pick a combination guaranteed to be empty: a gym
    // with no critical anomalies right now (checked first, so this never
    // flakes against live state).
    const all = await request(app).get('/api/anomalies');
    const gymsWithCritical = new Set(all.body.filter((a) => a.severity === 'critical').map((a) => a.gym_id));
    const { rows: allGyms } = await query('SELECT id FROM gyms');
    const quietGym = allGyms.find((g) => !gymsWithCritical.has(g.id));
    expect(quietGym).toBeDefined(); // sanity: at least one gym has no critical anomaly

    const res = await request(app).get(`/api/anomalies?gym_id=${quietGym.id}&severity=critical`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns 400 for a malformed gym_id', async () => {
    const res = await request(app).get('/api/anomalies?gym_id=not-a-uuid');
    expect(res.status).toBe(400);
  });

  test('returns 400 for an invalid severity', async () => {
    const res = await request(app).get('/api/anomalies?severity=urgent');
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/anomalies/:id/dismiss', () => {
  test('returns 403 and leaves a critical anomaly undismissed', async () => {
    const id = await insertFixtureAnomaly({ gymId, severity: 'critical', type: 'capacity_breach' });
    const res = await request(app).patch(`/api/anomalies/${id}/dismiss`);
    expect(res.status).toBe(403);

    const { rows } = await query('SELECT dismissed FROM anomalies WHERE id = $1', [id]);
    expect(rows[0].dismissed).toBe(false);
  });

  test('returns 200 and dismisses a warning anomaly', async () => {
    const id = await insertFixtureAnomaly({ gymId: gymIdB, severity: 'warning', type: 'revenue_drop' });
    const res = await request(app).patch(`/api/anomalies/${id}/dismiss`);
    expect(res.status).toBe(200);
    expect(res.body.dismissed).toBe(true);
  });

  test('returns 404 for a nonexistent anomaly', async () => {
    const res = await request(app).patch('/api/anomalies/00000000-0000-4000-8000-000000000000/dismiss');
    expect(res.status).toBe(404);
  });

  test('returns 400 for a malformed id', async () => {
    const res = await request(app).patch('/api/anomalies/not-a-uuid/dismiss');
    expect(res.status).toBe(400);
  });
});
