const express = require('express');

const router = express.Router();

// TODO: accept body { speed: 1|5|10 }; start the simulator job; return { status: 'running', speed }.
router.post('/start', (req, res) => {
  res.status(501).json({ error: 'Not implemented', endpoint: 'POST /simulator/start' });
});

// TODO: stop the simulator job; return { status: 'paused' }.
router.post('/stop', (req, res) => {
  res.status(501).json({ error: 'Not implemented', endpoint: 'POST /simulator/stop' });
});

// TODO: reset simulator state; return { status: 'reset' }.
router.post('/reset', (req, res) => {
  res.status(501).json({ error: 'Not implemented', endpoint: 'POST /simulator/reset' });
});

module.exports = router;
