const port = parseInt(process.env.PORT, 10) || 3001;
const nodeEnv = process.env.NODE_ENV || 'development';
const simulatorAutostart = process.env.SIMULATOR_AUTOSTART === 'true';
const anomalyIntervalMs = parseInt(process.env.ANOMALY_INTERVAL_MS, 10) || 30000;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && nodeEnv !== 'test') {
  throw new Error(
    'DATABASE_URL is not set. Set it in the environment (see .env.example).'
  );
}

module.exports = {
  port,
  databaseUrl,
  nodeEnv,
  simulatorAutostart,
  anomalyIntervalMs,
};
