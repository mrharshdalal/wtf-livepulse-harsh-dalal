const simulatorEngine = require('../services/simulatorEngine');
const { query } = require('../db/pool');

let intervalHandle = null;
let speed = 1;
let ticking = false;

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const { rows: gyms } = await query(
      `SELECT id, name, capacity, opens_at, closes_at FROM gyms WHERE status = 'active'`
    );
    const now = new Date();
    const tickIntervalMs = 2000 / speed;
    await Promise.all(gyms.map((gym) => simulatorEngine.tickGym(gym, now, tickIntervalMs)));
  } catch (err) {
    console.error('[simulator] tick failed:', err);
  } finally {
    ticking = false;
  }
}

/** @param {1|5|10} speed_ */
function start(speed_ = 1) {
  // Always re-arm at the new speed (rather than no-op if already running) --
  // a speed change while running must actually take effect for the UI's
  // speed selector to be meaningful.
  if (intervalHandle) clearInterval(intervalHandle);
  speed = speed_;
  intervalHandle = setInterval(tick, 2000 / speed);
}

function stop() {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
}

function isRunning() {
  return intervalHandle !== null;
}

function currentSpeed() {
  return speed;
}

module.exports = { start, stop, isRunning, currentSpeed };
