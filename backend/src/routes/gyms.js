const express = require('express');
const { isUuid, oneOf } = require('../middleware/validate');
const statsService = require('../services/statsService');
const anomalyRepository = require('../services/anomalyRepository');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    res.json(await statsService.getGymsList());
  } catch (err) {
    next(err);
  }
});

router.get('/:id/live', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'Invalid gym id' });

    const [occupancy, revenue, recentEvents, activeAnomalies, gym] = await Promise.all([
      statsService.getLiveOccupancy(id),
      statsService.getTodayRevenue(id),
      statsService.getRecentEvents(id, 20),
      anomalyRepository.listActiveForGym(id),
      statsService.getGymBasic(id),
    ]);
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    res.json({
      gym_id: gym.id,
      gym_name: gym.name,
      capacity: gym.capacity,
      status: gym.status,
      current_occupancy: occupancy,
      today_revenue: revenue,
      capacity_pct: Math.round((occupancy / gym.capacity) * 1000) / 10,
      recent_events: recentEvents,
      active_anomalies: activeAnomalies,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/analytics', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'Invalid gym id' });

    const rangeParam = req.query.dateRange || '30d';
    if (!oneOf(rangeParam, ['7d', '30d', '90d'])) {
      return res.status(400).json({ error: "dateRange must be one of '7d','30d','90d'" });
    }
    if (!(await statsService.gymExists(id))) return res.status(404).json({ error: 'Gym not found' });
    const days = statsService.RANGE_DAYS[rangeParam];

    const [heatmap, revenueByPlan, churnRisk, newVsRenewal] = await Promise.all([
      statsService.getHeatmap(id),               // always last 7 days
      statsService.getRevenueByPlan(id, days),    // respects dateRange, default 30d
      statsService.getChurnRisk(id),              // fixed 45+/60+ day lookback
      statsService.getNewVsRenewalRatio(id, days),
    ]);

    res.json({
      gym_id: id,
      date_range: rangeParam,
      heatmap,
      revenue_by_plan: revenueByPlan,
      churn_risk: churnRisk,
      new_vs_renewal: newVsRenewal,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
