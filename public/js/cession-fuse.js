(function () {
  function ready() {
    const header = document.querySelector('.cx-top');
    if (header && !document.getElementById('tabFuse')) {
      const btn = document.createElement('button');
      btn.id = 'tabFuse';
      btn.className = 'cx-xtab';
      btn.type = 'button';
      btn.textContent = 'Fuse';
      btn.onclick = function () { showFuse(); };
      const search = header.querySelector('.cx-search-btn');
      header.insertBefore(btn, search || null);
    }
    if (!document.getElementById('viewFuse')) {
      const main = document.createElement('main');
      main.className = 'page-view';
      main.id = 'viewFuse';
      main.innerHTML = '<h1 class="cx-title">Fuse</h1><p class="cx-muted">24h agent. Extra 1B. Unused burns. First buy 0.06 SOL. Agent paused until the house wallet is funded.</p><div id="fuseList" class="cx-card">Loading</div>';
      const app = document.querySelector('.cx-app');
      if (app) app.appendChild(main);
    }
    const buy = document.getElementById('deployFirstBuy');
    if (buy) {
      buy.min = '0.06';
      buy.value = '0.06';
    }
    const pit = document.getElementById('deployPit');
    if (pit) {
      pit.parentNode.innerHTML = '<label class="cx-muted"><input type="checkbox" id="deployFuse" checked> Fuse on (2B supply, 24h, leftover burns)</label>' +
        '<select class="form-input-pump" id="deployFuseMode"><option value="auto">Auto</option><option value="manual">Manual</option></select>' +
        '<p class="cx-muted">Fuse requires buying 0.06 SOL of your own coin at create. Same as Pump Mayhem.</p>';
    }
  }

  async function showFuse() {
    if (window.CessionUI) CessionUI.go('ai');
    document.querySelectorAll('.page-view').forEach(function (el) {
      const on = el.id === 'viewFuse';
      el.classList.toggle('active', on);
      el.style.display = on ? 'block' : 'none';
    });
    document.querySelectorAll('.cx-xtab').forEach(function (el) { el.classList.remove('on'); });
    const tab = document.getElementById('tabFuse');
    if (tab) tab.classList.add('on');
    try {
      const r = await fetch('/api/fuse');
      const d = await r.json();
      const box = document.getElementById('fuseList');
      const f = d.fuse || {};
      const rows = (f.coins || []).map(function (c) {
        return c.symbol + ' · ' + c.status + ' · ' + c.hoursLeft + 'h left';
      }).join('<br>') || 'No Fuse coins yet.';
      if (box) box.innerHTML = '<p>Insurance vault: ' + (f.insuranceSol || 0) + ' SOL</p><p>' + rows + '</p>';
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', ready);
  window.CessionFuse = { show: showFuse };
})();
