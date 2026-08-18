const express = require('express');
const router = express.Router();

const stripeRoutes = require('./stripe');
const tokenRoutes = require('./tokens');
const walletRoutes = require('./wallets');
const marketRoutes = require('./market');
const complianceRoutes = require('./compliance');
const treasuryRoutes = require('./treasury');
const authRoutes = require('./auth');
const askRoutes = require('./ask');
const bondingCurve = require('../services/bondingCurve');

router.use('/auth', authRoutes);
router.use('/stripe', stripeRoutes);
router.use('/tokens', tokenRoutes);
router.use('/wallets', walletRoutes);
router.use('/market', marketRoutes);
router.use('/compliance', complianceRoutes);
router.use('/treasury', treasuryRoutes);
router.use('/ask', askRoutes);

router.get('/pulse', (req, res) => {
  const { lane = 'all', limit = 20 } = req.query;
  const feed = bondingCurve.getPulseFeed(lane, parseInt(limit) || 20);
  res.json({ success: true, count: feed.length, lane, feed });
});

router.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

module.exports = router;
