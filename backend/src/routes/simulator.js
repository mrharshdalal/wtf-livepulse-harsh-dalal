const express = require('express');
const simulatorService = require('../services/simulatorService');

const router = express.Router();

router.post('/start', (req, res, next) => {
  try {
    const { speed } = req.body;
    if (![1, 5, 10].includes(speed)) {
      return res.status(400).json({ error: 'speed must be 1, 5, or 10' });
    }
    res.json(simulatorService.start(speed));
  } catch (err) {
    next(err);
  }
});

router.post('/stop', (req, res) => {
  res.json(simulatorService.stop());
});

router.post('/reset', async (req, res, next) => {
  try {
    res.json(await simulatorService.reset());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
