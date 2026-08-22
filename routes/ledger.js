const express = require('express');
const router = express.Router();
const ledger = require('../services/ledger');

router.get('/recent', async (req, res) => {
  try {
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const items = await ledger.listRecent(limit);
    res.json({ ok: true, items });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'ledger failed' });
  }
});

router.get('/wallet/:address', async (req, res) => {
  try {
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const items = await ledger.listByWallet(req.params.address, limit);
    res.json({ ok: true, wallet: req.params.address, items });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'ledger wallet failed' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await ledger.getById(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, item });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'ledger get failed' });
  }
});

module.exports = router;
