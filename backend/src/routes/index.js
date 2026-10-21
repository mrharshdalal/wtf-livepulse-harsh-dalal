const express = require('express');
const { query } = require('../db/pool');

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'up', time: new Date().toISOString() });
  } catch (err) {
    res.json({ status: 'ok', db: 'down', time: new Date().toISOString() });
  }
});

router.use('/gyms', require('./gyms'));
router.use('/members', require('./members'));
router.use('/analytics', require('./analytics'));
router.use('/anomalies', require('./anomalies'));
router.use('/simulator', require('./simulator'));

module.exports = router;
