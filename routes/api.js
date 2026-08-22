const express = require('express');
const router = express.Router();

const tokenRoutes = require('./tokens');
const walletRoutes = require('./wallets');
const marketRoutes = require('./market');
const complianceRoutes = require('./compliance');
const treasuryRoutes = require('./treasury');
const authRoutes = require('./auth');
const askRoutes = require('./ask');
const pulseRoutes = require('./pulse');
const support = require('./support');
const accessRoutes = require('./access');
const safetyRoutes = require('./safety');
const fuseRoutes = require('./fuse');
const baasRoutes = require('./baas');
const caasRoutes = require('./caas');
const pulseSignals = require('../services/pulseSignals');
const bondingCurve = require('../services/bondingCurve');

router.use('/auth', authRoutes);
router.use('/tokens', tokenRoutes);
router.use('/wallets', walletRoutes);
router.use('/market', marketRoutes);
router.use('/compliance', complianceRoutes);
router.use('/treasury', treasuryRoutes);
router.use('/ask', askRoutes);
router.use('/pulse', pulseRoutes);
router.use('/support', support.router);
router.use('/access', accessRoutes);
router.use('/pay', safetyRoutes);
router.use('/fuse', fuseRoutes);
router.use('/baas', baasRoutes);
router.use('/caas', caasRoutes);

router.get('/desk/overview', support.deskAuth, (req, res) => {
  support.audit({ action: 'overview' });
  let feed = [];
  try { feed = pulseSignals.attach(bondingCurve.getPulseFeed('all', 50)); } catch (e) { feed = []; }
  res.json({
    success: true,
    note: 'Read only. No keys. No withdrawals.',
    coins: feed.length,
    ticketsOpen: (support.load(support.FILE, []) || []).filter((t) => t.status === 'open').length
  });
});

router.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

module.exports = router;
