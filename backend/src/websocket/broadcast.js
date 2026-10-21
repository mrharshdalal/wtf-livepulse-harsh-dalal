const { getClients } = require('./index');

/**
 * Event payload shapes (TODO: implement producers for each):
 *
 * CHECKIN_EVENT / CHECKOUT_EVENT:
 *   { gym_id, member_name, timestamp, current_occupancy, capacity_pct }
 *
 * PAYMENT_EVENT:
 *   { gym_id, amount, plan_type, member_name, today_total }
 *
 * ANOMALY_DETECTED:
 *   { anomaly_id, gym_id, gym_name, anomaly_type, severity, message }
 *
 * ANOMALY_RESOLVED:
 *   { anomaly_id, gym_id, resolved_at }
 */
const EVENT_TYPES = {
  CHECKIN_EVENT: 'CHECKIN_EVENT',
  CHECKOUT_EVENT: 'CHECKOUT_EVENT',
  PAYMENT_EVENT: 'PAYMENT_EVENT',
  ANOMALY_DETECTED: 'ANOMALY_DETECTED',
  ANOMALY_RESOLVED: 'ANOMALY_RESOLVED',
};

function broadcast(event) {
  const payload = JSON.stringify(event);
  for (const client of getClients()) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

module.exports = { broadcast, EVENT_TYPES };
