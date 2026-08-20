const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'fuse.json');

const CURVE_SUPPLY = 1_000_000_000;
const AGENT_SUPPLY = 1_000_000_000;
const TOTAL_SUPPLY = 2_000_000_000;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MIN_FIRST_BUY = 0.06;
const MAX_TRADES_PER_SEC = 1;

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) {
    return { coins: {}, insuranceSol: 0, agentLive: false };
  }
}
function save(d) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(d, null, 2));
}

function statusOf(coin) {
  if (!coin) return 'none';
  const age = Date.now() - Date.parse(coin.startedAt);
  if (coin.burned) return 'complete';
  if (age >= WINDOW_MS) return 'complete';
  if (!coin.agentLive) return 'paused';
  return 'active';
}

function hoursLeft(coin) {
  const end = Date.parse(coin.startedAt) + WINDOW_MS;
  return Math.max(0, (end - Date.now()) / 36e5);
}

function enable(symbol, creator, firstBuySol, mode) {
  const buy = Number(firstBuySol || 0);
  if (buy < MIN_FIRST_BUY) {
    const err = new Error('Fuse requires a 0.06 SOL first buy of your own coin.');
    err.code = 'FUSE_MIN_BUY';
    throw err;
  }
  const db = load();
  const key = String(symbol).toUpperCase();
  if (db.coins[key]) throw new Error('Fuse is set at create and cannot be added later.');
  db.coins[key] = {
    symbol: key,
    creator,
    mode: mode === 'manual' ? 'manual' : 'auto',
    startedAt: new Date().toISOString(),
    curveSupply: CURVE_SUPPLY,
    agentSupply: AGENT_SUPPLY,
    totalSupply: TOTAL_SUPPLY,
    agentInventory: AGENT_SUPPLY,
    trades: 0,
    lastTradeAt: 0,
    insuranceSol: 0,
    burned: false,
    agentLive: false,
    note: 'Agent stays paused until the house wallet is funded on-chain.'
  };
  save(db);
  return publicCoin(db.coins[key]);
}

function publicCoin(c) {
  return {
    symbol: c.symbol,
    fuse: true,
    mode: c.mode,
    status: statusOf(c),
    hoursLeft: Number(hoursLeft(c).toFixed(2)),
    totalSupply: c.totalSupply,
    agentInventory: c.burned ? 0 : c.agentInventory,
    trades: c.trades,
    insuranceSol: c.insuranceSol,
    agentLive: c.agentLive,
    note: c.note
  };
}

function get(symbol) {
  const db = load();
  const c = db.coins[String(symbol).toUpperCase()];
  return c ? publicCoin(c) : null;
}

function list() {
  const db = load();
  return Object.values(db.coins).map(publicCoin);
}

function recordFee(symbol, protocolSol) {
  const db = load();
  const c = db.coins[String(symbol).toUpperCase()];
  if (!c || statusOf(c) === 'none') return;
  const add = Number(protocolSol || 0);
  if (add <= 0) return;
  c.insuranceSol += add;
  db.insuranceSol += add;
  save(db);
}

function expire() {
  const db = load();
  Object.values(db.coins).forEach((c) => {
    if (!c.burned && Date.now() - Date.parse(c.startedAt) >= WINDOW_MS) {
      c.burned = true;
      c.agentInventory = 0;
      c.note = '24h ended. Unused agent tokens burned.';
    }
  });
  save(db);
}

function overview() {
  expire();
  const db = load();
  return {
    name: 'Fuse',
    sameAs: 'Pump Mayhem mechanics, different name',
    minFirstBuySol: MIN_FIRST_BUY,
    windowHours: 24,
    curveSupply: CURVE_SUPPLY,
    agentSupply: AGENT_SUPPLY,
    maxTradesPerSec: MAX_TRADES_PER_SEC,
    insuranceSol: db.insuranceSol,
    agentLive: db.agentLive,
    coins: list()
  };
}

module.exports = {
  MIN_FIRST_BUY,
  enable,
  get,
  list,
  recordFee,
  overview
};
