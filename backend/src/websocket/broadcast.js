const { getClients } = require('./index');

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

function capacityPct(occupancy, capacity) {
  return Math.round((occupancy / capacity) * 1000) / 10; // one decimal place
}

function broadcastCheckin({ gymId, memberName, timestamp, currentOccupancy, capacity }) {
  broadcast({
    type: EVENT_TYPES.CHECKIN_EVENT, gym_id: gymId, member_name: memberName,
    timestamp: timestamp.toISOString(), current_occupancy: currentOccupancy,
    capacity_pct: capacityPct(currentOccupancy, capacity),
  });
}

function broadcastCheckout({ gymId, memberName, timestamp, currentOccupancy, capacity }) {
  broadcast({
    type: EVENT_TYPES.CHECKOUT_EVENT, gym_id: gymId, member_name: memberName,
    timestamp: timestamp.toISOString(), current_occupancy: currentOccupancy,
    capacity_pct: capacityPct(currentOccupancy, capacity),
  });
}

function broadcastPayment({ gymId, amount, planType, memberName, todayTotal }) {
  broadcast({
    type: EVENT_TYPES.PAYMENT_EVENT, gym_id: gymId, amount, plan_type: planType,
    member_name: memberName, today_total: todayTotal,
  });
}

function broadcastAnomalyDetected({ anomalyId, gymId, gymName, anomalyType, severity, message }) {
  broadcast({
    type: EVENT_TYPES.ANOMALY_DETECTED, anomaly_id: anomalyId, gym_id: gymId,
    gym_name: gymName, anomaly_type: anomalyType, severity, message,
  });
}

function broadcastAnomalyResolved({ anomalyId, gymId, resolvedAt }) {
  broadcast({
    type: EVENT_TYPES.ANOMALY_RESOLVED, anomaly_id: anomalyId, gym_id: gymId,
    resolved_at: resolvedAt.toISOString(),
  });
}

module.exports = {
  broadcast, EVENT_TYPES, broadcastCheckin, broadcastCheckout,
  broadcastPayment, broadcastAnomalyDetected, broadcastAnomalyResolved,
};
