/**
 * Thin facade the simulator route calls. Owns the "reset to baseline"
 * logic via an in-memory epoch timestamp -- see STEP2_IMPLEMENTATION_PLAN.md
 * Resolved Design Decision #9 for the full reasoning.
 */

const simulatorJob = require('../jobs/simulator');
const { query } = require('../db/pool');

let simulatorEpoch = new Date();

/** @param {1|5|10} speed */
function start(speed) {
  if (!simulatorJob.isRunning()) simulatorEpoch = new Date();
  simulatorJob.start(speed);
  return { status: 'running', speed };
}

function stop() {
  simulatorJob.stop();
  return { status: 'paused' };
}

async function reset() {
  simulatorJob.stop();
  const epoch = simulatorEpoch;

  // Remove everything the simulator added since the epoch.
  await query('DELETE FROM checkins WHERE checked_in >= $1', [epoch]);
  await query('DELETE FROM payments WHERE paid_at >= $1', [epoch]);
  // Restore any pre-existing (seed-time) open session the simulator closed
  // during its run. No extra IS NOT NULL guard needed: SQL's three-valued
  // logic means `checked_out >= epoch` is NULL (excluded by WHERE) for
  // genuinely-still-open rows.
  await query('UPDATE checkins SET checked_out = NULL WHERE checked_in < $1 AND checked_out >= $1', [epoch]);

  // Recompute last_checkin_at after the rollback -- reuses 004_seed.sql's
  // own Phase 5 pattern. The epoch rollback deletes checkins rows out from
  // under this column, so it goes stale otherwise.
  await query(
    `UPDATE members m SET last_checkin_at = c.max_checked_in
     FROM (SELECT member_id, MAX(checked_in) AS max_checked_in FROM checkins GROUP BY member_id) c
     WHERE c.member_id = m.id`
  );
  await query(
    `UPDATE members m SET last_checkin_at = NULL
     WHERE NOT EXISTS (SELECT 1 FROM checkins c WHERE c.member_id = m.id)`
  );

  simulatorEpoch = new Date();
  return { status: 'reset' };
}

function getStatus() {
  return { running: simulatorJob.isRunning(), speed: simulatorJob.currentSpeed() };
}

module.exports = { start, stop, reset, getStatus };
