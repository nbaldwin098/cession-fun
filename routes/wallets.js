const express = require('express');
const router = express.Router();
const walletEngine = require('../services/walletEngine');
const ask = require('../services/askService');

router.get('/screen/:address', (req, res) => {
  try {
    const screen = walletEngine.screenWallet(req.params.address);
    res.json({ success: true, address: req.params.address, allowed: screen.allowed, detail: screen.detail });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:address/trades', (req, res) => {
  try {
    const bondingCurve = require('../services/bondingCurve');
    const walletTrades = bondingCurve.getWalletTransactions(req.params.address);
    res.json({ success: true, address: req.params.address, count: walletTrades.length, trades: walletTrades });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:address/transactions', (req, res) => {
  try {
    const bondingCurve = require('../services/bondingCurve');
    const txs = bondingCurve.getWalletTransactions(req.params.address);
    res.json({ success: true, address: req.params.address, count: txs.length, transactions: txs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:address/statement', (req, res) => {
  try {
    const bondingCurve = require('../services/bondingCurve');
    res.json(bondingCurve.getMonthlyStatement(req.params.address, req.query.month));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:address/profile', (req, res) => {
  try {
    const bondingCurve = require('../services/bondingCurve');
    const address = req.params.address;
    const txs = bondingCurve.getWalletTransactions(address) || [];
    const tokens = bondingCurve.getAllTokens('bump', 'all', 'all', false, null, true) || [];
    const created = tokens.filter((t) => String(t.creator || '').toLowerCase() === address.toLowerCase());
    const held = tokens.filter((t) => (t.holders || []).some((h) => String(h.address || h).toLowerCase() === address.toLowerCase()));
    res.json({
      success: true,
      address,
      created: created.map((t) => ({ symbol: t.symbol, name: t.name, mintAddress: t.mintAddress || t.mint })),
      held: held.map((t) => ({ symbol: t.symbol, name: t.name })),
      transactions: txs,
      statement: bondingCurve.getMonthlyStatement(address)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/follow', (req, res) => {
  try {
    const { follower, creator } = req.body;
    if (!follower || !creator) return res.status(400).json({ success: false, error: 'follower and creator required' });
    const list = ask.addFollow(follower, creator);
    res.json({ success: true, follows: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:address/following', (req, res) => {
  const list = ask.follows().follows.filter((f) => f.follower === req.params.address);
  res.json({ success: true, follows: list });
});

router.all(['/generate', '/derive', '/deposit'], (req, res) => {
  res.status(410).json({ success: false, error: 'Cession never creates wallets on the server.' });
});

module.exports = router;
