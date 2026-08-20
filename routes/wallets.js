const express = require('express');
const router = express.Router();
const walletEngine = require('../services/walletEngine');
const ask = require('../services/askService');
const bonusCampaign = require('../services/bonusCampaign');

router.get('/screen/:address', (req, res) => {
  try {
    const screen = walletEngine.screenWallet(req.params.address);
    res.json({ success: true, address: req.params.address, allowed: screen.allowed, detail: screen.detail });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:address/pnl', (req, res) => {
  try {
    const bondingCurve = require('../services/bondingCurve');
    const range = String(req.query.range || '7d');
    const days = range === '1m' ? 30 : range === '6m' ? 180 : range === '1y' ? 365 : range === 'all' ? 365 : 7;
    const txs = bondingCurve.getWalletTransactions(req.params.address) || [];
    const points = [];
    let value = 0;
    for (let i = days; i >= 0; i--) {
      const t = Date.now() - i * 86400000;
      txs.forEach((tx) => {
        const when = Date.parse(tx.time || tx.createdAt || 0);
        if (when && when <= t && when > t - 86400000) value += Number(tx.pnl || tx.sol || 0);
      });
      points.push({ t, v: Number(value.toFixed(4)) });
    }
    res.json({ success: true, range, total: value, points });
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
    res.json({ success: true, follows: ask.addFollow(follower, creator) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:address/following', (req, res) => {
  const list = ask.follows().follows.filter((f) => f.follower === req.params.address);
  res.json({ success: true, follows: list });
});

router.get('/:address/rewards', (req, res) => {
  try {
    const bondingCurve = require('../services/bondingCurve');
    const rewards = bondingCurve.getRewardsSummary(req.params.address);
    const bonus = bonusCampaign.getStatus(req.params.address);
    const bonusPoints = bonus.claimed ? Number(bonus.points || 0) : 0;
    const pointsWithBonus = Number(rewards.points || 0) + bonusPoints;
    const tiers = [
      { name: 'Bronze', min: 0, feeDiscountPercent: 0 },
      { name: 'Silver', min: 500, feeDiscountPercent: 5 },
      { name: 'Gold', min: 2500, feeDiscountPercent: 10 },
      { name: 'Diamond', min: 10000, feeDiscountPercent: 20 }
    ];
    let tier = tiers[0];
    let nextTier = tiers[1];
    for (let i = 0; i < tiers.length; i++) {
      if (pointsWithBonus >= tiers[i].min) {
        tier = tiers[i];
        nextTier = tiers[i + 1] || null;
      }
    }
    res.json({
      success: true,
      rewards: {
        ...rewards,
        points: pointsWithBonus,
        bonusPoints,
        tier: tier.name,
        feeDiscountPercent: tier.feeDiscountPercent,
        nextTier: nextTier ? { name: nextTier.name, pointsNeeded: Math.max(0, nextTier.min - pointsWithBonus), feeDiscountPercent: nextTier.feeDiscountPercent } : null
      },
      campaign: bonus
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/:address/rewards-bonus', (req, res) => {
  try {
    const campaign = bonusCampaign.getStatus(req.params.address);
    res.json({ success: true, campaign });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:address/rewards-bonus/claim', (req, res) => {
  try {
    const claim = bonusCampaign.claim(req.params.address, req.body && req.body.code);
    res.json({ success: true, claim });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/rewards/leaderboard', (req, res) => {
  try {
    const bondingCurve = require('../services/bondingCurve');
    res.json({ success: true, leaderboard: bondingCurve.getRewardsLeaderboard(20) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.all(['/generate', '/derive', '/deposit'], (req, res) => {
  res.status(410).json({ success: false, error: 'Cession never creates wallets on the server.' });
});

module.exports = router;
