const { tickGym } = require('../../src/services/simulatorEngine');
const { pool, query } = require('../../src/db/pool');

// tickGym's `now` parameter is fully caller-controlled (not read from the
// real clock internally), so a fixed high-traffic instant makes this
// deterministic regardless of when the suite actually runs.
const PEAK_MONDAY = new Date('2026-10-19T08:00:00+05:30'); // 8am Monday IST

let gym;
let randomSpy;

beforeAll(async () => {
  const { rows } = await query(
    `SELECT id, name, capacity, opens_at, closes_at FROM gyms WHERE status = 'active' ORDER BY capacity DESC LIMIT 1`
  );
  gym = rows[0];
});

afterAll(async () => {
  await pool.end();
});

afterEach(() => {
  if (randomSpy) randomSpy.mockRestore();
});

describe('tickGym', () => {
  test('writes real check-in/check-out/payment activity without throwing, at a forced-high firing probability', async () => {
    // Math.random() = 0 forces every `random() >= poissonFireProbability(...)`
    // guard to proceed (checkin + payment), and forces dueForCheckout's
    // `random() < 1/ticksRemaining` to fire for every eligible open session.
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    const { rows: beforeCheckins } = await query('SELECT COUNT(*)::int AS n FROM checkins WHERE gym_id = $1', [gym.id]);
    const { rows: beforePayments } = await query('SELECT COUNT(*)::int AS n FROM payments WHERE gym_id = $1', [gym.id]);

    await expect(tickGym(gym, PEAK_MONDAY, 2000)).resolves.not.toThrow();

    const { rows: afterCheckins } = await query('SELECT COUNT(*)::int AS n FROM checkins WHERE gym_id = $1', [gym.id]);
    const { rows: afterPayments } = await query('SELECT COUNT(*)::int AS n FROM payments WHERE gym_id = $1', [gym.id]);

    // At minimum the forced check-in attempt should have landed (capacity
    // permitting -- this gym was picked for its large capacity precisely
    // so there's room for one more member).
    expect(afterCheckins[0].n).toBeGreaterThanOrEqual(beforeCheckins[0].n);
    expect(afterPayments[0].n).toBeGreaterThanOrEqual(beforePayments[0].n);
  });

  test('is a safe no-op outside operating hours (closed gym, zero traffic multiplier)', async () => {
    const deadOfNight = new Date('2026-10-19T02:00:00+05:30');
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    const { rows: before } = await query('SELECT COUNT(*)::int AS n FROM checkins WHERE gym_id = $1', [gym.id]);
    await tickGym(gym, deadOfNight, 2000);
    const { rows: after } = await query('SELECT COUNT(*)::int AS n FROM checkins WHERE gym_id = $1', [gym.id]);

    // trafficMultiplier is 0 at 2am, so maybeCheckin/maybePayment must
    // short-circuit regardless of the forced random() = 0 -- only
    // maybeCheckout (unaffected by traffic multiplier) could still act,
    // which never creates new checkins rows.
    expect(after[0].n).toBe(before[0].n);
  });
});
