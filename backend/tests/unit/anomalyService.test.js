const {
  evaluateZeroCheckins,
  evaluateCapacityBreach,
  evaluateRevenueDrop,
  isWithinOperatingHours,
} = require('../../src/services/anomalyService');

// Wednesday 2026-10-21, 14:00 IST -- a fixed reference instant so every
// test's "ago" offsets are computed relative to a known point in time.
const NOW = new Date('2026-10-21T14:00:00+05:30');
const hoursAgo = (h) => new Date(NOW.getTime() - h * 60 * 60 * 1000);

describe('evaluateZeroCheckins', () => {
  const opensAt = '06:00';
  const closesAt = '22:00';

  test('fires when no check-in in >2h and within operating hours', () => {
    const result = evaluateZeroCheckins({ lastCheckinAt: hoursAgo(3), now: NOW, opensAt, closesAt });
    expect(result.shouldFire).toBe(true);
  });

  test('does not fire when a recent check-in exists', () => {
    const result = evaluateZeroCheckins({ lastCheckinAt: hoursAgo(0.5), now: NOW, opensAt, closesAt });
    expect(result.shouldFire).toBe(false);
  });

  test('does not fire outside operating hours even if stale', () => {
    const nightTime = new Date('2026-10-21T02:00:00+05:30'); // 2am, gym closed
    const result = evaluateZeroCheckins({ lastCheckinAt: hoursAgo(3), now: nightTime, opensAt, closesAt });
    expect(result.shouldFire).toBe(false);
  });

  test('fires when lastCheckinAt is null (never checked in)', () => {
    const result = evaluateZeroCheckins({ lastCheckinAt: null, now: NOW, opensAt, closesAt });
    expect(result.shouldFire).toBe(true);
  });

  test('resolves when a recent check-in exists', () => {
    const result = evaluateZeroCheckins({ lastCheckinAt: hoursAgo(0.25), now: NOW, opensAt, closesAt });
    expect(result.shouldResolve).toBe(true);
  });

  test('does not resolve while still stale', () => {
    const result = evaluateZeroCheckins({ lastCheckinAt: hoursAgo(5), now: NOW, opensAt, closesAt });
    expect(result.shouldResolve).toBe(false);
  });

  test('resolve is independent of operating hours (stays open overnight until a real check-in)', () => {
    const nightTime = new Date('2026-10-21T02:00:00+05:30');
    const staleRelativeToNight = new Date(nightTime.getTime() - 5 * 60 * 60 * 1000); // 5h before nightTime, not before the global NOW fixture
    const result = evaluateZeroCheckins({ lastCheckinAt: staleRelativeToNight, now: nightTime, opensAt, closesAt });
    expect(result.shouldFire).toBe(false); // outside hours, don't newly fire
    expect(result.shouldResolve).toBe(false); // but also don't resolve just because closed
  });
});

describe('evaluateCapacityBreach', () => {
  test('fires when occupancy > 90% of capacity', () => {
    const result = evaluateCapacityBreach({ currentOccupancy: 95, capacity: 100 });
    expect(result.shouldFire).toBe(true);
  });

  test('does not fire at exactly 90%', () => {
    const result = evaluateCapacityBreach({ currentOccupancy: 90, capacity: 100 });
    expect(result.shouldFire).toBe(false);
  });

  test('resolves when occupancy drops below 85%', () => {
    const result = evaluateCapacityBreach({ currentOccupancy: 80, capacity: 100 });
    expect(result.shouldResolve).toBe(true);
  });

  test('does not resolve at exactly 85%', () => {
    const result = evaluateCapacityBreach({ currentOccupancy: 85, capacity: 100 });
    expect(result.shouldResolve).toBe(false);
  });

  test('hysteresis band 85-90%: neither fires nor resolves', () => {
    const result = evaluateCapacityBreach({ currentOccupancy: 87, capacity: 100 });
    expect(result.shouldFire).toBe(false);
    expect(result.shouldResolve).toBe(false);
  });
});

describe('evaluateRevenueDrop', () => {
  test('fires when today is < 70% of same day last week', () => {
    const result = evaluateRevenueDrop({ todayRevenue: 60, lastWeekSameDayRevenue: 100 });
    expect(result.shouldFire).toBe(true);
  });

  test('does not fire at exactly 70%', () => {
    const result = evaluateRevenueDrop({ todayRevenue: 70, lastWeekSameDayRevenue: 100 });
    expect(result.shouldFire).toBe(false);
  });

  test('resolves when revenue recovers to >= 80% of last week', () => {
    const result = evaluateRevenueDrop({ todayRevenue: 85, lastWeekSameDayRevenue: 100 });
    expect(result.shouldResolve).toBe(true);
  });

  test('hysteresis band 70-80%: neither fires nor resolves', () => {
    const result = evaluateRevenueDrop({ todayRevenue: 75, lastWeekSameDayRevenue: 100 });
    expect(result.shouldFire).toBe(false);
    expect(result.shouldResolve).toBe(false);
  });

  test('never fires when there is no baseline (last week revenue <= 0)', () => {
    const result = evaluateRevenueDrop({ todayRevenue: 0, lastWeekSameDayRevenue: 0 });
    expect(result.shouldFire).toBe(false);
    expect(result.shouldResolve).toBe(false);
  });
});

describe('isWithinOperatingHours', () => {
  test('true in the middle of the day', () => {
    expect(isWithinOperatingHours(NOW, '06:00', '22:00')).toBe(true);
  });

  test('false before opening', () => {
    const early = new Date('2026-10-21T04:00:00+05:30');
    expect(isWithinOperatingHours(early, '06:00', '22:00')).toBe(false);
  });

  test('false after closing', () => {
    const late = new Date('2026-10-21T23:00:00+05:30');
    expect(isWithinOperatingHours(late, '06:00', '22:00')).toBe(false);
  });
});
