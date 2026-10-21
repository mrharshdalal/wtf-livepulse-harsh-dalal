const express = require('express');

const router = express.Router();

// TODO: accept optional gym_id and severity filters; return unresolved
// anomalies, newest first.
router.get('/', (req, res) => {
  res.status(501).json({ error: 'Not implemented', endpoint: 'GET /anomalies' });
});

// TODO: set dismissed=true; return 403 if severity is critical.
router.patch('/:id/dismiss', (req, res) => {
  res.status(501).json({ error: 'Not implemented', endpoint: 'PATCH /anomalies/:id/dismiss' });
});

module.exports = router;
