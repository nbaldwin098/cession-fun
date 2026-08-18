/*
  Cession Pulse X

  Principle (Kleinberg et al., value-faithful + strategy-robust):
  weight an action by how costly it is to fake and how well it shows
  the user valued the coin. Views and taps are cheap. They must stay
  a tiny share of X.

  Prices (perfect coin = 100 before decay and penalties):

    CHEAP  (cap 4.0)     view 1.5   click 2.5
    TIME                 qualityMinutes 15   videoComplete 10   replay 6
    PEOPLE               uniqueViewers 10    uniqueTraders 16
    COMMIT               hold 8   follow 8   share 10   return 5

    PENALTIES            skip 18   videoSkip 8   bounce 8   wash 40
    DECAY                e^(-0.045 h)

  50 unique viewers * 10 min dwell = 500 quality-minutes -> time is full.
  500 wash trades from 2 wallets -> wash penalty 40, traders near 0.
*/
(function (root) {
  function hours(c) {
    const t = Date.parse(c.createdAt || c.created || 0);
    return t ? Math.max(0, (Date.now() - t) / 36e5) : 24;
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
    return c.pulse || {
      uniqueViewers: 0, uniqueTraders: 0, views: 0, skipRate: 0,
      qualityMinutes: 0, holds: 0, follows: 0, shares: 0, returns: 0,
      bounces: 0, videoCompletes: 0, videoReplays: 0, videoSkips: 0,
      impressions: 0, wash: false
    };
  }
  function unit(n, cap) {
    const x = Number(n || 0);
    if (x <= 0 || cap <= 0) return 0;
    return Math.min(1, x / cap);
  }
  function logUnit(n, cap) {
    return unit(Math.log1p(Number(n || 0)), Math.log1p(cap));
  }
  function prices(c, f) {
    const p = pulse(c);
    const cheap = 1.5 * logUnit(p.views, 800) + 2.5 * logUnit(p.views * 0.2, 200);
    const time =
      15 * unit(p.qualityMinutes, 80) +
      10 * unit(p.videoCompletes, 40) +
      6 * unit(p.videoReplays, 20);
    const people =
      10 * unit(p.uniqueViewers, 80) +
      16 * unit(p.uniqueTraders, 50);
    const commit =
      8 * unit(p.holds, 30) +
      8 * unit(p.follows + (isFollowed(c, f) ? 4 : 0), 25) +
      10 * unit(p.shares, 20) +
      5 * unit(p.returns, 25);
    const penalty =
      18 * Number(p.skipRate || 0) +
      8 * unit(p.videoSkips, Math.max(10, p.impressions || 10)) +
      8 * unit(p.bounces, Math.max(8, p.uniqueViewers || 8)) +
      (p.wash ? 40 : 0);
    const decay = Math.exp(-0.045 * hours(c));
    const raw = cheap + time + people + commit;
    const x = Math.max(0, (raw - penalty) * decay);
    return { cheap, time, people, commit, penalty, decay, x, cheapShare: raw ? cheap / raw : 0 };
  }
  function score(c, f) { return prices(c, f).x; }
  function stage(c) {
    const p = pulse(c);
    if (hours(c) < 6 && p.uniqueViewers < 40) return 'test';
    if (p.uniqueViewers >= 40 && p.qualityMinutes >= 20) return 'escalate';
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
