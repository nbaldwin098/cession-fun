const express = require('express');
const router = express.Router();
const caas = require('../services/caasService');
const baasPartner = require('../services/providers/baasPartner');
const ledger = require('../services/ledger');

router.post('/coinbase', async (req, res) => {
  try {
    const result = await caas.webhook(req.body || {}, req.headers);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'webhook failed' });
  }
});

router.post('/baas', async (req, res) => {
  try {
    const result = await baasPartner.handleWebhook(req.body || {});
    await ledger.record({
      type: 'baas.webhook',
      status: 'received',
      demo: result.demo,
      meta: { eventType: result.eventType }
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'baas webhook failed' });
  }
});

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'webhooks' });
});

module.exports = router;
