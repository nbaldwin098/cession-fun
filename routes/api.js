/**
 * Cession Master API Router
 */

const express = require('express');
const router = express.Router();

const stripeRoutes = require('./stripe');
const tokenRoutes = require('./tokens');
const walletRoutes = require('./wallets');
const marketRoutes = require('./market');
const complianceRoutes = require('./compliance');
const treasuryRoutes = require('./treasury');
const authRoutes = require('./auth');

const bondingCurve = require('../services/bondingCurve');

router.use('/auth', authRoutes);
router.use('/stripe', stripeRoutes);
router.use('/tokens', tokenRoutes);
router.use('/wallets', walletRoutes);
router.use('/market', marketRoutes);
router.use('/compliance', complianceRoutes);
router.use('/treasury', treasuryRoutes);

// Cession Pulse Endpoint (Direct /api/pulse route)
router.get('/pulse', (req, res) => {
  const { lane = 'all', limit = 20 } = req.query;
  const feed = bondingCurve.getPulseFeed(lane, parseInt(limit) || 20);
  res.json({ success: true, count: feed.length, lane, feed });
});

// Health & System Info
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

router.get('/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    exchange: 'Cession Sovereign Fair Launchpad',
    version: '1.0.0-PRO',
    programId: process.env.CESSION_PROGRAM_ID || 'Epxb6TRhGwT1gQFj5xCLM6KtZUz9ajD7jZzkVrp3qBR9',
    chainsSupported: ['Solana Mainnet', 'Ethereum Mainnet'],
    stripeOnramp: {
      enabled: false,
      notice: 'Direct crypto wallet purchases only. Cession is strictly non-custodial.'
    },
    treasuryWallets: {
      solana: process.env.TREASURY_SOL_ADDRESS || '8cdpVXsrQQDf84H4KC9pfqEKxUV9ZJjZZbeueWmJCCvH',
      ethereum: process.env.TREASURY_EVM_ADDRESS || '0xE409f28fb1D6C5C090b1feE164DB09C365c07011'
    },
    feeModel: {
      creationFee: '0.05 SOL to Protocol Treasury',
      tradeFee: '1.00% Total (0.30% Creator, 0.25% Holder Rewards, 0.15% Referrer, 0.30% Treasury)',
      burnOnBuy: '0.10% Token Supply Burned on Buy',
      claimPolicy: 'Claims strictly pull accrued fee SOL from fee_vault PDA. Curve liquidity in sol_vault cannot be drained.'
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
