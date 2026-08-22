/**
 * Multi-wallet hub + Assets (on-chain native + SPL + Xchange holdings).
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
    paintActiveStrip();
    render();
    if (window.CessionPortfolio && CessionPortfolio.refresh) CessionPortfolio.refresh();
    if (window.CessionBaas && CessionBaas.refresh) CessionBaas.refresh();
  }

  function short(a) {
    if (!a || a.length < 10) return a || '';
    return a.slice(0, 4) + '\u2026' + a.slice(-4);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }

  function paintActiveStrip() {
    var a = active();
    document.querySelectorAll('[data-active-wallet]').forEach(function (el) {
      el.textContent = a ? short(a) : 'No wallet';
    });
    document.querySelectorAll('[data-active-wallet-full]').forEach(function (el) {
      el.textContent = a || 'Connect a wallet';
    });
  }

  async function fetchBalances(address) {
    try {
      var r = await fetch('/api/wallet-balances/' + encodeURIComponent(address) + '/balances');
      var d = await r.json();
      if (!d.ok) return { balances: [] };
      return d;
    } catch (e) {
      return { balances: [] };
    }
  }

  async function fetchXchangeAssets(address) {
    try {
      var r = await fetch('/api/wallets/' + encodeURIComponent(address) + '/trades');
      var d = await r.json();
      var trades = (d && d.trades) || [];
      var map = {};
      trades.forEach(function (t) {
        var key = String(t.mint || t.symbol || t.token || 'TOKEN').toUpperCase();
        if (!map[key]) {
          map[key] = {
            symbol: t.symbol || key,
            mint: t.mint || t.mintAddress || '',
            amount: 0,
            source: 'xchange'
          };
        }
        var side = String(t.side || t.type || '').toLowerCase();
        var qty = Number(t.tokenAmount || t.amount || t.tokens || 0);
        if (!qty && t.solAmount) qty = Math.abs(Number(t.solAmount));
        if (side === 'buy' || side === 'purchase') map[key].amount += Math.abs(qty);
        else if (side === 'sell') map[key].amount -= Math.abs(qty);
        else map[key].amount += qty;
      });
      return Object.keys(map)
        .map(function (k) { return map[k]; })
        .filter(function (a) { return Math.abs(a.amount) > 1e-12; })
        .sort(function (a, b) { return Math.abs(b.amount) - Math.abs(a.amount); });
    } catch (e) {
      return [];
    }
  }

  function drawMini(canvas) {
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || 280;
    var h = 72;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#c5ced9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, h / 2);
    ctx.lineTo(w - 8, h / 2);
    ctx.stroke();
  }

  function renderAssets(assets) {
    var box = document.getElementById('walletAssetsList');
    if (!box) return;
    if (!assets.length) {
      box.innerHTML = '<p class="cx-muted" style="padding:12px 16px">No assets yet.</p>';
      return;
    }
    box.innerHTML = assets
      .map(function (a) {
        var amt = Number(a.amount) || 0;
        var label = a.symbol || 'Asset';
        var tag =
          a.source === 'xchange'
            ? 'Xchange'
            : a.source === 'solana_token_account'
            ? 'SPL'
            : a.source === 'solana_rpc' || a.source === 'eth_rpc' || a.source === 'chain'
            ? 'Wallet'
            : '';
        return (
          '<div class="cx-asset-row">' +
          '<div class="left">' +
          '<span class="title">' +
          esc(label) +
          '</span>' +
          (tag ? '<span class="sub">' + tag + '</span>' : '') +
          (a.mint ? '<span class="sub" style="text-transform:none">' + esc(short(a.mint)) + '</span>' : '') +
          '</div>' +
          '<div class="amt">' +
          amt.toLocaleString(undefined, { maximumFractionDigits: 6 }) +
          '</div></div>'
        );
      })
      .join('');
  }

  async function render() {
    paintActiveStrip();
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

    if (!act) {
      if (hero) {
        hero.innerHTML =
          '<div class="cx-baas-sub">Active wallet</div>' +
          '<div class="cx-baas-balance">0</div>' +
          '<div class="cx-baas-sub">Connect Phantom, MetaMask, or Trust</div>';
      }
      if (cards) cards.innerHTML = '';
      renderAssets([]);
      return;
    }

    if (hero) {
      hero.innerHTML =
        '<div class="cx-baas-sub">Active \u00b7 ' +
        short(act) +
        '</div>' +
        '<div class="cx-baas-balance" id="walletHubTotal">\u2026</div>' +
        '<div class="cx-baas-sub" id="walletHubSub">Primary balance</div>' +
        '<canvas id="walletHubChart" height="72" style="width:100%;margin-top:12px"></canvas>';
    }

    var native = await fetchBalances(act);
    var bals = native.balances || [];
    var b0 = bals[0] || null;
    var nativeAmt = b0 ? Number(b0.amount) || 0 : 0;
    var nativeSym = b0 ? b0.symbol : '';

    var totalEl = document.getElementById('walletHubTotal');
    if (totalEl) {
      totalEl.textContent =
        nativeAmt > 0
          ? nativeAmt.toLocaleString(undefined, { maximumFractionDigits: 6 }) + (nativeSym ? ' ' + nativeSym : '')
          : '0' + (nativeSym ? ' ' + nativeSym : '');
    }

    drawMini(document.getElementById('walletHubChart'));

    var xAssets = await fetchXchangeAssets(act);
    var assets = [];
    bals.forEach(function (b) {
      assets.push({
        symbol: b.symbol,
        amount: Number(b.amount) || 0,
        mint: b.mint || '',
        source: b.source || 'chain'
      });
    });
    xAssets.forEach(function (x) {
      var exists = assets.some(function (a) {
        return a.mint && x.mint && a.mint === x.mint;
      });
      if (!exists) assets.push(x);
    });
    renderAssets(assets);

    var lines = [];
    for (var i = 0; i < list.length; i++) {
      var w = list[i];
      var bal = w.address === act ? native : await fetchBalances(w.address);
      var bx = (bal.balances && bal.balances[0]) || null;
      var amt = bx ? Number(bx.amount) || 0 : 0;
      lines.push({
        address: w.address,
        type: w.type,
        label: w.label || short(w.address),
        amount: amt,
        symbol: bx ? bx.symbol : '',
        active: w.address === act
      });
    }

    if (cards) {
      cards.innerHTML = lines
        .map(function (row) {
          return (
            '<div class="cx-wallet-card' +
            (row.active ? ' on' : '') +
            '">' +
            '<div class="cx-wallet-card-top">' +
            '<strong>' +
            esc(row.label) +
            '</strong>' +
            '<span class="cx-muted">' +
            esc(row.type || '') +
            (row.active ? ' \u00b7 active' : '') +
            '</span></div>' +
            '<div class="cx-wallet-card-bal">' +
            row.amount.toLocaleString(undefined, { maximumFractionDigits: 6 }) +
            ' <small>' +
            esc(row.symbol || '') +
            '</small></div>' +
            '<div class="cx-wallet-card-addr">' +
            esc(row.address) +
            '</div>' +
            '<div class="cx-baas-row" style="margin-top:10px">' +
            (row.active
              ? '<button type="button" class="ghost" disabled>Active</button>'
              : '<button type="button" class="primary" data-set-active="' +
                esc(row.address) +
                '">Use</button>') +
            '<button type="button" class="ghost" data-remove-wallet="' +
            esc(row.address) +
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
          var next = loadTracked().filter(function (w) {
            return w.address !== addr;
          });
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
    tracked: loadTracked,
    paintActiveStrip: paintActiveStrip
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
    paintActiveStrip();
    setTimeout(function () {
      var a = active();
      if (a) setActive(a, localStorage.getItem('cession_wallet_type'));
    }, 400);
  });
})();
