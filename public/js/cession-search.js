/**
 * Live watchlist — Coinbase Exchange public WebSocket in the browser.
 */
(function () {
  'use strict';

  var PRODUCTS = [
    'BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD', 'LINK-USD',
    'AVAX-USD', 'ADA-USD', 'DOT-USD', 'LTC-USD', 'BCH-USD', 'UNI-USD',
    'AAVE-USD', 'ATOM-USD', 'NEAR-USD'
  ];
  var DEFAULT = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD', 'LINK-USD', 'AVAX-USD', 'ADA-USD'];
  var KEY = 'cession_watchlist_v1';
  var prices = {};
  var ws = null;
  var reconnectTimer = null;

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

  function fmt(n) {
    if (n == null || !isFinite(n)) return '—';
    if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (n >= 1) return Number(n).toFixed(2);
    return Number(n).toPrecision(4);
  }

  function openModal() {
    var m = document.getElementById('searchModal');
    if (m) m.classList.add('open');
    render();
    var inp = document.getElementById('searchInput');
    if (inp) setTimeout(function () { inp.focus(); }, 40);
  }

  function closeModal() {
    var m = document.getElementById('searchModal');
    if (m) m.classList.remove('open');
  }

  function setPrice(sym, price, vol) {
    if (!isFinite(price)) return;
    var prev = prices[sym] && prices[sym].price;
    prices[sym] = {
      symbol: sym,
      price: price,
      volume24h: vol || (prices[sym] && prices[sym].volume24h) || null,
      lastUpdate: Date.now(),
      flash: prev != null && prev !== price
    };
    render();
    renderStrip();
  }

  function connectWs() {
    try {
      if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
      ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
      ws.onopen = function () {
        ws.send(JSON.stringify({
          type: 'subscribe',
          product_ids: PRODUCTS,
          channels: ['ticker']
        }));
      };
      ws.onmessage = function (ev) {
        try {
          var msg = JSON.parse(ev.data);
          if (msg.type === 'ticker' && msg.product_id && msg.price) {
            setPrice(msg.product_id, parseFloat(msg.price), parseFloat(msg.volume_24h || 0));
          }
        } catch (e) {}
      };
      ws.onclose = function () {
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWs, 3000);
      };
      ws.onerror = function () {
        try { ws.close(); } catch (e) {}
      };
    } catch (e) {}
  }

  async function bootstrapRest() {
    for (var i = 0; i < PRODUCTS.length; i++) {
      var sym = PRODUCTS[i];
      try {
        var r = await fetch('https://api.exchange.coinbase.com/products/' + sym + '/ticker');
        if (!r.ok) continue;
        var d = await r.json();
        setPrice(sym, parseFloat(d.price), parseFloat(d.volume || 0));
      } catch (e) {}
    }
  }

  function render() {
    var box = document.getElementById('searchResults');
    if (!box) return;
    var q = ((document.getElementById('searchInput') || {}).value || '').toUpperCase().trim();
    var list = loadList();
    var html = '<p class="cx-muted" style="padding:8px 4px;font-size:12px">Live · Coinbase ticker</p>';
    list.forEach(function (sym) {
      var t = prices[sym];
      if (q && sym.indexOf(q) < 0) return;
      var base = sym.replace('-USD', '');
      html +=
        '<div class="cx-search-row' + (t && t.flash ? ' cx-flash' : '') + '">' +
        '<div><strong>' + base + '</strong><span class="cx-muted"> ' + sym + '</span></div>' +
        '<div class="cx-search-price">$' + fmt(t && t.price) + '</div></div>';
      if (t) t.flash = false;
    });
    if (q) {
      PRODUCTS.forEach(function (sym) {
        if (list.indexOf(sym) >= 0) return;
        if (sym.indexOf(q) < 0) return;
        var t = prices[sym];
        html +=
          '<div class="cx-search-row" data-add="' + sym + '" style="cursor:pointer">' +
          '<div><strong>' + sym.replace('-USD', '') + '</strong><span class="cx-muted"> Add</span></div>' +
          '<div class="cx-search-price">$' + fmt(t && t.price) + '</div></div>';
      });
    }
    box.innerHTML = html;
    box.querySelectorAll('[data-add]').forEach(function (el) {
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
        var t = prices[sym];
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
    bootstrapRest().then(connectWs);
    setInterval(bootstrapRest, 15000);
  }

  window.CessionSearch = { open: openModal, close: closeModal, load: bootstrapRest, refresh: bootstrapRest };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
