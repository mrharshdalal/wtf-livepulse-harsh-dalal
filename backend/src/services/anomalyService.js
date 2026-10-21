/**
 * TODO: implement real anomaly detection logic.
 *
 * These are pure functions — no DB access — so they can be unit-tested in
 * isolation. Each takes plain data and returns { shouldFire, shouldResolve }.
 *
 * Rules to implement:
 *  - Zero check-ins: no check-ins in the last 2 hours during the gym's
 *    opening hours. Severity: warning. Resolves on a new check-in.
 *  - Capacity breach: occupancy over 90% of capacity. Severity: critical.
 *    Resolves when occupancy drops below 85%.
 *  - Revenue drop: today's revenue at least 30% below the same weekday last
 *    week. Severity: warning. Resolves when within 20%.
 */

/**
 * @param {{ lastCheckinAt: Date|null, now: Date, opensAt: string, closesAt: string }} data
 * @returns {{ shouldFire: boolean, shouldResolve: boolean }}
 */
function evaluateZeroCheckins(data) {
  throw new Error('Not implemented');
}

/**
 * @param {{ currentOccupancy: number, capacity: number }} data
 * @returns {{ shouldFire: boolean, shouldResolve: boolean }}
 */
function evaluateCapacityBreach(data) {
  throw new Error('Not implemented');
}

/**
 * @param {{ todayRevenue: number, lastWeekSameDayRevenue: number }} data
 * @returns {{ shouldFire: boolean, shouldResolve: boolean }}
 */
function evaluateRevenueDrop(data) {
  throw new Error('Not implemented');
}

module.exports = {
  evaluateZeroCheckins,
  evaluateCapacityBreach,
  evaluateRevenueDrop,
};
