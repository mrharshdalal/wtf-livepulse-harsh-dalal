const { waitForDb, pool, query } = require('../../src/db/pool');

afterAll(async () => {
  await pool.end();
});

describe('db/pool', () => {
  test('waitForDb resolves once the database is reachable', async () => {
    await expect(waitForDb({ retries: 1, delayMs: 10 })).resolves.toBeUndefined();
  });

  test('query() runs against the real database', async () => {
    const { rows } = await query('SELECT 1 AS n');
    expect(rows[0].n).toBe(1);
  });
});
