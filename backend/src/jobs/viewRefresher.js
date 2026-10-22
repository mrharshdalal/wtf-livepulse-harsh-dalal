const config = require('../config');
const { query } = require('../db/pool');

let intervalHandle = null;
let refreshing = false; // reentrancy guard -- skip overlapping refreshes

async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    // CONCURRENTLY avoids blocking reads from statsService.getHeatmap()
    // while the view rebuilds -- safe because gym_hourly_stats_uidx
    // (003_views.sql) gives it the required unique index.
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY gym_hourly_stats');
  } catch (err) {
    console.error('[viewRefresher] refresh failed:', err);
  } finally {
    refreshing = false;
  }
}

function start() {
  if (intervalHandle) return;
  intervalHandle = setInterval(refresh, config.viewRefreshIntervalMs);
}

function stop() {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
}

module.exports = { start, stop, refresh };
