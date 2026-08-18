const express = require('express');
const router = express.Router();
const pulse = require('../services/pulseSignals');

router.post('/event', (req, res) => {
  const symbol = String(req.body.symbol || '').toUpperCase();
  const type = String(req.body.type || '');
  if (!symbol || !type) return res.status(400).json({ success: false, error: 'symbol and type required' });
  const stats = pulse.record({
    symbol,
    type,
    ms: req.body.ms,
    address: req.body.address,
    viewer: req.body.viewer
  });
  res.json({ success: true, stats });
});

router.get('/stats/:symbol', (req, res) => {
  res.json({ success: true, stats: pulse.statsFor(req.params.symbol) });
});

module.exports = router;
