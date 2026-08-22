/**
 * Xchange hub — Game (real coin buys) · Create · Fuse · Exposure (rights only)
 */
(function () {
  function $(id) { return document.getElementById(id); }

  function showLane(lane) {
    document.querySelectorAll('.cx-xch-lane').forEach(function (el) {
      el.classList.toggle('on', el.getAttribute('data-lane') === lane);
    });
    document.querySelectorAll('.cx-xch-panel').forEach(function (el) {
      el.style.display = el.getAttribute('data-panel') === lane ? 'block' : 'none';
    });
    if (lane === 'feed') {
      var mount = $('xchFeedMount');
      var grid = $('forYouCoinsGrid');
      if (mount && grid && grid.parentElement !== mount) mount.appendChild(grid);
      if (window.CessionUI && CessionUI.setHomeLane) CessionUI.setHomeLane('foryou');
    }
    if (lane === 'fuse' && window.CessionFuse) CessionFuse.show();
    if (lane === 'exposure') loadExposure();
  }

  function addr() {
    return (window.walletEngine && (window.walletEngine.activeAddress || window.walletEngine.address))
      || localStorage.getItem('cession_address') || '';
  }

  async function loadExposure() {
    var box = $('xchExposureList');
    if (!box) return;
    var w = addr();
    if (!w) {
      box.innerHTML = '<p class="cx-muted">Connect a wallet to view synthetic exposure positions.</p>';
      return;
    }
    try {
      var r = await fetch('/api/caas/exposure?wallet=' + encodeURIComponent(w));
      var d = await r.json();
      var rows = (d.positions || []).map(function (p) {
        return '<div class="cx-baas-item"><div class="left"><span class="title">' + p.symbol + ' · ' + p.leverage + 'x ' + p.side +
          '</span><span class="sub">Margin $' + p.marginUsd + ' · Notional $' + p.notionalUsd + ' · ' + p.status +
          '</span></div><button type="button" class="cx-ghost" onclick="CessionXchange.closeExposure(\'' + p.id + '\')">Close</button></div>';
      }).join('') || '<p class="cx-muted">No open exposure positions.</p>';
      box.innerHTML = rows;
    } catch (e) {
      box.innerHTML = '<p class="cx-muted">Could not load exposure.</p>';
    }
  }

  async function openExposure() {
    var w = addr();
    if (!w) {
      if (window.CessionUI) CessionUI.open('walletModal');
      return;
    }
    var symbol = ($('xchExpSymbol') && $('xchExpSymbol').value) || 'SOL';
    var margin = Number($('xchExpMargin') && $('xchExpMargin').value) || 10;
    var lev = Number($('xchExpLev') && $('xchExpLev').value) || 5;
    var side = ($('xchExpSide') && $('xchExpSide').value) || 'long';
    try {
      var r = await fetch('/api/caas/exposure/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: w, walletAddress: w, symbol: symbol, marginUsd: margin, leverage: lev, side: side })
      });
      var d = await r.json();
      if (!d.ok) return alert(d.error || 'Could not open exposure');
      alert('Opened synthetic exposure (demo). You do NOT own the coin — only price rights.');
      loadExposure();
    } catch (e) {
      alert('Exposure request failed');
    }
  }

  async function closeExposure(id) {
    var w = addr();
    if (!w || !id) return;
    await fetch('/api/caas/exposure/' + encodeURIComponent(id) + '/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: w, walletAddress: w })
    });
    loadExposure();
  }

  function goHub() {
    document.querySelectorAll('.page-view').forEach(function (el) {
      el.classList.remove('active');
      el.style.display = 'none';
    });
    var v = $('viewXchange');
    if (v) { v.classList.add('active'); v.style.display = 'block'; }
    document.querySelectorAll('.bottom-nav-slot').forEach(function (t) { t.classList.remove('active'); });
    var b = $('bnavMint');
    if (b) b.classList.add('active');
    document.querySelectorAll('.cx-xtab').forEach(function (t) { t.classList.remove('on'); });
    var tab = $('tabForYou');
    if (tab) tab.classList.add('on');
    document.title = 'Xchange | Cession';
    showLane('feed');
  }

  window.CessionXchange = { go: goHub, lane: showLane, openExposure: openExposure, closeExposure: closeExposure, loadExposure: loadExposure };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.CessionExchange) {
      CessionExchange.game = function () {
        if (window.CessionCaas && CessionCaas.maybeGeoPrompt) CessionCaas.maybeGeoPrompt(goHub);
        else goHub();
      };
    }
  });
})();
