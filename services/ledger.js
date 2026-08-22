/**
 * Unified activity ledger for BaaS + CaaS + Exchange.
 */
const store = require('./store');
const crypto = require('crypto');

const KEY = 'ledger_events';
const MAX_EVENTS = 5000;

function id() {
  return 'evt_' + crypto.randomBytes(10).toString('hex');
}

async function loadAll() {
  const rows = await store.get(KEY, []);
  return Array.isArray(rows) ? rows : [];
}

async function saveAll(rows) {
  const trimmed = rows.slice(-MAX_EVENTS);
  await store.set(KEY, trimmed);
  return trimmed;
}

async function record(evt) {
  const row = {
    id: id(),
    ts: new Date().toISOString(),
    type: String(evt.type || 'unknown'),
    wallet: evt.wallet ? String(evt.wallet).slice(0, 128) : null,
    amount: evt.amount != null ? Number(evt.amount) : null,
    currency: evt.currency || 'USD',
    status: evt.status || 'recorded',
    demo: Boolean(evt.demo),
    meta: evt.meta && typeof evt.meta === 'object' ? evt.meta : {}
  };
  const all = await loadAll();
  all.push(row);
  await saveAll(all);
  return row;
}

async function listByWallet(wallet, limit = 50) {
  const w = String(wallet || '').toLowerCase();
  const all = await loadAll();
  return all
    .filter((e) => e.wallet && String(e.wallet).toLowerCase() === w)
    .slice(-limit)
    .reverse();
}

async function listRecent(limit = 100) {
  const all = await loadAll();
  return all.slice(-limit).reverse();
}

async function getById(eventId) {
  const all = await loadAll();
  return all.find((e) => e.id === eventId) || null;
}

module.exports = { record, listByWallet, listRecent, getById };
