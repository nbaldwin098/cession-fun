/**
 * Live watchlist — Binance public WebSocket + REST.
 */
(function () {
  'use strict';

  var MAP = [
    { show: 'BTC', bin: 'btcusdt' },
    { show: 'ETH', bin: 'ethusdt' },
    { show: 'SOL', bin: 'solusdt' },
    { show: 'XRP', bin: 'xrpusdt' },
    { show: 'DOGE', bin: 'dogeusdt' },
    { show: 'LINK', bin: 'linkusdt' },
    { show: 'AVAX', bin: 'avaxusdt' },
    { show: 'ADA', bin: 'adausdt' },
    { show: 'DOT', bin: 'dotusdt' },
    { show: 'LTC', bin: 'ltcusdt' },
    { show: 'BCH', bin: 'bchusdt' },
    { show: 'UNI', bin: 'uniusdt' },
    { show: 'AAVE', bin: 'aaveusdt' },
    { show: 'ATOM', bin: 'atomusdt' },
    { show: 'NEAR', bin: 'nearusdt' },
    { show: 'BNB', bin: 'bnbusdt' },
    { show: 'PEPE', bin: 'pepeusdt' },
    { show: 'SUI', bin: 'suiusdt' },
    { show: 'APT', bin: 'aptusdt' },
    { show: 'ARB', bin: 'arbusdt' }
  ];

  var DEFAULT = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'LINK', 'AVAX', 'ADA'];
  var KEY = 'cession_watchlist_bin_v1';
  var prices = {};
  var ws = null;
  var reconnectTimer = null;
  var byBin = {};
  MAP.forEach(function (m) { byBin[m.bin] = m.show; });

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
    if (n >= 0.01) return Number(n).toFixed(4);
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

  function setPrice(show, price, changePct) {
    if (!isFinite(price)) return;
    var prev = prices[show] && prices[show].price;
    prices[show] = {
      symbol: show,
      price: price,
      change24h: isFinite(changePct) ? changePct : (prices[show] && prices[show].change24h),
      lastUpdate: Date.now(),
      flash: prev != null && prev !== price
    };
    render();
    renderStrip();
  }

  function streamUrl() {
    var streams = MAP.map(function (m) { return m.bin + '@ticker'; }).join('/');
    return 'wss://stream.binance.com:9443/stream?streams=' + streams;
  }

  function connectWs() {
    try {
      if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
      ws = new WebSocket(streamUrl());
      ws.onmessage = function (ev) {
        try {
          var msg = JSON.parse(ev.data);
          var d = msg.data || msg;
          if (!d || !d.s) return;
          var show = byBin[String(d.s).toLowerCase()];
          if (!show) return;
          setPrice(show, parseFloat(d.c), parseFloat(d.P));
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
    try {
      var r = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!r.ok) throw new Error('binance rest');
      var all = await r.json();
      var want = {};
      MAP.forEach(function (m) { want[m.bin.toUpperCase()] = m.show; });
      all.forEach(function (row) {
        var show = want[row.symbol];
        if (!show) return;
        setPrice(show, parseFloat(row.lastPrice), parseFloat(row.priceChangePercent));
      });
      return;
    } catch (e) {}
    for (var i = 0; i < MAP.length; i++) {
      var m = MAP[i];
      try {
        var r2 = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=' + m.bin.toUpperCase());
        if (!r2.ok) continue;
        var d = await r2.json();
        setPrice(m.show, parseFloat(d.price));
      } catch (err) {}
    }
  }

  function render() {
    var box = document.getElementById('searchResults');
    if (!box) return;
    var q = ((document.getElementById('searchInput') || {}).value || '').toUpperCase().trim();
    var list = loadList();
    var html = '<p class="cx-muted" style="padding:8px 4px;font-size:12px">Live · Binance</p>';
    list.forEach(function (sym) {
      var t = prices[sym];
      if (q && sym.indexOf(q) < 0) return;
      var chg = t && isFinite(t.change24h)
        ? ' <span class="cx-pf-delta ' + (t.change24h < 0 ? 'down' : 'up') + '" style="font-size:12px">' +
          (t.change24h >= 0 ? '+' : '') + t.change24h.toFixed(2) + '%</span>'
        : '';
      html +=
        '<div class="cx-search-row"><div><strong>' + sym + '</strong></div>' +
        '<div class="cx-search-price">$' + fmt(t && t.price) + chg + '</div></div>';
    });
    if (q) {
      MAP.forEach(function (m) {
        if (list.indexOf(m.show) >= 0) return;
        if (m.show.indexOf(q) < 0) return;
        var t = prices[m.show];
        html +=
          '<div class="cx-search-row" data-add="' + m.show + '" style="cursor:pointer">' +
          '<div><strong>' + m.show + '</strong><span class="cx-muted"> Add</span></div>' +
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
        return '<div class="cx-mkt-chip"><span>' + sym + '</span><strong>$' + fmt(t && t.price) + '</strong></div>';
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
    setInterval(function () {
      if (!ws || ws.readyState !== 1) bootstrapRest();
    }, 20000);
  }

  window.CessionSearch = { open: openModal, close: closeModal, load: bootstrapRest, refresh: bootstrapRest };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
