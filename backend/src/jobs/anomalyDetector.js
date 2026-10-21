const config = require('../config');

let intervalHandle = null;

// TODO: query live stats, run anomalyService evaluators, and broadcast
// ANOMALY_DETECTED / ANOMALY_RESOLVED events over the WebSocket.
function tick() {
  console.debug('[anomalyDetector] tick (not implemented)');
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

module.exports = { start, stop };
