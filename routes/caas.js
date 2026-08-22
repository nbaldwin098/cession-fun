/**
 * CaaS HTTP surface — Coinbase-style headless buy flow.
 */
const express = require('express');
const router = express.Router();
const caas = require('../services/caasService');
const leverage = require('../services/leverageService');
const bufferQueue = require('../services/bufferQueue');
const auth = require('./auth');
const requireAuth = auth.requireAuth;
const sessionWalletMatches = auth.sessionWalletMatches;

function walletOf(req) {
  return (
    (req.body && req.body.walletAddress) ||
    (req.body && req.body.wallet) ||
    req.query.wallet ||
    req.headers['x-cession-wallet'] ||
    ''
  ).trim();
}

router.get('/assets', async (req, res) => {
  try {
    res.json(await caas.listAssets());
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'assets failed' });
  }
});

router.post('/quote', async (req, res) => {
  try {
    const body = req.body || {};
    const result = await caas.quote({
      asset: body.asset,
      amountUsd: body.amountUsd,
      side: body.side,
      walletAddress: walletOf(req) || body.walletAddress
    });
    res.status(result.ok ? 200 : 400).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'quote failed' });
  }
});

router.post('/order', requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const wallet = walletOf(req) || (req.cessionUser && req.cessionUser.address) || '';
    if (wallet && !sessionWalletMatches(req, wallet)) {
      return res.status(403).json({ ok: false, error: 'Wallet does not match signed session.' });
    }
    const result = await caas.order({
      quoteId: body.quoteId,
      walletAddress: wallet || req.cessionUser.address,
      bufferMinutes: body.bufferMinutes,
      asset: body.asset,
      amountUsd: body.amountUsd,
      assetAmount: body.assetAmount
    });
    res.status(result.ok ? 200 : 400).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'order failed' });
  }
});

router.get('/orders/:orderId', async (req, res) => {
  try {
    const result = await caas.orderStatus(req.params.orderId);
    res.status(result.ok ? 200 : 404).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'order status failed' });
  }
});

router.post('/exposure/open', requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const wallet = walletOf(req) || (req.cessionUser && req.cessionUser.address) || '';
    if (wallet && !sessionWalletMatches(req, wallet)) {
      return res.status(403).json({ ok: false, error: 'Wallet does not match signed session.' });
    }
    const result = await leverage.openPosition({
      wallet: wallet || req.cessionUser.address,
      symbol: body.symbol,
      marginUsd: body.marginUsd,
      leverage: body.leverage,
      side: body.side,
      country: body.country || req.headers['cf-ipcountry'] || ''
    });
    res.status(result.ok ? 200 : 400).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'exposure open failed' });
  }
});

router.get('/exposure', async (req, res) => {
  try {
    const wallet = walletOf(req);
    const positions = wallet ? await leverage.listPositions(wallet) : [];
    res.json({ ok: true, maxLeverage: leverage.MAX_X, positions, demo: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'exposure list failed' });
  }
});

router.post('/exposure/:id/close', requireAuth, async (req, res) => {
  try {
    const wallet = walletOf(req) || (req.cessionUser && req.cessionUser.address) || '';
    if (wallet && !sessionWalletMatches(req, wallet)) {
      return res.status(403).json({ ok: false, error: 'Wallet does not match signed session.' });
    }
    const result = await leverage.closePosition({
      wallet: wallet || req.cessionUser.address,
      positionId: req.params.id
    });
    res.status(result.ok ? 200 : 400).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'exposure close failed' });
  }
});

router.post('/buffer/release-due', async (req, res) => {
  try {
    const released = await bufferQueue.releaseDue();
    res.json({ ok: true, released: released.length, items: released });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'release failed' });
  }
});

module.exports = router;
