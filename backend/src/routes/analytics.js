const express = require('express');
const statsService = require('../services/statsService');

const router = express.Router();

router.get('/cross-gym', async (req, res, next) => {
  try {
    res.json(await statsService.getCrossGymRevenue());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
