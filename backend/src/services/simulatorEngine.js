const { query } = require('../db/pool');
const { trafficMultiplier } = require('../shared/trafficPatterns');
const broadcast = require('../websocket/broadcast');

// Approximations -- the seed script's per-gym hourly_rate only existed in a
// TEMP TABLE dropped after seeding, so it's not available at runtime. Tune
// these if the live simulator feels too sparse/busy.
const CHECKIN_RATE_FACTOR = 0.25;  // expected checkins/hour per unit capacity at multiplier 1.0
const PAYMENT_RATE_FACTOR = 0.01;  // payments ~25x rarer than checkins
const SESSION_MIN_MINUTES = 45;
const SESSION_MAX_MINUTES = 90;

// The 1x baseline tick interval (matches the scaffold's `2000 / speed`).
// Checkin/payment firing probability is computed against this FIXED
// window, not the actual (speed-shrunk) scheduled interval -- using the
// real interval would exactly cancel out speed's effect (more, smaller
// ticks at the same per-tick probability nets to the same real-world
// event rate regardless of speed), silently defeating the speed selector.
// Pinning the probability to this fixed reference window means ticking
// `speed` times more often at the SAME per-tick probability correctly
// multiplies real-world throughput by `speed`.
const BASE_TICK_MS = 2000;

// Poisson "at least one arrival this tick" within a fixed reference
// window, not a naive flat per-tick probability (which breaks down above
// 1.0 at high traffic multiplier).
function poissonFireProbability(expectedPerHour, referenceWindowMs = BASE_TICK_MS) {
  const expectedPerWindow = expectedPerHour * (referenceWindowMs / 3_600_000);
  return 1 - Math.exp(-expectedPerWindow);
}

// Pure, exported, unit-testable with a mock randomFn. Rebased per
// ticks-remaining (not elapsed minutes) so higher `speed` (more ticks per
// real minute) doesn't close sessions out unrealistically fast.
function dueForCheckout(elapsedMinutes, tickIntervalMs, randomFn = Math.random) {
  if (elapsedMinutes < SESSION_MIN_MINUTES) return false;
  if (elapsedMinutes >= SESSION_MAX_MINUTES) return true;
  const remainingMs = (SESSION_MAX_MINUTES - elapsedMinutes) * 60000;
  const ticksRemaining = Math.max(1, remainingMs / tickIntervalMs);
  return randomFn() < 1 / ticksRemaining;
}

async function getCurrentOccupancy(gymId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM checkins WHERE gym_id = $1 AND checked_out IS NULL`,
    [gymId]
  );
  return rows[0].n;
}

async function tickGym(gym, now, tickIntervalMs) {
  // Disjoint candidate sets by construction (see maybeCheckin's NOT EXISTS
  // guard) -- safe to run concurrently.
  await Promise.all([
    maybeCheckin(gym, now),
    maybeCheckout(gym, now, tickIntervalMs),
    maybePayment(gym, now),
  ]);
}

async function maybeCheckin(gym, now) {
  const multiplier = trafficMultiplier(now);
  if (multiplier <= 0) return;
  const expectedPerHour = gym.capacity * CHECKIN_RATE_FACTOR * multiplier;
  // Fixed BASE_TICK_MS reference window -- see comment above. This is what
  // makes aggregate throughput actually scale with `speed`: tickGym is
  // called more often at higher speed (shorter real interval between
  // calls), but each call's fire probability here stays pinned to the same
  // fixed window, so more calls per real second correctly means more
  // events per real second.
  if (Math.random() >= poissonFireProbability(expectedPerHour)) return;

  // NOT EXISTS guard: never check in a member who already has ANY open
  // session -- load-bearing for the simulator reset-epoch mechanism (so
  // "pre-existing open" and "simulator-added open" never collide on the
  // same member), not just realism.
  const { rows } = await query(
    `SELECT id, name FROM members m
     WHERE m.gym_id = $1 AND m.status = 'active'
       AND NOT EXISTS (SELECT 1 FROM checkins c WHERE c.member_id = m.id AND c.checked_out IS NULL)
     ORDER BY random() LIMIT 1`,
    [gym.id]
  );
  const member = rows[0];
  if (!member) return; // everyone already checked in -- extremely unlikely, just skip this tick

  await query(`INSERT INTO checkins (member_id, gym_id, checked_in) VALUES ($1, $2, $3)`, [
    member.id, gym.id, now,
  ]);
  await query(`UPDATE members SET last_checkin_at = $1 WHERE id = $2`, [now, member.id]);

  const occupancy = await getCurrentOccupancy(gym.id);
  broadcast.broadcastCheckin({
    gymId: gym.id, memberName: member.name, timestamp: now,
    currentOccupancy: occupancy, capacity: gym.capacity,
  });
}

async function maybeCheckout(gym, now, tickIntervalMs) {
  const { rows } = await query(
    `SELECT c.id, c.checked_in, m.name
     FROM checkins c JOIN members m ON m.id = c.member_id
     WHERE c.gym_id = $1 AND c.checked_out IS NULL
       AND c.checked_in <= $2::timestamptz - INTERVAL '45 minutes'`,
    [gym.id, now]
  );
  for (const session of rows) {
    const elapsedMinutes = (now.getTime() - session.checked_in.getTime()) / 60000;
    if (!dueForCheckout(elapsedMinutes, tickIntervalMs)) continue;
    await query(`UPDATE checkins SET checked_out = $1 WHERE id = $2`, [now, session.id]);
    const occupancy = await getCurrentOccupancy(gym.id);
    broadcast.broadcastCheckout({
      gymId: gym.id, memberName: session.name, timestamp: now,
      currentOccupancy: occupancy, capacity: gym.capacity,
    });
  }
}

async function maybePayment(gym, now) {
  const multiplier = trafficMultiplier(now);
  if (multiplier <= 0) return;
  const expectedPerHour = gym.capacity * PAYMENT_RATE_FACTOR * multiplier;
  if (Math.random() >= poissonFireProbability(expectedPerHour)) return;

  const { rows } = await query(
    `SELECT id, name, plan_type FROM members WHERE gym_id = $1 AND status = 'active' ORDER BY random() LIMIT 1`,
    [gym.id]
  );
  const member = rows[0];
  if (!member) return;
  const amount = { monthly: 1499, quarterly: 3999, annual: 11999 }[member.plan_type];

  // Always payment_type='renewal' -- the simulator only reuses existing
  // members (never creates new ones), so a 'new' signup payment wouldn't
  // correspond to an actual new member row.
  await query(
    `INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at)
     VALUES ($1, $2, $3, $4, 'renewal', $5)`,
    [member.id, gym.id, amount, member.plan_type, now]
  );

  const { rows: totalRows } = await query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE`,
    [gym.id]
  );
  broadcast.broadcastPayment({
    gymId: gym.id, amount, planType: member.plan_type, memberName: member.name,
    todayTotal: Number(totalRows[0].total),
  });
}

module.exports = {
  tickGym, dueForCheckout, poissonFireProbability,
  CHECKIN_RATE_FACTOR, PAYMENT_RATE_FACTOR, SESSION_MIN_MINUTES, SESSION_MAX_MINUTES, BASE_TICK_MS,
};
