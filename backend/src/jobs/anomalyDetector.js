const config = require('../config');
const { query } = require('../db/pool');
const statsService = require('../services/statsService');
const anomalyRepository = require('../services/anomalyRepository');
const anomalyService = require('../services/anomalyService');
const { broadcastAnomalyDetected, broadcastAnomalyResolved } = require('../websocket/broadcast');

let intervalHandle = null;
let ticking = false; // reentrancy guard -- skip overlapping ticks

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    await anomalyRepository.archiveOldResolved();
    const { rows: gyms } = await query(
      `SELECT id, name, capacity, opens_at, closes_at FROM gyms WHERE status = 'active'`
    );
    const now = new Date();
    await Promise.all(gyms.map((gym) => evaluateGym(gym, now)));
  } catch (err) {
    console.error('[anomalyDetector] tick failed:', err);
  } finally {
    ticking = false;
  }
}

async function evaluateGym(gym, now) {
  const [occupancy, todayRevenue, lastWeekRevenue, lastCheckinAt] = await Promise.all([
    statsService.getLiveOccupancy(gym.id),
    statsService.getTodayRevenue(gym.id),
    statsService.getSameWeekdayLastWeekRevenue(gym.id),
    statsService.getRecentCheckinWithinWindow(gym.id, 3),
  ]);

  await reconcile(
    gym, 'zero_checkins', 'warning',
    anomalyService.evaluateZeroCheckins({ lastCheckinAt, now, opensAt: gym.opens_at, closesAt: gym.closes_at }),
    `No check-ins at ${gym.name} in the last 2 hours during operating hours.`
  );

  await reconcile(
    gym, 'capacity_breach', 'critical',
    anomalyService.evaluateCapacityBreach({ currentOccupancy: occupancy, capacity: gym.capacity }),
    `${gym.name} is at ${Math.round((occupancy / gym.capacity) * 100)}% capacity.`
  );

  await reconcile(
    gym, 'revenue_drop', 'warning',
    anomalyService.evaluateRevenueDrop({ todayRevenue, lastWeekSameDayRevenue: lastWeekRevenue }),
    `${gym.name}'s revenue today is significantly below the same day last week.`
  );
}

// shouldFire && !open    -> insert + broadcast ANOMALY_DETECTED
// shouldResolve && open  -> resolve + broadcast ANOMALY_RESOLVED
// otherwise (including the hysteresis band where neither is true) -> no-op
async function reconcile(gym, type, severity, { shouldFire, shouldResolve }, message) {
  const open = await anomalyRepository.findOpenAnomaly(gym.id, type);
  if (shouldFire && !open) {
    const anomaly = await anomalyRepository.insertAnomaly({ gymId: gym.id, type, severity, message });
    broadcastAnomalyDetected({
      anomalyId: anomaly.id, gymId: gym.id, gymName: gym.name,
      anomalyType: type, severity, message,
    });
  } else if (shouldResolve && open) {
    const resolved = await anomalyRepository.resolveAnomaly(open.id);
    if (resolved) {
      broadcastAnomalyResolved({ anomalyId: resolved.id, gymId: resolved.gym_id, resolvedAt: resolved.resolved_at });
    }
  }
}

function start() {
  if (intervalHandle) return;
  intervalHandle = setInterval(tick, config.anomalyIntervalMs);
}

function stop() {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
}

module.exports = { start, stop, tick }; // tick exported so tests can invoke one pass on demand
