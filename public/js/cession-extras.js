(function () {
  ['css/header-line.css', 'css/page-pad.css', 'css/gate.css'].forEach(function (href) {
    var line = document.createElement('link');
    line.rel = 'stylesheet';
    line.href = href;
    document.head.appendChild(line);
  });
  ['js/cession-gate.js', 'js/cession-wallet-create.js', 'js/cession-wallet-fix.js', 'js/cession-user-lock.js', 'js/cession-perps-gate.js', 'js/cession-header-perps.js', 'js/cession-fees.js', 'js/cession-earn.js', 'js/cession-buttons.js'].forEach(function (src) {
    var s = document.createElement('script');
    s.src = src;
    document.head.appendChild(s);
  });
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
      if (ui.openCoin) ui.openCoin(coin);
      if (ui.openTrade) ui.openTrade('buy');
    };
    const prevGo = ui.go;
    ui.go = function (name) {
      if (prevGo) prevGo(name);
      if (name === 'home') paintForYou();
    };
    paintForYou();
  });
})();
