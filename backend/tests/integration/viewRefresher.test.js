const viewRefresher = require('../../src/jobs/viewRefresher');
const { pool, query } = require('../../src/db/pool');

afterAll(async () => {
  viewRefresher.stop();
  await pool.end();
});

describe('jobs/viewRefresher', () => {
  test('refresh() rebuilds gym_hourly_stats without throwing, rows survive', async () => {
    await expect(viewRefresher.refresh()).resolves.toBeUndefined();
    const { rows } = await query('SELECT COUNT(*)::int AS n FROM gym_hourly_stats');
    expect(rows[0].n).toBeGreaterThan(0);
  });

  test('start()/stop() arm and disarm the interval idempotently', () => {
    viewRefresher.start();
    viewRefresher.start(); // no-op the second time -- doesn't throw or double-arm
    viewRefresher.stop();
    viewRefresher.stop(); // no-op when already stopped
  });
});
