/**
 * Multi-wallet hub — track wallets, on-chain balances only.
 * Active wallet used by Exchange / Xchange / Banking.
 */
(function () {
  'use strict';

  var KEY = 'cession_tracked_wallets';
  var ACTIVE = 'cession_address';

  function loadTracked() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveTracked(list) {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
  }

  function active() {
    return (
      localStorage.getItem(ACTIVE) ||
      (window.walletEngine && (walletEngine.activeAddress || walletEngine.address)) ||
      ''
    ).trim();
  }

  function setActive(addr, kind) {
    if (!addr) return;
    localStorage.setItem(ACTIVE, addr);
    if (kind) localStorage.setItem('cession_wallet_type', kind);
    if (window.walletEngine) {
      walletEngine.activeAddress = addr;
      if (kind) walletEngine.activeWalletType = kind;
      walletEngine.isAuthenticated = true;
      if (walletEngine.renderState) walletEngine.renderState();
    }
    var list = loadTracked();
    if (!list.some(function (w) { return w.address === addr; })) {
      list.push({ address: addr, type: kind || 'unknown', label: short(addr), addedAt: Date.now() });
      saveTracked(list);
    }
    render();
    if (window.CessionPortfolio && CessionPortfolio.refresh) CessionPortfolio.refresh();
  }

  function short(a) {
    if (!a || a.length < 10) return a || '';
    return a.slice(0, 4) + '\u2026' + a.slice(-4);
  }

  async function fetchBalances(address) {
    try {
      var r = await fetch('/api/wallet-balances/' + encodeURIComponent(address) + '/balances');
      var d = await r.json();
      if (!d.ok) return { balances: [], error: d.error };
      return d;
    } catch (e) {
      return { balances: [], error: 'network' };
    }
  }

  function drawMini(canvas, amount) {
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || 280;
    var h = 72;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#9aa7b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, h / 2);
    ctx.lineTo(w - 8, h / 2);
    ctx.stroke();
    ctx.fillStyle = '#6b7a90';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText(amount > 0 ? 'On-chain balance \u00b7 history after first activity' : 'No balance yet', 10, 18);
  }

  async function render() {
    var list = loadTracked();
    var act = active();
    if (act && !list.some(function (w) { return w.address === act; })) {
      list.push({
        address: act,
        type: localStorage.getItem('cession_wallet_type') || 'connected',
        label: short(act),
        addedAt: Date.now()
      });
      saveTracked(list);
    }

    var disc = document.getElementById('walletScreenDisconnected');
    var conn = document.getElementById('walletScreenConnected');
    var addrLine = document.getElementById('walletScreenAddress');
    if (addrLine) addrLine.textContent = act ? act : 'Not connected';
    if (disc) disc.style.display = act ? 'none' : 'block';
    if (conn) conn.style.display = act ? 'block' : 'none';

    var hero = document.getElementById('walletHubHero');
    var cards = document.getElementById('walletHubList');
    var note = document.getElementById('walletHubNote');

    if (!act) {
      if (hero) {
        hero.innerHTML =
          '<div class="cx-baas-sub">Active wallet</div>' +
          '<div class="cx-baas-balance">0</div>' +
          '<div class="cx-baas-sub">Connect Phantom, MetaMask, or Trust to read on-chain balances</div>';
      }
      if (cards) cards.innerHTML = '';
      if (note) note.textContent = 'Cession does not hold balances. Everything is read from your wallets or partner APIs.';
      return;
    }

    if (hero) {
      hero.innerHTML =
        '<div class="cx-baas-sub">Active \u00b7 ' +
        short(act) +
        '</div>' +
        '<div class="cx-baas-balance" id="walletHubTotal">Reading chain\u2026</div>' +
        '<div class="cx-baas-sub" id="walletHubSub">On-chain only \u00b7 never invented</div>' +
        '<canvas id="walletHubChart" height="72" style="width:100%;margin-top:12px"></canvas>';
    }

    var totalNative = 0;
    var lines = [];
    for (var i = 0; i < list.length; i++) {
      var w = list[i];
      var bal = await fetchBalances(w.address);
      var b0 = (bal.balances && bal.balances[0]) || null;
      var amt = b0 ? Number(b0.amount) || 0 : 0;
      if (w.address === act) totalNative = amt;
      lines.push({
        address: w.address,
        type: w.type,
        label: w.label || short(w.address),
        amount: amt,
        symbol: b0 ? b0.symbol : '\u2014',
        active: w.address === act,
        error: bal.error
      });
    }

    var totalEl = document.getElementById('walletHubTotal');
    if (totalEl) {
      var actRow = lines.find(function (x) { return x.active; }) || {};
      totalEl.textContent =
        totalNative > 0
          ? totalNative.toLocaleString(undefined, { maximumFractionDigits: 6 }) + ' ' + (actRow.symbol || '')
          : '0';
    }
    var sub = document.getElementById('walletHubSub');
    if (sub) sub.textContent = 'Native on-chain balance for active wallet';

    drawMini(document.getElementById('walletHubChart'), totalNative);

    if (cards) {
      cards.innerHTML = lines
        .map(function (row) {
          return (
            '<div class="cx-wallet-card' +
            (row.active ? ' on' : '') +
            '">' +
            '<div class="cx-wallet-card-top">' +
            '<strong>' +
            row.label +
            '</strong>' +
            '<span class="cx-muted">' +
            (row.type || '') +
            (row.active ? ' \u00b7 active' : '') +
            '</span></div>' +
            '<div class="cx-wallet-card-bal">' +
            (row.error ? '\u2014' : row.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })) +
            ' <small>' +
            (row.symbol || '') +
            '</small></div>' +
            '<div class="cx-wallet-card-addr">' +
            row.address +
            '</div>' +
            '<div class="cx-baas-row" style="margin-top:10px">' +
            (row.active
              ? '<button type="button" class="ghost" disabled>Active</button>'
              : '<button type="button" class="primary" data-set-active="' +
                row.address +
                '">Use</button>') +
            '<button type="button" class="ghost" data-remove-wallet="' +
            row.address +
            '">Remove</button>' +
            '</div></div>'
          );
        })
        .join('');

      cards.querySelectorAll('[data-set-active]').forEach(function (btn) {
        btn.onclick = function () {
          setActive(btn.getAttribute('data-set-active'));
        };
      });
      cards.querySelectorAll('[data-remove-wallet]').forEach(function (btn) {
        btn.onclick = function () {
          var addr = btn.getAttribute('data-remove-wallet');
          var next = loadTracked().filter(function (w) { return w.address !== addr; });
          saveTracked(next);
          if (active() === addr) {
            localStorage.removeItem(ACTIVE);
            if (window.walletEngine) {
              walletEngine.activeAddress = '';
              walletEngine.isAuthenticated = false;
            }
          }
          render();
        };
      });
    }

    if (note) {
      note.textContent =
        'Buy on Exchange / Xchange \u2192 assets land in the active wallet. Sell \u2192 partner payout or card when BaaS is live. Cession never holds funds.';
    }
  }

  function go() {
    document.querySelectorAll('.page-view').forEach(function (el) {
      el.classList.remove('active');
      el.style.setProperty('display', 'none', 'important');
    });
    var v = document.getElementById('viewWallet');
    if (v) {
      v.classList.add('active');
      v.style.setProperty('display', 'block', 'important');
    }
    document.querySelectorAll('.bottom-nav-slot').forEach(function (t) {
      t.classList.remove('active');
    });
    var b = document.getElementById('bnavWallet');
    if (b) b.classList.add('active');
    document.title = 'Wallet | Cession';
    render();
  }

  window.CessionWalletHub = {
    go: go,
    render: render,
    setActive: setActive,
    active: active,
    tracked: loadTracked
  };

  document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener(
      'click',
      function (e) {
        var t = e.target && e.target.closest && e.target.closest('#bnavWallet');
        if (t) {
          e.preventDefault();
          e.stopPropagation();
          go();
        }
      },
      true
    );
    setTimeout(function () {
      var a = active();
      if (a) setActive(a, localStorage.getItem('cession_wallet_type'));
    }, 400);
  });
})();
