/**
 * Calabi Master API Router
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

router.use('/auth', authRoutes);
router.use('/stripe', stripeRoutes);
router.use('/tokens', tokenRoutes);
router.use('/wallets', walletRoutes);
router.use('/market', marketRoutes);
router.use('/compliance', complianceRoutes);
router.use('/treasury', treasuryRoutes);


// Health & System Info
router.get('/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    exchange: 'Calabi.us Sovereign Engine',
    version: '1.0.0-PRO',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    chainsSupported: ['Ethereum', 'Base L2', 'Solana', 'Bitcoin'],
    regulatoryModel: 'Non-Custodial Hybrid Gateway (FinCEN FIN-2019-G001 Compliant)',
    features: [
      'BIP-39 Sovereign Wallet Minting',
      'Calabi Ignition Fair-Launch Bonding Curve',
      'Stripe Crypto Onramp & Pro SaaS Subscriptions',
      'Live Coinbase Public WebSocket Price Feeds',
      'Automated OFAC SDN Sanctions Screening'
    ]
  });
});

module.exports = router;
