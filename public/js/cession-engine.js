/* Cession Engine v1.1 — live learn, milestone boost, debug reasons */
(function (root) {
  const DIM = 64;
  const KEY = 'cession_user_vec';
  const FAT = 'cession_fatigue';
  const LOG = 'cession_stream';
  const CATS = ['animal', 'ai', 'pepe', 'anime', 'political', 'utility', 'other'];

  function zeros() { return new Float64Array(DIM); }
  function loadVec() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      const v = zeros();
      for (let i = 0; i < Math.min(DIM, raw.length); i++) v[i] = raw[i];
      return norm(v);
    } catch (e) { return zeros(); }
  }
  function saveVec(v) { localStorage.setItem(KEY, JSON.stringify(Array.from(v))); }
  function norm(v) {
    let s = 0;
    for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    s = Math.sqrt(s);
    if (s < 1e-9) return v;
    const o = zeros();
    for (let i = 0; i < v.length; i++) o[i] = v[i] / s;
    return o;
  }
  function dot(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }
  function hash01(str, salt) {
    let h = salt + 2166136261;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 10000) / 10000;
  }
  function category(c) {
    const t = ((c.name || '') + ' ' + (c.symbol || '')).toLowerCase();
    if (/(dog|cat|pepe|frog|shib|doge|wojak|animal)/.test(t)) return 'animal';
    if (/(ai|gpt|agent|bot|neural)/.test(t)) return 'ai';
    if (/(anime|waifu|kawaii|naruto)/.test(t)) return 'anime';
    if (/(trump|biden|vote|maga|gov)/.test(t)) return 'political';
    if (/(usd|sol|stake|util|dao)/.test(t)) return 'utility';
    return 'other';
  }
  function curvePct(c) {
    const p = Number(c.curveProgress || c.progress || c.fillPct || 0);
    if (p > 1) return Math.min(100, p);
    if (p > 0) return p * 100;
    return 0;
  }
  function milestoneBoost(c) {
    const pct = curvePct(c);
    if (pct >= 75 && pct < 100) return 1.18;
    if (pct >= 50) return 1.12;
    if (pct >= 25) return 1.06;
    return 1;
  }
  function tokenVec(c) {
    const v = zeros();
    const cat = category(c);
    const ci = CATS.indexOf(cat);
    if (ci >= 0) v[ci] = 1;
    const p = c.pulse || {};
    v[8] = Math.min(1, (p.uniqueTraders || 0) / 40);
    v[9] = Math.min(1, (p.humanMinutes || p.qualityMinutes || 0) / 20);
    v[10] = Math.min(1, p.skipRate || 0);
    v[11] = p.wash ? 1 : 0;
    v[12] = Math.min(1, (p.sparkRatio15m || 0) / 8);
    v[13] = Math.min(1, Math.log1p(c.volume24hUsd || 0) / 12);
    v[14] = (p.isResurrected) ? 1 : 0;
    v[15] = curvePct(c) / 100;
    const key = (c.symbol || '') + (c.mint || c.mintAddress || '');
    for (let i = 16; i < DIM; i++) v[i] = hash01(key, i) * 0.15;
    return norm(v);
  }
  function walletQuality(ageDays, txCount, solBalance) {
    const ageScore = Math.min(1, (ageDays || 0) / 30);
    const txScore = Math.min(1, Math.log1p(txCount || 0) / Math.log1p(50));
    const balScore = Math.min(1, (solBalance || 0) / 1);
    return Math.round(Math.max(0.1, Math.min(1, 0.3 * ageScore + 0.4 * txScore + 0.3 * balScore)) * 100) / 100;
  }
  function viewerQw() {
    const first = Number(localStorage.getItem('cession_first_seen') || Date.now());
    if (!localStorage.getItem('cession_first_seen')) localStorage.setItem('cession_first_seen', String(first));
    return walletQuality((Date.now() - first) / 86400000, Number(localStorage.getItem('cession_tx_count') || 0), Number(localStorage.getItem('cession_sol') || 0));
  }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
  function predict(c, user, tv) {
    const aff = dot(user, tv);
    const p = c.pulse || {};
    return {
      pDwell: sigmoid(2.2 * aff + 1.4 * (1 - (p.skipRate || 0))),
      pBuy: sigmoid(1.6 * aff + 0.08 * (p.qualityTraderSum || p.uniqueTraders || 0) - (p.wash ? 2 : 0)),
      pHold: sigmoid(1.8 * aff + 0.12 * (p.humanMinutes || 0)),
      pDump: sigmoid(1.8 * (p.skipRate || 0) + (p.wash ? 2.5 : 0) - aff),
      affinity: aff
    };
  }
  function rankOne(c, user) {
    const tv = tokenVec(c);
    const pred = predict(c, user, tv);
    const qw = Number((c.pulse && c.pulse.uniqueTraders ? (c.pulse.qualityTraderSum || c.pulse.uniqueTraders) / Math.max(1, c.pulse.uniqueTraders) : 0.4));
    const raw = 1.0 * pred.pDwell + 3.5 * pred.pBuy + 4.0 * pred.pHold - 5.0 * pred.pDump;
    const boost = milestoneBoost(c);
    const bounded = Math.max(0, Math.min(100, raw * 20 * boost));
    const x = Math.round(bounded * Math.max(0.1, Math.min(1, qw)) * 100) / 100;
    return Object.assign({ x: x, tv: tv, qw: qw, boost: boost }, pred);
  }
  function why(c) {
    const r = c._engine || rankOne(c, loadVec());
    const p = c.pulse || {};
    if (p.isResurrected || (p.sparkRatio15m || 0) >= 4) {
      return 'Revival spark: ' + (p.sparkRatio15m || 0) + 'x vs 24h';
    }
    const pct = curvePct(c);
    if (pct >= 25) return 'Curve ' + Math.round(pct) + '% — early buyers get a boost';
    if (r.affinity > 0.25) return 'Matches your last watches and buys';
    if ((p.repeatBuyers || 0) > 2) return Math.round(100 * (p.repeatBuyers / Math.max(1, p.uniqueTraders))) + '% of buyers added again';
    if ((p.humanMinutes || 0) > 2) return 'People stay on this coin';
    return 'New test batch';
  }
  const WEIGHTS = { skip: -0.2, scroll_past: -0.2, video_skip: -0.25, dwell: 0.3, video_watch: 0.35, video_complete: 0.6, buy: 1, hold: 1.5, follow: 0.7, share: 0.8 };
  function stream(event) {
    const q = JSON.parse(localStorage.getItem(LOG) || '[]');
    q.push({ t: Date.now(), event: event });
    localStorage.setItem(LOG, JSON.stringify(q.slice(-200)));
  }
  function learn(tokenLike, action) {
    stream({ action: action, symbol: tokenLike && tokenLike.symbol });
    const w = WEIGHTS[action];
    if (w == null) return loadVec();
    let user = loadVec();
    const tv = tokenVec(tokenLike || {});
    const next = zeros();
    for (let i = 0; i < DIM; i++) next[i] = user[i] + 0.05 * w * tv[i];
    user = norm(next);
    saveVec(user);
    return user;
  }
  function fatigue() {
    try { return JSON.parse(sessionStorage.getItem(FAT) || '{"cats":{},"lastCreator":""}'); }
    catch (e) { return { cats: {}, lastCreator: '' }; }
  }
  function noteSkip(c) {
    learn(c, 'skip');
    const f = fatigue();
    f.cats[category(c)] = (f.cats[category(c)] || 0) + 1;
    sessionStorage.setItem(FAT, JSON.stringify(f));
  }
  function suppressed(c) {
    const f = fatigue();
    if (c.creator && c.creator === f.lastCreator) return true;
    return (f.cats[category(c)] || 0) >= 3;
  }
  function markShown(c) {
    const f = fatigue();
    f.lastCreator = String(c.creator || '');
    sessionStorage.setItem(FAT, JSON.stringify(f));
  }
  function retrieve(coins, user, k) {
    return coins.slice().map(function (c) {
      return { c: c, sim: dot(user, tokenVec(c)) };
    }).sort(function (a, b) { return b.sim - a.sim; }).slice(0, k || 100).map(function (x) { return x.c; });
  }
  function assemble(coins) {
    const user = loadVec();
    const scored = retrieve(coins, user, 100).map(function (c) {
      c._engine = rankOne(c, user);
      c._why = why(c);
      return c;
    }).sort(function (a, b) { return b._engine.x - a._engine.x; });
    const now = Date.now();
    const cold = scored.filter(function (c) {
      const t = Date.parse(c.createdAt || c.created || 0);
      return t && (now - t) < 4 * 36e5;
    });
    const spark = scored.filter(function (c) {
      const p = c.pulse || {};
      const age = Date.parse(c.createdAt || 0);
      return age && (now - age) > 12 * 36e5 && (p.isResurrected || (p.sparkRatio15m || 0) >= 4);
    });
    const core = scored.filter(function (c) { return cold.indexOf(c) < 0 && spark.indexOf(c) < 0 && !suppressed(c); });
    const out = [];
    let i = 0, j = 0, k = 0;
    while (out.length < scored.length && (i < core.length || j < cold.length || k < spark.length)) {
      const n = out.length % 10;
      if ((n === 7 || n === 8) && j < cold.length) out.push(cold[j++]);
      else if (n === 9 && k < spark.length) out.push(spark[k++]);
      else if (i < core.length) out.push(core[i++]);
      else if (j < cold.length) out.push(cold[j++]);
      else if (k < spark.length) out.push(spark[k++]);
      else break;
    }
    out.forEach(markShown);
    const seen = {};
    return out.filter(function (c) {
      if (seen[c.symbol]) return false;
      seen[c.symbol] = 1;
      return true;
    });
  }
  function debug(coin) {
    const user = loadVec();
    const sample = coin || {};
    const r = rankOne(sample, user);
    const report = {
      viewerQw: viewerQw(),
      userVecHead: Array.from(user).slice(0, 8).map(function (n) { return Number(n.toFixed(3)); }),
      category: category(sample),
      why: why(sample),
      rank: r,
      streamTail: JSON.parse(localStorage.getItem(LOG) || '[]').slice(-8)
    };
    console.log('CessionEngine.debug', report);
    return report;
  }
  function tapSize() {
    return Number(localStorage.getItem('cession_preset_buy') || localStorage.getItem('presetBuySol') || 0.05);
  }
  root.CessionEngine = {
    walletQuality: walletQuality,
    viewerQw: viewerQw,
    tokenVec: tokenVec,
    learn: learn,
    assemble: assemble,
    retrieve: retrieve,
    rankOne: rankOne,
    noteSkip: noteSkip,
    category: category,
    why: why,
    debug: debug,
    tapSize: tapSize,
    milestoneBoost: milestoneBoost
  };
})(window);
