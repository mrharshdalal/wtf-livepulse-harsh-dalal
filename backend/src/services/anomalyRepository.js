const { query } = require('../db/pool');

async function listAnomalies({ gymId = null, severity = null } = {}) {
  const { rows } = await query(
    `SELECT id, gym_id, type, severity, message, resolved, dismissed, detected_at, resolved_at
     FROM anomalies
     WHERE (resolved = FALSE OR resolved_at >= NOW() - INTERVAL '24 hours')
       AND ($1::uuid IS NULL OR gym_id = $1)
       AND ($2::text IS NULL OR severity = $2)
     ORDER BY detected_at DESC`,
    [gymId, severity]
  );
  return rows;
}

async function listActiveForGym(gymId) {
  // Exact match on idx_anomalies_active (gym_id, detected_at DESC) WHERE resolved=FALSE.
  const { rows } = await query(
    `SELECT id, type, severity, message, detected_at FROM anomalies
     WHERE gym_id = $1 AND resolved = FALSE ORDER BY detected_at DESC`,
    [gymId]
  );
  return rows;
}

async function getAnomalyById(id) {
  const { rows } = await query(
    `SELECT id, gym_id, type, severity, message, resolved, dismissed, detected_at, resolved_at
     FROM anomalies WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function dismissAnomaly(id) {
  // Unconditional UPDATE -- the 403-for-critical rule is NOT baked in here.
  // The route calls getAnomalyById() first to distinguish 404 (not found)
  // from 403 (exists but critical); this is only called once that's passed.
  const { rows } = await query(
    `UPDATE anomalies SET dismissed = TRUE WHERE id = $1
     RETURNING id, gym_id, type, severity, message, resolved, dismissed, detected_at, resolved_at`,
    [id]
  );
  return rows[0] || null;
}

async function findOpenAnomaly(gymId, type) {
  const { rows } = await query(
    `SELECT id FROM anomalies WHERE gym_id = $1 AND type = $2 AND resolved = FALSE LIMIT 1`,
    [gymId, type]
  );
  return rows[0] || null;
}

async function insertAnomaly({ gymId, type, severity, message }) {
  const { rows } = await query(
    `INSERT INTO anomalies (gym_id, type, severity, message) VALUES ($1, $2, $3, $4)
     RETURNING id, gym_id, type, severity, message, detected_at`,
    [gymId, type, severity, message]
  );
  return rows[0];
}

async function resolveAnomaly(id) {
  const { rows } = await query(
    `UPDATE anomalies SET resolved = TRUE, resolved_at = NOW() WHERE id = $1 AND resolved = FALSE
     RETURNING id, gym_id, type, resolved_at`,
    [id]
  );
  return rows[0] || null;
}

async function archiveOldResolved() {
  // Optional housekeeping only -- the actual "visible 24h then archived"
  // behavior is the query-time filter in listAnomalies above.
  const { rowCount } = await query(
    `DELETE FROM anomalies WHERE resolved = TRUE AND resolved_at < NOW() - INTERVAL '24 hours'`
  );
  return rowCount;
}

module.exports = {
  listAnomalies, listActiveForGym, getAnomalyById, dismissAnomaly,
  findOpenAnomaly, insertAnomaly, resolveAnomaly, archiveOldResolved,
};
