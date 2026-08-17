/**
 * Cession Multi-Chain Wallet API Routes
 */

const express = require('express');
const router = express.Router();
const walletEngine = require('../services/walletEngine');

/**
 * Mint / Generate a new Sovereign Multi-Chain HD Wallet
 */
router.post('/generate', (req, res) => {
  try {
    const mnemonic = walletEngine.generateMnemonic();
    const vault = walletEngine.deriveMultiChainVault(mnemonic);
    res.json({ success: true, vault });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Derive addresses from an existing mnemonic seed
 */
router.post('/derive', (req, res) => {
  try {
    const { mnemonic } = req.body;
    if (!mnemonic) {
      return res.status(400).json({ success: false, error: "Mnemonic seed is required." });
    }
    const vault = walletEngine.deriveMultiChainVault(mnemonic);
    res.json({ success: true, vault });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Get unified multi-chain portfolio balances
 */
router.get('/portfolio/:address', (req, res) => {
  try {
    const portfolio = walletEngine.getPortfolioBalances(req.params.address);
    res.json({ success: true, address: req.params.address, portfolio });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Deposit / Faucet test funds to wallet
 */
router.post('/deposit', (req, res) => {
  try {
    const { address, asset, amount } = req.body;
    if (!address) {
      return res.status(400).json({ success: false, error: "Wallet address is required." });
    }
    const depositAmount = parseFloat(amount) || 1.0;
    const depositAsset = (asset || 'SOL').toUpperCase();

    const updatedBalances = walletEngine.deposit(address, depositAsset, depositAmount);
    const portfolio = walletEngine.getPortfolioBalances(address);

    res.json({
      success: true,
      message: `Successfully deposited ${depositAmount} ${depositAsset} to ${address}`,
      address,
      balances: updatedBalances,
      portfolio
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
