const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'Asia/Kolkata'");
});

function query(text, params) {
  return pool.query(text, params);
}

async function waitForDb({ retries = 10, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === retries) {
        throw new Error(`Database not reachable after ${retries} attempts: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = { pool, query, waitForDb };
