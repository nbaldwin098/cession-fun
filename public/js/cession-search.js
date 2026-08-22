/**
 * Watchlist + markets — one real price source: Coinbase via /api/market/tickers
 */
(function () {
  'use strict';

  var DEFAULT = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD', 'LINK-USD', 'AVAX-USD', 'ADA-USD'];
  var KEY = 'cession_watchlist_v1';
  var cache = {};

  function loadList() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch (e) {}
    return DEFAULT.slice();
  }

  function saveList(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function openModal() {
    var m = document.getElementById('searchModal');
    if (m) m.classList.add('open');
    refresh();
    var inp = document.getElementById('searchInput');
    if (inp) setTimeout(function () { inp.focus(); }, 40);
  }

  function closeModal() {
    var m = document.getElementById('searchModal');
    if (m) m.classList.remove('open');
  }

  function fmt(n) {
    if (n == null || !isFinite(n)) return '—';
    if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (n >= 1) return Number(n).toFixed(2);
    return Number(n).toPrecision(4);
  }

  function fmtChg(n) {
    if (n == null || !isFinite(n)) return '';
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  async function refresh() {
    try {
      var r = await fetch('/api/market/tickers', { headers: { Accept: 'application/json' } });
      var d = await r.json();
      if (!d || !d.tickers) return;
      cache = {};
      d.tickers.forEach(function (t) {
        if (t && t.symbol) cache[t.symbol] = t;
      });
      render();
      renderStrip();
    } catch (e) {}
  }

  function render() {
    var box = document.getElementById('searchResults');
    if (!box) return;
    var q = ((document.getElementById('searchInput') || {}).value || '').toUpperCase().trim();
    var list = loadList();
    var html = '<p class="cx-muted" style="padding:8px 4px;font-size:12px">Live · Coinbase Exchange</p>';
    list.forEach(function (sym) {
      var t = cache[sym];
      if (q && sym.indexOf(q) < 0) return;
      var base = sym.replace('-USD', '');
      var chg = t && t.change24h != null ? fmtChg(t.change24h) : '';
      var chgCls = t && t.change24h != null && t.change24h < 0 ? 'down' : 'up';
      html +=
        '<div class="cx-search-row"><div><strong>' + base + '</strong><span class="cx-muted"> ' + sym +
        '</span></div><div class="cx-search-price">$' + fmt(t && t.price) +
        (chg ? ' <span class="cx-pf-delta ' + chgCls + '" style="font-size:12px">' + chg + '</span>' : '') +
        '</div></div>';
    });
    if (q) {
      Object.keys(cache).forEach(function (sym) {
        if (list.indexOf(sym) >= 0) return;
        if (sym.indexOf(q) < 0) return;
        var t = cache[sym];
        html +=
          '<div class="cx-search-row" data-add="' + sym + '"><div><strong>' + sym.replace('-USD', '') +
          '</strong><span class="cx-muted"> Add</span></div><div class="cx-search-price">$' +
          fmt(t && t.price) + '</div></div>';
      });
    }
    box.innerHTML = html;
    box.querySelectorAll('[data-add]').forEach(function (el) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', function () {
        var sym = el.getAttribute('data-add');
        var list = loadList();
        if (list.indexOf(sym) < 0) {
          list.push(sym);
          saveList(list);
          render();
        }
      });
    });
  }

  function renderStrip() {
    var el = document.getElementById('exchangeMarketsStrip');
    if (!el) return;
    el.innerHTML = loadList()
      .slice(0, 5)
      .map(function (sym) {
        var t = cache[sym];
        return '<div class="cx-mkt-chip"><span>' + sym.replace('-USD', '') + '</span><strong>$' + fmt(t && t.price) + '</strong></div>';
      })
      .join('');
  }

  function bind() {
    var inp = document.getElementById('searchInput');
    if (inp && !inp._bound) {
      inp._bound = true;
      inp.addEventListener('input', render);
    }
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute('data-close-sheet') === 'searchModal') closeModal();
    });
    refresh();
    setInterval(refresh, 5000);
  }

  window.CessionSearch = { open: openModal, close: closeModal, load: refresh, refresh: refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
