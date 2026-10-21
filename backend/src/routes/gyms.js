const express = require('express');

const router = express.Router();

// TODO: return id, name, city, capacity, current_occupancy, today_revenue, status for every gym.
router.get('/', (req, res) => {
  res.status(501).json({ error: 'Not implemented', endpoint: 'GET /gyms' });
});

// TODO: return occupancy, today's revenue, recent events and active anomalies
// for one gym in a single response, in under 5ms.
router.get('/:id/live', (req, res) => {
  res.status(501).json({ error: 'Not implemented', endpoint: 'GET /gyms/:id/live' });
});

// TODO: accept ?dateRange=7d|30d|90d and return heatmap, revenue by plan,
// churn risk and new/renewal ratio for one gym.
router.get('/:id/analytics', (req, res) => {
  res.status(501).json({ error: 'Not implemented', endpoint: 'GET /gyms/:id/analytics' });
});

module.exports = router;
