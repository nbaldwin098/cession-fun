const express = require('express');
const router = express.Router();
const pulse = require('../services/pulseSignals');
const learn = require('../services/cessionLearn');
const bondingCurve = require('../services/bondingCurve');

router.get('/', (req, res) => {
  const { lane = 'all', limit = 20, user } = req.query;
  let feed = pulse.attach(bondingCurve.getPulseFeed(lane, parseInt(limit) || 20));
  const who = String(user || req.query.viewer || '').slice(0, 64);
  if (who) feed = learn.mix(who, feed);
  res.json({ success: true, count: feed.length, lane, personalized: !!who, feed });
});

router.post('/event', (req, res) => {
  const symbol = String(req.body.symbol || '').toUpperCase();
  const type = String(req.body.type || '');
  if (!symbol || !type) return res.status(400).json({ success: false, error: 'symbol and type required' });
  const event = {
    symbol,
    type,
    ms: req.body.ms,
    address: req.body.address,
    viewer: req.body.viewer,
    name: req.body.name || ''
  };
  const stats = pulse.record(event);
  const who = String(req.body.address || req.body.viewer || '').slice(0, 64);
  if (who) learn.update(who, event, { symbol: symbol, name: req.body.name || '' });
  res.json({ success: true, stats });
});

router.get('/stats/:symbol', (req, res) => {
  res.json({ success: true, stats: pulse.statsFor(req.params.symbol) });
});

module.exports = router;
