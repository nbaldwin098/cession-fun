const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'pulse_signals.json');
const WINDOW_15 = 15 * 60 * 1000;
const WINDOW_24 = 24 * 60 * 60 * 1000;

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return { coins: {} }; }
}
function save(store) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(store));
}
function coin(store, symbol) {
  const s = String(symbol || '').toUpperCase();
  if (!store.coins[s]) {
    store.coins[s] = {
      impressions: 0, views: 0, skips: 0, dwellMs: 0, humanMs: 0,
      uniqueViewers: {}, traders: {},
      trades: 0, holds: 0, follows: 0, shares: 0, bounces: 0, returns: 0,
      videoWatchMs: 0, videoCompletes: 0, videoReplays: 0, videoSkips: 0,
      lastTradeAt: null, lastSparkAt: null, events: []
    };
  }
  if (!store.coins[s].events) store.coins[s].events = [];
  return store.coins[s];
}
function walletQuality(trader) {
  const ageH = trader.firstSeen ? (Date.now() - trader.firstSeen) / 36e5 : 0;
  const trades = trader.trades || 0;
  let q = 0.15;
  if (ageH > 1) q = 0.35;
  if (ageH > 24) q = 0.6;
  if (ageH > 24 * 14) q = 0.85;
  if (trades >= 3) q = Math.min(1, q + 0.15);
  if (trades >= 10) q = 1;
  return q;
}
function viewerKey(event) {
  return String(event.address || event.viewer || '').slice(0, 64) || 'anon';
}
function pruneEvents(row) {
  const cut = Date.now() - WINDOW_24;
  row.events = (row.events || []).filter((e) => e.t >= cut);
}
function windowStats(events, ms) {
  const cut = Date.now() - ms;
  const slice = events.filter((e) => e.t >= cut);
  const traders = {};
  let dwell = 0;
  let trades = 0;
  slice.forEach((e) => {
    if (e.type === 'trade') {
      trades += 1;
      traders[e.who] = (traders[e.who] || 0) + (e.q || 0.15);
    }
    if (e.type === 'dwell' || e.type === 'video_watch') dwell += e.ms || 0;
  });
  return {
    trades,
    traderQ: Object.values(traders).reduce((a, b) => a + b, 0),
    uniqueQ: Object.keys(traders).length,
    dwellMin: dwell / 60000
  };
}
function sparkOf(row) {
  pruneEvents(row);
  const w15 = windowStats(row.events, WINDOW_15);
  const w24 = windowStats(row.events, WINDOW_24);
  const baseline = Math.max(0.15, (w24.traderQ + w24.dwellMin + w24.trades) / 96);
  const now = w15.traderQ + w15.dwellMin + w15.trades;
  const sigma = now / baseline;
  const ignited = sigma > 4 && w15.uniqueQ >= 3;
  if (ignited) row.lastSparkAt = new Date().toISOString();
  return { sigma: Number(sigma.toFixed(2)), w15, ignited };
}

