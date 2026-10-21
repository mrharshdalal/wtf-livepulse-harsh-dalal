const express = require('express');
const statsService = require('../services/statsService');

const router = express.Router();

// GET /api/events/recent?limit=20 -- cross-gym activity feed (assignment M-05).
router.get('/recent', async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    res.json(await statsService.getRecentEventsAllGyms(limit));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
