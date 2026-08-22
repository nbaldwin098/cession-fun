/**
 * Xchange hub — Live · Create · Trade · Exposure (rights only)
 */
(function () {
  function $(id) { return document.getElementById(id); }

  function showLane(lane) {
    document.querySelectorAll('.cx-xch-lane').forEach(function (el) {
      el.classList.toggle('on', el.getAttribute('data-lane') === lane);
    });
    ['feed', 'create', 'trade', 'exposure'].forEach(function (l) {
      var el = $('xchLane' + l.charAt(0).toUpperCase() + l.slice(1));
      if (el) el.style.display = l === lane ? 'block' : 'none';
    });
    if (lane === 'exposure') loadExposure();
  }

  function addr() {
    return (window.walletEngine && (window.walletEngine.activeAddress || window.walletEngine.address))
      || localStorage.getItem('cession_address')
      || '';
  }

  async function loadExposure() {
    var box = $('xchPositions') || $('xchExposureList');
    if (!box) return;
    var w = addr();
    if (!w) {
      box.innerHTML = '<p class="cx-muted">Connect a wallet to view positions.</p>';
      return;
    }
    try {
      var r = await fetch('/api/caas/exposure?wallet=' + encodeURIComponent(w));
      var d = await r.json();
      var rows = (d.positions || []).map(function (p) {
        return '<div class="cx-baas-item"><div class="left"><span class="title">' + (p.symbol || '') + ' · ' + (p.leverage || '') + 'x</span></div><div class="right">' + (p.pnl || '') + '</div></div>';
      });
      box.innerHTML = rows.length ? rows.join('') : '<p class="cx-muted">No positions</p>';
    } catch (e) {
      box.innerHTML = '<p class="cx-muted">No positions</p>';
    }
  }

  function create() {
    var a = addr();
    if (!a) {
      alert('Connect Phantom, MetaMask, or Trust first');
      if (window.CessionUI) CessionUI.open('walletModal');
      return;
    }
    var name = ($('xchName') || {}).value || '';
    var sym = ($('xchSymbol') || {}).value || '';
    if (!name || !sym) {
      alert('Enter name and symbol');
      return;
    }
    if (window.CessionUI && CessionUI.openCreate) CessionUI.openCreate();
    else alert('Create flow will use your wallet when API is live.');
  }

  function openExposure() {
    if (window.CessionPerpsGate && CessionPerpsGate.promptUs) CessionPerpsGate.promptUs();
    showLane('exposure');
  }

  window.CessionXchange = {
    lane: showLane,
    create: create,
    openExposure: openExposure,
    loadExposure: loadExposure
  };
})();
