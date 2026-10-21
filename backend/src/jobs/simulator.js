let intervalHandle = null;

// TODO: generate synthetic check-ins/check-outs/payments and broadcast them
// over the WebSocket to drive the live dashboard.
function tick() {
  console.debug('[simulator] tick (not implemented)');
}

/** @param {1|5|10} speed */
function start(speed = 1) {
  if (intervalHandle) return;
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

module.exports = { start, stop, isRunning };
