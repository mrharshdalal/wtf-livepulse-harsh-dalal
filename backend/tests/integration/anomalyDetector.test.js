const anomalyDetector = require('../../src/jobs/anomalyDetector');
const { pool, query } = require('../../src/db/pool');

afterAll(async () => {
  await pool.end();
});

describe('anomalyDetector.tick', () => {
  test('runs a full reconciliation pass against the real seeded data without throwing', async () => {
    await expect(anomalyDetector.tick()).resolves.not.toThrow();
  });

  test('is idempotent: a second consecutive tick does not duplicate open anomalies per gym+type', async () => {
    await anomalyDetector.tick();
    await anomalyDetector.tick();

    const { rows } = await query(
      `SELECT gym_id, type, COUNT(*)::int AS n FROM anomalies WHERE resolved = FALSE GROUP BY gym_id, type HAVING COUNT(*) > 1`
    );
    expect(rows).toEqual([]);
  });

  test('every naturally-stale active gym gets a zero_checkins anomaly, end-to-end (not just the pure evaluator)', async () => {
    // Read-only: finds whichever active gyms are *already* stale (same
    // >2h10m window the detector itself uses) under real, unmutated data
    // -- rather than forcing the condition via a destructive UPDATE across
    // a gym's entire check-in history, which would permanently corrupt
    // real seed/simulator data with no cheap way back.
    const { rows: staleGyms } = await query(`
      SELECT g.id, g.name FROM gyms g
      WHERE g.status = 'active'
        AND g.id NOT IN (
          SELECT gym_id FROM checkins WHERE checked_in >= NOW() - INTERVAL '2 hours 10 minutes'
        )
    `);

    await anomalyDetector.tick();

    for (const gym of staleGyms) {
      const { rows: open } = await query(
        `SELECT id FROM anomalies WHERE gym_id = $1 AND type = 'zero_checkins' AND resolved = FALSE`,
        [gym.id]
      );
      expect(open.length).toBeGreaterThanOrEqual(1);
    }
  });
});
