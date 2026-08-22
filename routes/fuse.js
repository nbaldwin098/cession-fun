const express = require('express');
const router = express.Router();
const fuse = require('../services/fuse');

router.get('/', (req, res) => {
  res.json({ success: true, fuse: fuse.overview() });
});

router.get('/:symbol', (req, res) => {
  const row = fuse.get(req.params.symbol);
  if (!row) return res.status(404).json({ success: false, error: 'Not a Fuse coin.' });
  res.json({ success: true, coin: row });
});

router.post('/:symbol/tick', (req, res) => {
  try {
    const result = fuse.agentTick(req.params.symbol);
    if (!result) return res.status(400).json({ success: false, error: 'Agent not live or coin inactive.' });
    res.json({ success: true, tick: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || 'tick failed' });
  }
});

router.post('/agent/live', (req, res) => {
  const live = Boolean(req.body && req.body.live);
  res.json({ success: true, fuse: fuse.setAgentLive(live) });
});

module.exports = router;
