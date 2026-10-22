const http = require('http');

const config = require('./config');
const app = require('./app');
const { pool, waitForDb, query } = require('./db/pool');
const { initWebSocket, closeWebSocket } = require('./websocket');
const anomalyDetector = require('./jobs/anomalyDetector');
const simulator = require('./jobs/simulator');
const viewRefresher = require('./jobs/viewRefresher');

async function main() {
  console.log('[server] waiting for database...');
  await waitForDb({ retries: 30, delayMs: 2000 });
  console.log('[server] database is reachable');

  // TODO: once seeding is implemented, this should be a hard requirement,
  // not just a warning.
  try {
    const result = await query('SELECT COUNT(*) FROM gyms');
    if (parseInt(result.rows[0].count, 10) === 0) {
      console.warn('[server] warning: gyms table is empty — seed data has not run yet');
    }
  } catch (err) {
    console.warn('[server] warning: could not check seed state:', err.message);
  }

  const server = http.createServer(app);
  initWebSocket(server);

  anomalyDetector.start();
  viewRefresher.start();
  if (config.simulatorAutostart) {
    simulator.start(1);
  }

  server.listen(config.port, () => {
    console.log(`[server] WTF LivePulse backend listening on port ${config.port}`);
  });

  async function shutdown(signal) {
    console.log(`[server] received ${signal}, shutting down...`);
    anomalyDetector.stop();
    viewRefresher.stop();
    simulator.stop();
    closeWebSocket();
    server.close(async () => {
      await pool.end();
      console.log('[server] shutdown complete');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[server] fatal startup error:', err);
  process.exit(1);
});
