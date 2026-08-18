/*
  CessionRank v2
  Bounded X in [0, 100]. Cheap views/clicks stay ~4 pts.
  Dynamic decay. Wallet quality. Human dwell only.
  2-hop funding clusters and on-chain Q_w wait for program deploy.
*/
(function (root) {
  function hours(c) {
    const t = Date.parse(c.createdAt || c.created || 0);
    return t ? Math.max(0, (Date.now() - t) / 36e5) : 24;
  }
  function minutesSince(ts) {
    if (!ts) return 999;
    return Math.max(0, (Date.now() - Date.parse(ts)) / 60000);
  }
  function follows() {
    try { return JSON.parse(localStorage.getItem('cession_follows') || '{"users":[],"coins":[]}'); }
    catch (e) { return { users: [], coins: [] }; }
  }
  function saveFollows(f) { localStorage.setItem('cession_follows', JSON.stringify(f)); }
  function followUser(id) {
    const f = follows();
    if (id && f.users.indexOf(id) < 0) f.users.push(id);
    saveFollows(f);
  }
  function followCoin(sym) {
    const f = follows();
    const s = String(sym || '').toUpperCase();
    if (s && f.coins.indexOf(s) < 0) f.coins.push(s);
    saveFollows(f);
  }
  function isFollowed(c, f) {
    const s = String(c.symbol || '').toUpperCase();
    const creator = String(c.creator || c.owner || '').toLowerCase();
    return f.coins.indexOf(s) >= 0 || (creator && f.users.indexOf(creator) >= 0);
  }
  function pulse(c) {
    return Object.assign({
      uniqueViewers: 0, uniqueTraders: 0, views: 0, skipRate: 0,
      qualityMinutes: 0, humanMinutes: 0, holds: 0, follows: 0, shares: 0,
      returns: 0, bounces: 0, videoCompletes: 0, videoReplays: 0, videoSkips: 0,
      impressions: 0, trades: 0, repeatBuyers: 0, qualityTraderSum: 0,
      lastTradeAt: null, wash: false
    }, c.pulse || {});
  }
  function sat(n, cap) {
    const x = Math.max(0, Number(n || 0));
    if (!cap) return 0;
    return 1 - Math.exp(-x / cap);
  }
  function logSat(n, cap) {
    return Math.log1p(Math.max(0, Number(n || 0))) / Math.log1p(cap);
  }
  function rate(num, den) {
    return Number(den) > 0 ? Math.min(1, Number(num || 0) / Number(den)) : 0;
  }
  function lambda(p) {
    const idle = minutesSince(p.lastTradeAt);
    if (idle >= 15) return 0.5;
    return 0.15;
  }
  function prices(c, f) {
    const p = pulse(c);
    const views = Math.max(1, p.views || p.impressions || 1);
    const buyers = Math.max(1, p.uniqueTraders || 1);

    const cheap =
      1.5 * Math.min(1, logSat(p.views, 10000)) +
      2.5 * Math.min(1, logSat(p.views * 0.15, 1000));

    const time =
      12 * sat(p.humanMinutes || p.qualityMinutes, 40) +
      10 * rate(p.videoCompletes, views) +
      5 * Math.min(1, rate(p.videoReplays, views));

    const people =
      8 * sat(p.uniqueViewers, 60) +
      18 * sat(p.qualityTraderSum || p.uniqueTraders, 25);

    const commit =
      12 * sat(p.holds, 20) +
      6 * rate(p.follows + (isFollowed(c, f) ? 3 : 0), views) +
      10 * rate(p.shares, views) +
      15 * rate(p.repeatBuyers, buyers);

    const washHit = p.wash || ((p.trades || 0) > 10 && (p.uniqueTraders || 0) / Math.max(1, p.trades) < 0.15);
    const penalty =
      18 * Number(p.skipRate || 0) +
      8 * rate(p.videoSkips, views) +
      8 * rate(p.bounces, Math.max(1, p.uniqueViewers)) +
      (washHit ? 50 : 0);

    const decay = Math.exp(-lambda(p) * hours(c));
    const base = Math.min(100, cheap + time + people + commit);
    const x = Math.max(0, Math.min(100, (base - penalty) * decay));
    return {
      cheap, time, people, commit, penalty, decay, lambda: lambda(p),
      wash: washHit, x, cheapShare: base ? cheap / base : 0
    };
  }
  function score(c, f) { return prices(c, f).x; }
  function stage(c) {
    const p = pulse(c);
    if (hours(c) < 4 && p.uniqueViewers < 30) return 'test';
    if (p.uniqueTraders >= 8 && (p.humanMinutes || p.qualityMinutes) >= 15) return 'escalate';
    return 'main';
  }
  function diversify(list) {
    const out = [];
    const window = [];
    list.forEach(function (c) {
      const who = String(c.creator || c.symbol || '');
      if (window.length && window[window.length - 1] === who) return;
      if (window.filter(function (x) { return x === who; }).length >= 2) return;
      out.push(c);
      window.push(who);
      if (window.length > 8) window.shift();
    });
    list.forEach(function (c) { if (out.indexOf(c) < 0) out.push(c); });
    return out;
  }
  function mix(ranked) {
    const test = ranked.filter(function (c) { return stage(c) === 'test'; });
    const main = ranked.filter(function (c) { return stage(c) !== 'test'; });
    const out = [];
    let i = 0, j = 0;
    while (i < main.length || j < test.length) {
      if (out.length % 5 === 4 && j < test.length) out.push(test[j++]);
      else if (i < main.length) out.push(main[i++]);
      else out.push(test[j++]);
    }
    const seen = {};
    return out.filter(function (c) {
      if (seen[c.symbol]) return false;
      seen[c.symbol] = 1;
      return true;
    });
  }
  function rankForYou(coins) {
    const f = follows();
    return diversify(mix(coins.slice().sort(function (a, b) { return score(b, f) - score(a, f); })));
  }
  function rankFollowing(coins) {
    const f = follows();
    let pool = coins.filter(function (c) { return isFollowed(c, f); });
    pool.sort(function (a, b) { return hours(a) - hours(b); });
    if (pool.length > 80) pool = pool.slice(0, 80);
    return diversify(mix(pool.sort(function (a, b) { return score(b, f) - score(a, f); })));
  }
  root.CessionRank = { rankForYou, rankFollowing, followUser, followCoin, follows, hours, score, prices, stage };
})(window);
