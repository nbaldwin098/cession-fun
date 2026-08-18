(function () {
  var lock = document.createElement('script');
  lock.src = 'js/cession-user-lock.js';
  document.head.appendChild(lock);
  function ready(fn) {
    if (!window.CessionUI || !window.CessionRank || !window.CessionMedia || !window.CessionEngine) {
      return setTimeout(function () { ready(fn); }, 40);
    }
    fn();
  }
  function mediaUrl(c) { return c.mediaUrl || c.videoUrl || c.imageUrl || c.image || ''; }
  function card(c) {
    const url = mediaUrl(c);
    const chg = Number(c.change24h || 0);
    const payload = { symbol: c.symbol, name: c.name || c.symbol, mint: c.mintAddress || c.mint || '', creator: c.creator || '', mediaUrl: url };
    const p = JSON.stringify(payload);
    const why = c._why || (window.CessionEngine ? CessionEngine.why(c) : '');
    const size = window.CessionEngine ? CessionEngine.tapSize() : 0.05;
    return '<div class="cx-card-coin" data-symbol="' + c.symbol + '">' +
      '<button type="button" class="cx-card-hit" onclick=\'CessionUI.openCoin(' + p + ')\'>' +
      CessionMedia.cardHtml(url, c.symbol) +
      '<div class="meta"><div class="name">' + (c.name || c.symbol) + '</div><div class="tick">' + c.symbol +
      (chg ? (' ' + (chg > 0 ? '+' : '') + chg.toFixed(1) + '%') : '') +
      '</div></div></button>' +
      (why ? '<div class="cx-why">' + why + '</div>' : '') +
      '<button type="button" class="cx-tap" onclick=\'CessionUI.quickBuy(' + p + ')\'>Buy ' + size + ' SOL</button></div>';
  }
  function empty(t, s) { return '<div class="cx-empty"><h2>' + t + '</h2><p class="cx-muted">' + s + '</p></div>'; }
  function ad() { return '<div class="cx-ad">Skip, watch, or tap buy. The next card already knows.</div>'; }
  async function live() {
    try {
      const r = await fetch('/api/pulse?lane=all&limit=80');
      const d = await r.json();
      return (d.feed || []).filter(function (c) {
        const s = String(c.symbol || '').toUpperCase();
        return String(c.mintAddress || c.mint || '').length >= 32 && !/TEST|DEMO|TDOGE|QPEPE|BDOGE/.test(s);
      });
    } catch (e) { return []; }
  }
  async function paintFollowing() {
    const grid = document.getElementById('forYouCoinsGrid');
    if (!grid) return;
    const f = CessionRank.follows();
    const coins = CessionRank.rankFollowing(await live());
    const head = '<div class="cx-ad">Following ' + f.users.length + ' wallets and ' + f.coins.length + ' coins.</div>';
    if (!f.users.length && !f.coins.length) {
      grid.innerHTML = head + empty('Following', 'Follow a coin or a wallet.');
      return;
    }
    if (!coins.length) {
      grid.innerHTML = head + empty('No live followed coins', 'Followed wallets have no live coins yet.');
      return;
    }
    const parts = [head];
    coins.forEach(function (c, i) { if (i && i % 6 === 0) parts.push(ad()); parts.push(card(c)); });
    grid.innerHTML = parts.join('');
  }
  async function paintForYou() {
    const grid = document.getElementById('forYouCoinsGrid');
    if (!grid) return;
    const coins = CessionEngine.assemble(await live());
    const parts = [ad()];
    if (!coins.length) parts.push(empty('No live coins yet.', 'Be the first to add a coin.'));
    coins.forEach(function (c, i) { if (i && i % 6 === 0) parts.push(ad()); parts.push(card(c)); });
    grid.innerHTML = parts.join('');
  }
  ready(function () {
    const ui = window.CessionUI;
    ui.quickBuy = function (coin) {
      if (window.CessionEngine) CessionEngine.learn(coin, 'buy');
      if (ui.openCoin) ui.openCoin(coin);
      if (ui.openTrade) ui.openTrade('buy');
    };
    const prevLane = ui.setHomeLane;
    ui.setHomeLane = function (lane) {
      if (prevLane) prevLane(lane);
      if (lane === 'following') paintFollowing();
      else paintForYou();
    };
    const prevGo = ui.go;
    ui.go = function (name) {
      if (window.CessionTrack) CessionTrack.leave();
      if (prevGo) prevGo(name);
      if (name === 'home') paintForYou();
    };
    const prevOpen = ui.openCoin;
    ui.openCoin = function (coin) {
      if (window.CessionEngine) CessionEngine.learn(coin, 'dwell');
      if (window.CessionTrack) CessionTrack.open(coin.symbol);
      if (prevOpen) prevOpen(coin);
      const title = document.getElementById('coinTitle');
      let stage = document.getElementById('coinMedia');
      if (title && !stage) {
        stage = document.createElement('div');
        stage.id = 'coinMedia';
        title.parentNode.insertBefore(stage, title.nextSibling);
      }
      if (stage) stage.innerHTML = CessionMedia.pageHtml(coin.mediaUrl || '', coin.symbol);
      const meta = document.getElementById('coinMeta');
      if (!meta) return;
      let bar = document.getElementById('followBar');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'followBar';
        meta.parentNode.insertBefore(bar, meta.nextSibling);
      }
      bar.innerHTML = '<button class="cx-ghost" type="button" id="followCoinBtn">Follow coin</button><button class="cx-ghost" type="button" id="followUserBtn">Follow wallet</button>';
      document.getElementById('followCoinBtn').onclick = function () {
        CessionRank.followCoin(coin.symbol);
        CessionEngine.learn(coin, 'follow');
        if (window.CessionTrack) CessionTrack.emit('follow', coin.symbol, 0);
      };
      document.getElementById('followUserBtn').onclick = function () {
        CessionRank.followUser(String(coin.creator || '').toLowerCase());
      };
    };
    ui.copyReferral = function () {
      const addr = localStorage.getItem('cession_address') || 'cession';
      const url = location.origin + '/r/' + encodeURIComponent(addr.slice(0, 8));
      if (navigator.clipboard) navigator.clipboard.writeText(url);
      alert(url);
    };
    const fee = document.getElementById('tradeFeeLine');
    const oldTrade = ui.openTrade;
    ui.openTrade = function (side) {
      if (oldTrade) oldTrade(side);
      if (fee) fee.style.display = side === 'buy' ? 'block' : 'none';
    };
    paintForYou();
  });
})();
