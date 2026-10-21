/**
 * Pure anomaly-evaluation functions -- no DB access, so they're directly
 * unit-testable in isolation. Each takes plain data and returns
 * { shouldFire, shouldResolve }.
 */

const { localTimeParts } = require('../shared/trafficPatterns');

function timeStringToMinutes(timeStr) {
  // pg TIME column comes back as a string, e.g. '05:30:00'.
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function isWithinOperatingHours(now, opensAt, closesAt, timeZone = 'Asia/Kolkata') {
  const { minuteOfDay: nowMin } = localTimeParts(now, timeZone);
  const openMin = timeStringToMinutes(opensAt);
  const closeMin = timeStringToMinutes(closesAt);
  if (openMin <= closeMin) return nowMin >= openMin && nowMin <= closeMin;
  return nowMin >= openMin || nowMin <= closeMin; // overnight wrap, defensive
}

/**
 * @param {{ lastCheckinAt: Date|null, now: Date, opensAt: string, closesAt: string }} data
 * @returns {{ shouldFire: boolean, shouldResolve: boolean }}
 */
function evaluateZeroCheckins({ lastCheckinAt, now, opensAt, closesAt }) {
  const twoHoursAgo = now.getTime() - 2 * 60 * 60 * 1000;
  const noRecentCheckin = lastCheckinAt === null || lastCheckinAt.getTime() < twoHoursAgo;
  return {
    shouldFire: isWithinOperatingHours(now, opensAt, closesAt) && noRecentCheckin,
    // Resolve condition is exactly "a check-in is recorded" per spec -- NOT
    // gated on operating hours. An anomaly that fired during the day stays
    // open overnight until an actual fresh check-in happens.
    shouldResolve: !noRecentCheckin,
  };
}

/**
 * @param {{ currentOccupancy: number, capacity: number }} data
 * @returns {{ shouldFire: boolean, shouldResolve: boolean }}
 */
function evaluateCapacityBreach({ currentOccupancy, capacity }) {
  const pct = currentOccupancy / capacity;
  // Independent conditions, not a negation of each other: for pct in
  // (0.85, 0.90] both are false -- that's the deliberate hysteresis band
  // that prevents flapping right at the 90% line.
  return { shouldFire: pct > 0.9, shouldResolve: pct < 0.85 };
}

/**
 * @param {{ todayRevenue: number, lastWeekSameDayRevenue: number }} data
 * @returns {{ shouldFire: boolean, shouldResolve: boolean }}
 */
function evaluateRevenueDrop({ todayRevenue, lastWeekSameDayRevenue }) {
  if (lastWeekSameDayRevenue <= 0) {
    // No baseline to compare against -- can't meaningfully claim a "drop".
    return { shouldFire: false, shouldResolve: false };
  }
  const ratio = todayRevenue / lastWeekSameDayRevenue;
  // Independent conditions -- hysteresis band between 70% and 80%.
  return { shouldFire: ratio < 0.7, shouldResolve: ratio >= 0.8 };
}

module.exports = {
  evaluateZeroCheckins,
  evaluateCapacityBreach,
  evaluateRevenueDrop,
  isWithinOperatingHours,
};
