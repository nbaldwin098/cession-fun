/**
 * Synthetic leverage / price-exposure layer (demo).
 */
const ledger = require('./ledger');
const crypto = require('crypto');
const store = require('./store');

const KEY = 'leverage_positions';
const MAX_X = Number(process.env.LEVERAGE_MAX_X || 100);

async function load() {
  const rows = await store.get(KEY, []);
  return Array.isArray(rows) ? rows : [];
}

async function save(rows) {
  await store.set(KEY, rows.slice(-2000));
}

function clampLeverage(x) {
  const n = Number(x) || 1;
  return Math.max(1, Math.min(MAX_X, Math.floor(n)));
}

async function openPosition({ wallet, symbol, marginUsd, leverage, side = 'long', country }) {
  if (!wallet) return { ok: false, error: 'wallet required' };
  const lev = clampLeverage(leverage);
  const margin = Math.max(1, Number(marginUsd) || 10);
  const notional = +(margin * lev).toFixed(2);
  const pos = {
    id: 'exp_' + crypto.randomBytes(8).toString('hex'),
    wallet,
    symbol: String(symbol || 'SOL').toUpperCase(),
    side: side === 'short' ? 'short' : 'long',
    leverage: lev,
    marginUsd: margin,
    notionalUsd: notional,
    status: 'open_demo',
    country: country || null,
    openedAt: new Date().toISOString(),
    demo: true,
    disclosure:
      'Synthetic price exposure only. Not a perpetual future. Demo mode — no real PnL settlement.'
  };
  const rows = await load();
  rows.push(pos);
  await save(rows);
  await ledger.record({
    type: 'leverage.open',
    wallet,
    amount: margin,
    currency: 'USD',
    status: 'open_demo',
    demo: true,
    meta: { positionId: pos.id, leverage: lev, symbol: pos.symbol, notional }
  });
  return { ok: true, position: pos };
}

async function listPositions(wallet) {
  const rows = await load();
  return rows.filter((r) => r.wallet === wallet).reverse();
}

async function closePosition({ wallet, positionId }) {
  const rows = await load();
  const i = rows.findIndex((r) => r.id === positionId && r.wallet === wallet);
  if (i < 0) return { ok: false, error: 'Position not found' };
  rows[i].status = 'closed_demo';
  rows[i].closedAt = new Date().toISOString();
  await save(rows);
  await ledger.record({
    type: 'leverage.close',
    wallet,
    status: 'closed_demo',
    demo: true,
    meta: { positionId }
  });
  return { ok: true, position: rows[i] };
}

module.exports = {
  openPosition,
  listPositions,
  closePosition,
  MAX_X
};
