/*
  Cession rankers — For You and Following.

  TikTok: batch-test new items, weight completion/watch, punish skip,
  mix exploration, cap one creator in a row.
  Instagram: skip in first seconds kills distribution; shares > likes.
  YouTube: satisfaction over raw volume; regret/bounce is a negative.

  Cession map:
    watch time  -> dwell on the coin page (ms)
    skip        -> impression < 1s or scroll-past
    like/save   -> hold
    follow      -> follow coin or wallet
    share       -> share
    satisfaction-> unique viewers * avg dwell minutes
    wash trades -> many trades, few unique wallets (penalty)

  50 unique viewers on a coin for 10 minutes beats 500 wash trades.
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
      uniqueViewers: Number(c.uniqueTraders || 0),
      uniqueTraders: Number(c.uniqueTraders || 0),
      skipRate: 0,
      completion: 0,
      avgDwellMin: 0,
      qualityMinutes: 0,
      trades: 0,
      holds: 0,
      follows: 0,
      shares: 0,
      bounces: 0,
      returns: 0,
      wash: false
    };
  }
  function stage(c) {
    const p = pulse(c);
    const age = hours(c);
    if (age < 6 && p.uniqueViewers < 40) return 'test';
    if (p.uniqueViewers >= 40 && p.qualityMinutes >= 20) return 'escalate';
    return 'main';
  }
  function score(c, f) {
    const p = pulse(c);
    const followed = isFollowed(c, f) ? 1 : 0;
    const action =
      8 * p.qualityMinutes +
      6 * p.uniqueViewers +
      5 * p.uniqueTraders +
      4 * p.holds +
      5 * p.follows +
      7 * p.shares +
      3 * p.returns +
      5 * followed;
    const nonAction =
      10 * p.skipRate +
      4 * (p.bounces || 0) / Math.max(1, p.uniqueViewers) +
      (p.wash ? 40 : 0);
    const volumeLie = Math.log(1 + Number(c.volume24hUsd || 0)) * 0.15;
    const freshness = Math.exp(-0.045 * hours(c));
    return Math.max(0, (action + volumeLie - nonAction) * freshness);
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
    const ranked = coins.slice().sort(function (a, b) { return score(b, f) - score(a, f); });
    return diversify(mix(ranked));
  }
  function rankFollowing(coins) {
    const f = follows();
    let pool = coins.filter(function (c) { return isFollowed(c, f); });
    pool.sort(function (a, b) { return hours(a) - hours(b); });
    if (pool.length > 80) pool = pool.slice(0, 80);
    const ranked = pool.sort(function (a, b) { return score(b, f) - score(a, f); });
    return diversify(mix(ranked));
  }
  root.CessionRank = { rankForYou, rankFollowing, followUser, followCoin, follows, hours, score, stage };
})(window);
