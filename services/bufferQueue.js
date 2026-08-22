/**
 * Timed security buffer queue.
 */
const store = require('./store');
const ledger = require('./ledger');
const crypto = require('crypto');

const KEY = 'buffer_queue';

function id() {
  return 'buf_' + crypto.randomBytes(10).toString('hex');
}

async function load() {
  const rows = await store.get(KEY, []);
  return Array.isArray(rows) ? rows : [];
}

async function save(rows) {
  await store.set(KEY, rows);
}

async function enqueue(opts) {
  const minutes = Math.max(1, Math.min(60, Number(opts.bufferMinutes) || 15));
  const now = Date.now();
  const item = {
    id: id(),
    kind: String(opts.kind || 'send'),
    wallet: String(opts.wallet || ''),
    payload: opts.payload || {},
    status: 'held',
    createdAt: new Date(now).toISOString(),
    releaseAt: new Date(now + minutes * 60 * 1000).toISOString(),
    bufferMinutes: minutes,
    demo: Boolean(opts.demo)
  };
  const rows = await load();
  rows.push(item);
  await save(rows);
  await ledger.record({
    type: 'buffer.hold',
    wallet: item.wallet,
    status: 'held',
    demo: item.demo,
    meta: { bufferId: item.id, kind: item.kind, releaseAt: item.releaseAt }
  });
  return item;
}

async function cancel(bufferId, wallet) {
  const rows = await load();
  const i = rows.findIndex((r) => r.id === bufferId);
  if (i < 0) return { ok: false, error: 'Not found' };
  if (wallet && rows[i].wallet && rows[i].wallet !== wallet) {
    return { ok: false, error: 'Wallet mismatch' };
  }
  if (rows[i].status !== 'held') {
    return { ok: false, error: 'Already ' + rows[i].status };
  }
  rows[i].status = 'cancelled';
  rows[i].cancelledAt = new Date().toISOString();
  await save(rows);
  await ledger.record({
    type: 'buffer.cancel',
    wallet: rows[i].wallet,
    status: 'cancelled',
    demo: rows[i].demo,
    meta: { bufferId }
  });
  return { ok: true, item: rows[i] };
}

async function listForWallet(wallet) {
  const rows = await load();
  return rows
    .filter((r) => r.wallet === wallet)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function releaseDue() {
  const now = Date.now();
  const rows = await load();
  const released = [];
  for (const r of rows) {
    if (r.status === 'held' && Date.parse(r.releaseAt) <= now) {
      r.status = 'released';
      r.releasedAt = new Date().toISOString();
      released.push(r);
      await ledger.record({
        type: 'buffer.release',
        wallet: r.wallet,
        status: 'released',
        demo: r.demo,
        meta: { bufferId: r.id, kind: r.kind }
      });
    }
  }
  if (released.length) await save(rows);
  return released;
}

async function get(bufferId) {
  const rows = await load();
  return rows.find((r) => r.id === bufferId) || null;
}

module.exports = { enqueue, cancel, listForWallet, releaseDue, get };
