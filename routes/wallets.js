/**
 * Cession Non-Custodial Wallet API Router
 * Deprecates server-side seed generation and deposit faucets.
 * Cession is 100% non-custodial: users bring their own Web3 wallets (Phantom/MetaMask).
 */

const express = require('express');
const router = express.Router();
const walletEngine = require('../services/walletEngine');

/**
 * Screen a wallet address for OFAC compliance
 */
router.get('/screen/:address', (req, res) => {
  try {
    const screen = walletEngine.screenWallet(req.params.address);
    res.json({ success: true, address: req.params.address, allowed: screen.allowed, detail: screen.detail });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Deprecated Server-Side Key Generation & Deposit Endpoints
 */
router.all(['/generate', '/derive', '/deposit'], (req, res) => {
  res.status(410).json({
    success: false,
    error: 'Non-custodial directive: Cession never creates, stores, or funds wallets on the server. Connect directly with your Phantom or MetaMask wallet.'
  });
});

module.exports = router;
