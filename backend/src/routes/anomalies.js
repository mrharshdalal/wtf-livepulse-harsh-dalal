const express = require('express');
const { isUuid, oneOf } = require('../middleware/validate');
const anomalyRepository = require('../services/anomalyRepository');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const gymId = req.query.gym_id || null; // never pass `undefined` to pg -- throws a bind error
    const severity = req.query.severity || null;
    if (gymId && !isUuid(gymId)) return res.status(400).json({ error: 'Invalid gym_id' });
    if (severity && !oneOf(severity, ['warning', 'critical'])) {
      return res.status(400).json({ error: "severity must be 'warning' or 'critical'" });
    }
    res.json(await anomalyRepository.listAnomalies({ gymId, severity }));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/dismiss', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'Invalid anomaly id' });

    const anomaly = await anomalyRepository.getAnomalyById(id);
    if (!anomaly) return res.status(404).json({ error: 'Anomaly not found' });
    if (anomaly.severity === 'critical') {
      return res.status(403).json({ error: 'Critical anomalies cannot be dismissed' });
    }
    res.json(await anomalyRepository.dismissAnomaly(id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
