/**
 * Banking waitlist / early access requests.
 * Stored in store (Postgres cession_kv or data/waitlist.json).
 */
const express = require('express');
const router = express.Router();
const store = require('../services/store');

const KEY = 'banking_waitlist';

function cleanEmail(e) {
  const s = String(e || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return '';
  return s.slice(0, 120);
}

function cleanWallet(w) {
  const s = String(w || '').trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(s)) return s;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,48}$/.test(s)) return s;
  return '';
}

router.post('/banking', async (req, res) => {
  try {
    const email = cleanEmail(req.body && req.body.email);
    const wallet = cleanWallet(req.body && req.body.wallet);
    const note = String((req.body && req.body.note) || '').slice(0, 280);
    if (!email && !wallet) {
      return res.status(400).json({ ok: false, error: 'Email or wallet required' });
    }
    const rows = (await store.get(KEY, [])) || [];
    const list = Array.isArray(rows) ? rows : [];
    const exists = list.some(
      (r) => (email && r.email === email) || (wallet && r.wallet === wallet)
    );
    if (exists) {
      return res.json({ ok: true, already: true, message: 'You are already on the list.' });
    }
    list.push({
      email: email || null,
      wallet: wallet || null,
      note: note || null,
      at: new Date().toISOString(),
      ip: (req.ip || '').slice(0, 64)
    });
    while (list.length > 5000) list.shift();
    await store.set(KEY, list);
    res.json({ ok: true, message: 'Request saved. We will reach out when banking opens.' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'store failed' });
  }
});

router.get('/banking/count', async (req, res) => {
  try {
    const rows = (await store.get(KEY, [])) || [];
    res.json({ ok: true, count: Array.isArray(rows) ? rows.length : 0 });
  } catch (e) {
    res.json({ ok: true, count: 0 });
  }
});

module.exports = router;
