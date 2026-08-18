/*
  Cession Pulse ranker — mapped to TikTok FYP public signals.

  TikTok FYP uses: user interactions (watch/skip/follow), item info, then
  diversity + exploration so one creator cannot fill the feed.
  We do not have watch time, so card open, hold, skip, and dwell stand in.

  score = (interest + quality) * freshness * (1 - skipPenalty)
  interest = 4*opens + 6*holds + 5*followsThisItem
  quality  = uniqueTraders + ln(1 + volume24hUsd)
  freshness = e^(-0.05 * hoursOld)     // half-life ~14h
  skipPenalty = min(0.8, 0.2 * skips)

  Mix: 80% top score, 20% exploration of fresher/unseen.
  Diversity: never two in a row from the same creator; max 2 per 8 cards.

  Following retrieval: followed coins UNION coins from followed users.
  If that set is huge, take the 80 freshest, then rank. Same mix + diversity.
*/
(function (root) {
  function hours(c) {
    const t = Date.parse(c.createdAt || c.created || 0);
    return t ? Math.max(0, (Date.now() - t) / 36e5) : 24;
  }
  function signals() {
    try { return JSON.parse(localStorage.getItem('cession_signals') || '{}'); } catch (e) { return {}; }
  }
  function follows() {
    try { return JSON.parse(localStorage.getItem('cession_follows') || '{"users":[],"coins":[]}'); } catch (e) { return { users: [], coins: [] }; }
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
  function isFollowedCoin(c, f) {
    const s = String(c.symbol || '').toUpperCase();
    const creator = String(c.creator || c.owner || '').toLowerCase();
    return f.coins.indexOf(s) >= 0 || (creator && f.users.indexOf(creator) >= 0);
  }
  function score(c, f, sig) {
    const s = String(c.symbol || '').toUpperCase();
    const opens = (sig.opens && sig.opens[s]) || 0;
    const holds = (sig.holds && sig.holds[s]) || 0;
    const skips = (sig.skips && sig.skips[s]) || 0;
    const interest = 4 * opens + 6 * holds + (isFollowedCoin(c, f) ? 5 : 0);
    const quality = Number(c.uniqueTraders || 0) + Math.log(1 + Number(c.volume24hUsd || 0));
    const freshness = Math.exp(-0.05 * hours(c));
    const skipPenalty = Math.min(0.8, 0.2 * skips);
    return (interest + quality) * freshness * (1 - skipPenalty);
  }
  function diversify(list) {
    const out = [];
    const recent = [];
    list.forEach(function (c) {
      const who = String(c.creator || c.symbol || '');
      const sameRow = recent.length && recent[recent.length - 1] === who;
      const inWindow = recent.filter(function (x) { return x === who; }).length >= 2;
      if (sameRow || inWindow) return;
      out.push(c);
      recent.push(who);
      if (recent.length > 8) recent.shift();
    });
    list.forEach(function (c) { if (out.indexOf(c) < 0) out.push(c); });
    return out;
  }
  function mix(ranked) {
    const exploit = ranked.slice();
    const explore = ranked.slice().sort(function (a, b) { return hours(a) - hours(b); });
    const out = [];
    let i = 0, j = 0;
    while (out.length < ranked.length && (i < exploit.length || j < explore.length)) {
      if (out.length % 5 === 4 && j < explore.length) { out.push(explore[j++]); }
      else if (i < exploit.length) { out.push(exploit[i++]); }
      else out.push(explore[j++]);
    }
    const seen = new Set();
    return out.filter(function (c) {
      const k = c.symbol;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  function rankForYou(coins) {
    const f = follows();
    const sig = signals();
    const ranked = coins.slice().sort(function (a, b) { return score(b, f, sig) - score(a, f, sig); });
    return diversify(mix(ranked));
  }
  function rankFollowing(coins) {
    const f = follows();
    const sig = signals();
    let pool = coins.filter(function (c) { return isFollowedCoin(c, f); });
    pool.sort(function (a, b) { return hours(a) - hours(b); });
    if (pool.length > 80) pool = pool.slice(0, 80);
    const ranked = pool.sort(function (a, b) { return score(b, f, sig) - score(a, f, sig); });
    return diversify(mix(ranked));
  }
  root.CessionRank = { rankForYou, rankFollowing, followUser, followCoin, follows, hours, score };
})(window);
