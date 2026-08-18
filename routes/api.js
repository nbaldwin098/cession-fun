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
const pulseRoutes = require('./pulse');

router.use('/auth', authRoutes);
router.use('/stripe', stripeRoutes);
router.use('/tokens', tokenRoutes);
router.use('/wallets', walletRoutes);
router.use('/market', marketRoutes);
router.use('/compliance', complianceRoutes);
router.use('/treasury', treasuryRoutes);
router.use('/ask', askRoutes);
router.use('/pulse', pulseRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

module.exports = router;
