/**
 * Cession Stripe Status Router
 * 
 * STRICT CRYPTO-NATIVE DIRECTIVE:
 * Card -> credit fake coins is NOT this product.
 * Cession is 100% crypto-native: users bring their own SOL or ETH via Phantom or MetaMask.
 */

const express = require('express');
const router = express.Router();

router.get('/config', (req, res) => {
  res.json({
    enabled: false,
    message: 'Stripe card purchases are disabled. Cession is 100% crypto-native via non-custodial wallets.'
  });
});

router.all('*', (req, res) => {
  res.status(403).json({
    success: false,
    enabled: false,
    error: 'Fiat-to-crypto card processing is disabled. Please connect Phantom or MetaMask to trade with real SOL or ETH.'
  });
});

module.exports = router;