function record(event) {
  const store = load();
  const row = coin(store, event.symbol);
  const who = viewerKey(event);
  const type = String(event.type || '');
  const ms = Number(event.ms || 0);
  const human = !!event.human;

  if (type === 'impression') {
    row.impressions += 1;
    if (ms >= 1000) { row.views += 1; row.uniqueViewers[who] = (row.uniqueViewers[who] || 0) + 1; }
    else row.skips += 1;
  } else if (type === 'skip' || type === 'scroll_past') {
    row.skips += 1;
  } else if (type === 'video_skip') {
    row.videoSkips += 1; row.skips += 1; row.impressions += 1;
  } else if (type === 'video_watch') {
    row.videoWatchMs += Math.min(600000, Math.max(0, ms));
    if (human) row.humanMs += Math.min(600000, Math.max(0, ms));
    row.dwellMs += Math.min(600000, Math.max(0, ms));
    row.views += 1;
    row.uniqueViewers[who] = (row.uniqueViewers[who] || 0) + 1;
    row.impressions += 1;
    row.events.push({ t: Date.now(), type, who, ms, q: 0 });
  } else if (type === 'video_complete') {
    if (ms >= 3000) row.videoCompletes += 1;
  } else if (type === 'video_replay') {
    row.videoReplays += 1;
  } else if (type === 'open') {
    row.views += 1;
    row.uniqueViewers[who] = (row.uniqueViewers[who] || 0) + 1;
    if (row.uniqueViewers[who] > 1) row.returns += 1;
  } else if (type === 'dwell') {
    const add = Math.min(600000, Math.max(0, ms));
    row.dwellMs += add;
    if (human) row.humanMs += add;
    row.uniqueViewers[who] = (row.uniqueViewers[who] || 0) + 1;
    row.events.push({ t: Date.now(), type, who, ms: add, q: 0 });
  } else if (type === 'bounce') {
    row.bounces += 1;
  } else if (type === 'hold') {
    row.holds += 1;
  } else if (type === 'follow') {
    row.follows += 1;
  } else if (type === 'share') {
    row.shares += 1;
  } else if (type === 'trade') {
    row.trades += 1;
    row.lastTradeAt = new Date().toISOString();
    if (!row.traders[who]) row.traders[who] = { firstSeen: Date.now(), trades: 0 };
    row.traders[who].trades += 1;
    row.events.push({ t: Date.now(), type, who, ms: 0, q: walletQuality(row.traders[who]) });
  }
  const spark = sparkOf(row);
  if (!row.lastSparkAt && (type === 'trade' || type === 'dwell')) row.lastSparkAt = new Date().toISOString();
  save(store);
  const out = summarize(row);
  out.sparkRatio15m = spark.sigma;
  out.isResurrected = spark.ignited;
  return out;
}

function summarize(row) {
  pruneEvents(row);
  const spark = sparkOf(row);
  const uniqueViewers = Object.keys(row.uniqueViewers || {}).length;
  const traders = row.traders || {};
  const uniqueTraders = Object.keys(traders).length;
  let qualityTraderSum = 0;
  let repeatBuyers = 0;
  Object.keys(traders).forEach((k) => {
    qualityTraderSum += walletQuality(traders[k]);
    if ((traders[k].trades || 0) >= 2) repeatBuyers += 1;
  });
  const views = row.views || 0;
  const skips = row.skips || 0;
  const impressions = Math.max(1, row.impressions || 0);
  const wash = (row.trades || 0) > 10 && uniqueTraders / Math.max(1, row.trades) < 0.15;
  const humanMinutes = uniqueViewers ? (row.humanMs || 0) / uniqueViewers / 60000 : 0;
  const qualityMinutes = uniqueViewers ? (row.dwellMs || 0) / uniqueViewers / 60000 : 0;
  const created = row.createdAt || null;
  return {
    uniqueViewers, uniqueTraders, qualityTraderSum: Number(qualityTraderSum.toFixed(3)),
    repeatBuyers, views, skips, impressions,
    skipRate: Number((skips / impressions).toFixed(3)),
    qualityMinutes: Number(qualityMinutes.toFixed(3)),
    humanMinutes: Number(humanMinutes.toFixed(3)),
    trades: row.trades || 0, holds: row.holds || 0, follows: row.follows || 0,
    shares: row.shares || 0, bounces: row.bounces || 0, returns: row.returns || 0,
    videoCompletes: row.videoCompletes || 0, videoReplays: row.videoReplays || 0,
    videoSkips: row.videoSkips || 0, lastTradeAt: row.lastTradeAt,
    lastSparkAt: row.lastSparkAt, sparkRatio15m: spark.sigma,
    isResurrected: spark.ignited, wash, createdAt: created
  };
}

function statsFor(symbol) {
  const store = load();
  const row = store.coins[String(symbol || '').toUpperCase()];
  if (!row) return summarize(coin({ coins: {} }, 'NONE'));
  return summarize(row);
}

function attach(feed) {
  return (feed || []).map((c) => Object.assign({}, c, { pulse: statsFor(c.symbol) }));
}

module.exports = { record, statsFor, attach, walletQuality };
