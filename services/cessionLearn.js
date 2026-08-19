const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'user_vectors.json');

const TAGS = ['animal', 'ai', 'politics', 'anime', 'ticker', 'new'];
const WEIGHT = {
  skip: -0.18,
  scroll_past: -0.12,
  video_skip: -0.16,
  bounce: -0.1,
  impression: 0.02,
  dwell: 0.12,
  video_watch: 0.14,
  video_complete: 0.2,
  video_replay: 0.16,
  open: 0.08,
  hold: 0.18,
  follow: 0.2,
  share: 0.15,
  trade: 0.35
};

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return { users: {} }; }
}
function save(store) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(store));
}
function blank() {
  const tags = {};
  TAGS.forEach(function (t) { tags[t] = 0; });
  return { tags: tags, recent: [], actions: 0, updatedAt: Date.now() };
}
function userOf(store, id) {
  const key = String(id || 'anon').slice(0, 64);
  if (!store.users[key]) store.users[key] = blank();
  return store.users[key];
}
function tagsOf(coin) {
  const text = String((coin && (coin.name + ' ' + coin.symbol)) || '').toLowerCase();
  const out = [];
  if (/(doge|pepe|cat|dog|inu|frog|ape|monkey|bear|bull)/.test(text)) out.push('animal');
  if (/(ai|gpt|bot|agent|neural)/.test(text)) out.push('ai');
  if (/(trump|biden|vote|maga|politic)/.test(text)) out.push('politics');
  if (/(anime|waifu|neko|manga)/.test(text)) out.push('anime');
  if (!out.length) out.push('ticker');
  const age = Date.parse(coin && (coin.createdAt || coin.created) || 0);
  if (age && Date.now() - age < 6 * 36e5) out.push('new');
  return out;
}
function decay(row) {
  const hours = Math.max(0, (Date.now() - (row.updatedAt || Date.now())) / 36e5);
  const f = Math.exp(-0.02 * hours);
  Object.keys(row.tags).forEach(function (k) { row.tags[k] *= f; });
}
function update(id, event, coin) {
  const store = load();
  const row = userOf(store, id);
  decay(row);
  const delta = WEIGHT[String(event.type || '')] || 0;
  const ms = Number(event.ms || 0);
  const boost = delta * (ms > 8000 ? 1.4 : ms > 2000 ? 1 : 0.7);
  tagsOf(coin || { symbol: event.symbol, name: event.name || '' }).forEach(function (tag) {
    row.tags[tag] = (row.tags[tag] || 0) + boost;
  });
  const sym = String(event.symbol || '').toUpperCase();
  if (sym) {
    row.recent = [sym].concat(row.recent.filter(function (s) { return s !== sym; })).slice(0, 40);
  }
  row.actions += 1;
  row.updatedAt = Date.now();
  save(store);
  return row;
}
function affinity(row, coin) {
  if (!row) return 0.5;
  const tags = tagsOf(coin);
  if (!tags.length) return 0.5;
  let num = 0;
  let den = 0;
  tags.forEach(function (t) {
    num += row.tags[t] || 0;
    den += 1;
  });
  const seen = row.recent.indexOf(String(coin.symbol || '').toUpperCase()) >= 0 ? 0.08 : 0;
  const raw = num / den;
  return Math.max(0.05, Math.min(1.2, 0.5 + raw * 0.25 + seen));
}
function rank(id, coins) {
  const store = load();
  const row = userOf(store, id);
  decay(row);
  return (coins || []).map(function (c) {
    const globalX = Number((c.pulse && (c.pulse.x || c.pulseScore)) || c.pulseScore || 0);
    const a = affinity(row, c);
    return Object.assign({}, c, {
      affinity: Number(a.toFixed(3)),
      userScore: Number((Math.max(globalX, 8) * a).toFixed(2))
    });
  }).sort(function (a, b) { return b.userScore - a.userScore; });
}
function mix(id, coins) {
  const ranked = rank(id, coins);
  const core = ranked.slice();
  const explore = ranked.filter(function (c) { return (c.affinity || 0) < 0.55; });
  const out = [];
  let i = 0;
  let j = 0;
  while (out.length < ranked.length) {
    const n = out.length % 10;
    if (n >= 8 && j < explore.length) out.push(explore[j++]);
    else if (i < core.length) out.push(core[i++]);
    else break;
  }
  const seen = {};
  return out.filter(function (c) {
    const k = c.symbol;
    if (seen[k]) return false;
    seen[k] = 1;
    return true;
  });
}

module.exports = { update, rank, mix, tagsOf, affinity };
