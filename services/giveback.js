/**
 * Daily crypto give-back + profit-share style rewards.
 */
const store = require('./store');
const ledger = require('./ledger');
const crypto = require('crypto');

const KEY = 'giveback_state';
const DEFAULT_DAILY_SOL = Number(process.env.GIVEBACK_DAILY_SOL || 0.001);

async function load() {
  return (await store.get(KEY, { claims: {}, lastRun: null })) || { claims: {}, lastRun: null };
}

async function save(state) {
  await store.set(KEY, state);
}

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

async function statusFor(wallet) {
  const state = await load();
  const day = dayKey();
  const w = String(wallet || '').toLowerCase();
  const claimed = Boolean(state.claims[day] && state.claims[day][w]);
  return {
    ok: true,
    wallet,
    day,
    claimedToday: claimed,
    dailyAmountSol: DEFAULT_DAILY_SOL,
    note: 'Daily micro give-back. Demo records entitlement; treasury executes when funded.'
  };
}

async function claimDaily(wallet) {
  if (!wallet) return { ok: false, error: 'wallet required' };
  const state = await load();
  const day = dayKey();
  const w = String(wallet).toLowerCase();
  if (!state.claims[day]) state.claims[day] = {};
  if (state.claims[day][w]) {
    return { ok: false, error: 'Already claimed today', day };
  }
  state.claims[day][w] = {
    at: new Date().toISOString(),
    amountSol: DEFAULT_DAILY_SOL,
    id: 'gb_' + crypto.randomBytes(6).toString('hex')
  };
  const days = Object.keys(state.claims).sort();
  while (days.length > 14) {
    delete state.claims[days.shift()];
  }
  await save(state);
  await ledger.record({
    type: 'giveback.daily',
    wallet,
    amount: DEFAULT_DAILY_SOL,
    currency: 'SOL',
    status: 'entitled',
    demo: true,
    meta: { day, claimId: state.claims[day][w].id }
  });
  return {
    ok: true,
    day,
    amountSol: DEFAULT_DAILY_SOL,
    claimId: state.claims[day][w].id,
    message: 'Daily give-back recorded.'
  };
}

module.exports = { statusFor, claimDaily };
