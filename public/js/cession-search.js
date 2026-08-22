/**
 * Header search → live market list via Coinbase Exchange public API (no key).
 */
(function () {
  'use strict';

  var PAIRS = [
    { id: 'BTC-USD', name: 'Bitcoin', sym: 'BTC' },
    { id: 'ETH-USD', name: 'Ethereum', sym: 'ETH' },
    { id: 'SOL-USD', name: 'Solana', sym: 'SOL' },
    { id: 'XRP-USD', name: 'XRP', sym: 'XRP' },
    { id: 'DOGE-USD', name: 'Dogecoin', sym: 'DOGE' },
    { id: 'LINK-USD', name: 'Chainlink', sym: 'LINK' },
    { id: 'AVAX-USD', name: 'Avalanche', sym: 'AVAX' },
    { id: 'ADA-USD', name: 'Cardano', sym: 'ADA' },
    { id: 'MATIC-USD', name: 'Polygon', sym: 'MATIC' },
    { id: 'DOT-USD', name: 'Polkadot', sym: 'DOT' }
  ];

  var cache = {};
  var lastFetch = 0;

  function openModal() {
    var m = document.getElementById('searchModal');
    if (m) m.classList.add('open');
    load();
    var inp = document.getElementById('searchInput');
    if (inp) {
      inp.value = '';
      setTimeout(function () { inp.focus(); }, 50);
    }
  }

  function closeModal() {
    var m = document.getElementById('searchModal');
    if (m) m.classList.remove('open');
  }

  async function fetchTicker(id) {
    try {
      var r = await fetch('https://api.exchange.coinbase.com/products/' + id + '/ticker', {
        headers: { Accept: 'application/json' }
      });
      if (!r.ok) return null;
      var d = await r.json();
      return { price: Number(d.price || 0), time: d.time };
    } catch (e) {
      return null;
    }
  }

  async function load() {
    var box = document.getElementById('searchResults');
    var strip = document.getElementById('exchangeMarketsStrip');
    if (box) box.innerHTML = '<p class="cx-muted" style="padding:12px">Loading markets…</p>';

    var now = Date.now();
    if (now - lastFetch > 15000 || !Object.keys(cache).length) {
      for (var i = 0; i < PAIRS.length; i++) {
        var t = await fetchTicker(PAIRS[i].id);
        if (t) cache[PAIRS[i].id] = t;
      }
      lastFetch = Date.now();
    }

    renderList(box, '');
    renderStrip(strip);
  }

  function fmt(n) {
    if (!n || !isFinite(n)) return '—';
    if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (n >= 1) return n.toFixed(2);
    return n.toPrecision(4);
  }

  function renderList(box, q) {
    if (!box) return;
    q = (q || '').toLowerCase().trim();
    var html = '';
    PAIRS.forEach(function (p) {
      if (q && p.name.toLowerCase().indexOf(q) < 0 && p.sym.toLowerCase().indexOf(q) < 0) return;
      var t = cache[p.id];
      html +=
        '<div class="cx-search-row">' +
        '<div><strong>' + p.sym + '</strong><span class="cx-muted"> ' + p.name + '</span></div>' +
        '<div class="cx-search-price">$' + fmt(t && t.price) + '</div></div>';
    });
    box.innerHTML = html || '<p class="cx-muted" style="padding:12px">No matches</p>';
  }

  function renderStrip(el) {
    if (!el) return;
    el.innerHTML = PAIRS.slice(0, 4)
      .map(function (p) {
        var t = cache[p.id];
        return '<div class="cx-mkt-chip"><span>' + p.sym + '</span><strong>$' + fmt(t && t.price) + '</strong></div>';
      })
      .join('');
  }

  function bind() {
    var inp = document.getElementById('searchInput');
    if (inp && !inp._bound) {
      inp._bound = true;
      inp.addEventListener('input', function () {
        renderList(document.getElementById('searchResults'), inp.value);
      });
    }
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute('data-close-sheet') === 'searchModal') closeModal();
    });
    load();
    setInterval(function () {
      if (document.getElementById('exchangeMarketsStrip')) load();
    }, 60000);
  }

  window.CessionSearch = { open: openModal, close: closeModal, load: load };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
