const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'pulse_signals.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return { coins: {}, viewers: {} }; }
}
function save(store) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(store));
}
function coin(store, symbol) {
  const s = String(symbol || '').toUpperCase();
  if (!store.coins[s]) {
    store.coins[s] = {
      impressions: 0, views: 0, skips: 0, dwellMs: 0,
      uniqueViewers: {}, uniqueTraders: {},
      trades: 0, holds: 0, follows: 0, shares: 0, bounces: 0, returns: 0,
      videoWatchMs: 0, videoCompletes: 0, videoReplays: 0, videoSkips: 0
    };
  }
  return store.coins[s];
}
function viewerKey(req) {
  return String(req.address || req.viewer || '').slice(0, 64) || 'anon';
}

function record(event) {
  const store = load();
  const row = coin(store, event.symbol);
  const who = viewerKey(event);
  const type = String(event.type || '');
  const ms = Number(event.ms || 0);
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
    row.dwellMs += Math.min(600000, Math.max(0, ms));
    row.views += 1;
    row.uniqueViewers[who] = (row.uniqueViewers[who] || 0) + 1;
    row.impressions += 1;
  } else if (type === 'video_complete') {
    row.videoCompletes += 1;
  } else if (type === 'video_replay') {
    row.videoReplays += 1;
  } else if (type === 'open') {
    row.views += 1;
    row.uniqueViewers[who] = (row.uniqueViewers[who] || 0) + 1;
    if (row.uniqueViewers[who] > 1) row.returns += 1;
  } else if (type === 'dwell') {
    row.dwellMs += Math.min(600000, Math.max(0, ms));
    row.uniqueViewers[who] = (row.uniqueViewers[who] || 0) + 1;
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
    row.uniqueTraders[who] = 1;
  }
  save(store);
  return summarize(row);
}

function summarize(row) {
  const uniqueViewers = Object.keys(row.uniqueViewers || {}).length;
  const uniqueTraders = Object.keys(row.uniqueTraders || {}).length;
  const views = row.views || 0;
  const skips = row.skips || 0;
  const impressions = Math.max(1, (row.impressions || 0) + (row.videoSkips || 0));
  const skipRate = skips / impressions;
  const avgDwellMin = uniqueViewers ? (row.dwellMs || 0) / uniqueViewers / 60000 : 0;
  const wash = (row.trades || 0) > 10 && uniqueTraders / Math.max(1, row.trades) < 0.15;
  return {
    uniqueViewers,
    uniqueTraders,
    views,
    skips,
    impressions,
    skipRate: Number(skipRate.toFixed(3)),
    completion: Number((views / impressions).toFixed(3)),
    avgDwellMin: Number(avgDwellMin.toFixed(3)),
    qualityMinutes: Number((uniqueViewers * avgDwellMin).toFixed(2)),
    trades: row.trades || 0,
    holds: row.holds || 0,
    follows: row.follows || 0,
    shares: row.shares || 0,
    bounces: row.bounces || 0,
    returns: row.returns || 0,
    videoCompletes: row.videoCompletes || 0,
    videoReplays: row.videoReplays || 0,
    videoSkips: row.videoSkips || 0,
    wash
  };
}

function statsFor(symbol) {
  const store = load();
  const row = store.coins[String(symbol || '').toUpperCase()];
  if (!row) return summarize(coin({ coins: {} }, 'X'));
  return summarize(row);
}

function attach(feed) {
  return (feed || []).map((c) => Object.assign({}, c, { pulse: statsFor(c.symbol) }));
}

module.exports = { record, statsFor, attach };
