const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/db/pool');

afterAll(async () => {
  // Leave the simulator stopped and the test process's own in-memory
  // instance idle -- this test process's simulatorService is independent
  // from the live backend container's (separate Node process), so this
  // only affects state within this test run.
  await request(app).post('/api/simulator/stop');
  await pool.end();
});

describe('POST /api/simulator/start', () => {
  test('starts at a valid speed and returns the running status', async () => {
    const res = await request(app).post('/api/simulator/start').send({ speed: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'running', speed: 1 });
  });

  test('rejects an invalid speed', async () => {
    const res = await request(app).post('/api/simulator/start').send({ speed: 3 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/simulator/stop', () => {
  test('returns the paused status', async () => {
    const res = await request(app).post('/api/simulator/stop');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'paused' });
  });
});

describe('POST /api/simulator/reset', () => {
  test('returns the reset status', async () => {
    const res = await request(app).post('/api/simulator/reset');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'reset' });
  });
});
