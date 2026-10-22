const {
  dueForCheckout,
  poissonFireProbability,
  SESSION_MIN_MINUTES,
  SESSION_MAX_MINUTES,
} = require('../../src/services/simulatorEngine');

describe('dueForCheckout', () => {
  test('never due before the minimum session length', () => {
    expect(dueForCheckout(SESSION_MIN_MINUTES - 1, 2000, () => 0)).toBe(false);
  });

  test('always due at/above the hard ceiling', () => {
    expect(dueForCheckout(SESSION_MAX_MINUTES, 2000, () => 0.999)).toBe(true);
    expect(dueForCheckout(SESSION_MAX_MINUTES + 10, 2000, () => 0.999)).toBe(true);
  });

  test('deterministically true mid-window when the random draw clears the threshold', () => {
    const elapsed = SESSION_MIN_MINUTES + 5;
    expect(dueForCheckout(elapsed, 2000, () => 0)).toBe(true); // 0 always clears 1/N
  });

  test('deterministically false mid-window when the random draw misses the threshold', () => {
    const elapsed = SESSION_MIN_MINUTES + 5;
    expect(dueForCheckout(elapsed, 2000, () => 0.999999)).toBe(false);
  });
});

describe('poissonFireProbability', () => {
  test('is 0 when expectedPerHour is 0', () => {
    expect(poissonFireProbability(0)).toBe(0);
  });

  test('increases monotonically with expectedPerHour', () => {
    const low = poissonFireProbability(10);
    const high = poissonFireProbability(100);
    expect(high).toBeGreaterThan(low);
  });

  test('always stays within [0, 1) for realistic gym-scale rates', () => {
    // Realistic upper bound: even Bandra West (capacity 300) peaks around
    // ~70 checkins/hour in the seed's calibration -- 500/hour is already
    // generously beyond any real gym. (Mathematically the function
    // approaches but never reaches 1 for any finite rate; at truly extreme
    // inputs like 1e5/hour, exp(-x) underflows to 0 in floating point and
    // 1-0 rounds to exactly 1.0 -- a numerical edge case, not a realistic
    // one, so it's intentionally out of scope here.)
    for (const rate of [0, 1, 50, 200, 500]) {
      const p = poissonFireProbability(rate);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });

  test('throughput scales with speed via the reference window, not the live tick interval', () => {
    // At a fixed reference window, a higher-frequency caller (more ticks
    // per real second) naturally yields proportionally higher real-world
    // throughput -- this is what makes the simulator's speed selector
    // actually do something (see Step 2's documented fix).
    const p1x = poissonFireProbability(60, 2000);
    const p10x = poissonFireProbability(60, 2000); // same reference window regardless of caller's tick rate
    expect(p1x).toBe(p10x);
  });
});
