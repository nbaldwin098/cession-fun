const express = require('express');
const router = express.Router();
const baas = require('../services/baasService');
const giveback = require('../services/giveback');
const bufferQueue = require('../services/bufferQueue');

function walletOf(req) {
  return (
    (req.body && req.body.wallet) ||
    req.query.wallet ||
    req.headers['x-cession-wallet'] ||
    ''
  ).trim();
}

router.get('/summary', async (req, res) => {
  try {
    res.json(await baas.summary(walletOf(req)));
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'baas summary failed' });
  }
});

router.get('/accounts', async (req, res) => {
  try {
    res.json(await baas.accounts(walletOf(req)));
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'accounts failed' });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const limit = Math.min(100, Number(req.query.limit) || 20);
    res.json(await baas.transactions(walletOf(req), limit));
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'transactions failed' });
  }
});

router.post('/deposit', async (req, res) => {
  try {
    const result = await baas.deposit({
      wallet: walletOf(req),
      amount: req.body && req.body.amount,
      externalAccountRef: req.body && req.body.externalAccountRef
    });
    res.status(result.ok ? 200 : 400).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'deposit failed' });
  }
});

router.post('/withdraw', async (req, res) => {
  try {
    const result = await baas.withdraw({
      wallet: walletOf(req),
      amount: req.body && req.body.amount,
      externalAccountRef: req.body && req.body.externalAccountRef
    });
    res.status(result.ok ? 200 : 400).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'withdraw failed' });
  }
});

router.post('/cards/:cardId/freeze', async (req, res) => {
  try {
    const result = await baas.freezeCard({
      cardId: req.params.cardId,
      wallet: walletOf(req),
      reason: req.body && req.body.reason
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'freeze failed' });
  }
});

router.post('/cashback/apply', async (req, res) => {
  try {
    const result = await baas.applyCashback({
      wallet: walletOf(req),
      spendAmount: req.body && req.body.spendAmount
    });
    res.status(result.ok ? 200 : 400).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'cashback failed' });
  }
});

router.get('/giveback', async (req, res) => {
  try {
    res.json(await giveback.statusFor(walletOf(req)));
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'giveback status failed' });
  }
});

router.post('/giveback/claim', async (req, res) => {
  try {
    const result = await giveback.claimDaily(walletOf(req));
    res.status(result.ok ? 200 : 400).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'giveback claim failed' });
  }
});

router.get('/buffer', async (req, res) => {
  try {
    const wallet = walletOf(req);
    const items = wallet ? await bufferQueue.listForWallet(wallet) : [];
    res.json({ ok: true, items });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'buffer list failed' });
  }
});

router.post('/buffer/:id/cancel', async (req, res) => {
  try {
    const result = await bufferQueue.cancel(req.params.id, walletOf(req));
    res.status(result.ok ? 200 : 400).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'buffer cancel failed' });
  }
});

module.exports = router;
