const express = require('express');

const router = express.Router();

// TODO: return 30-day revenue for all gyms, sorted descending, with rank, in under 2ms.
router.get('/cross-gym', (req, res) => {
  res.status(501).json({ error: 'Not implemented', endpoint: 'GET /analytics/cross-gym' });
});

module.exports = router;
