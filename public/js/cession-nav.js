(function () {
  function showMint() {
    document.querySelectorAll('.page-view').forEach(function (el) {
      const on = el.id === 'viewMint';
      el.classList.toggle('active', on);
      el.style.display = on ? 'block' : 'none';
    });
  }
  function ready() {
    if (!window.CessionUI) return setTimeout(ready, 40);
    const ui = window.CessionUI;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/nav-extra.css';
    document.head.appendChild(link);
    ui.openSearch = function () {
      const m = document.getElementById('searchModal');
      if (m) { m.style.display = 'flex'; m.classList.add('open'); }
    };
    ui.searchLane = function (lane) {
      if (ui.setExploreLane) ui.setExploreLane(lane);
      ui.go('explore');
      const m = document.getElementById('searchModal');
      if (m) { m.style.display = 'none'; m.classList.remove('open'); }
    };
    const prev = ui.go;
    ui.go = function (name) {
      if (name === 'mint') {
        showMint();
        loadMint();
        document.querySelectorAll('.cx-xtab').forEach(function (el) { el.classList.remove('on'); });
        const t = document.getElementById('tabMint');
        if (t) t.classList.add('on');
        return;
      }
      if (prev) prev(name);
      if (name === 'explore') loadExplore();
    };
    async function loadExplore() {
      const king = document.getElementById('kingBox');
      try {
        const r = await fetch('/api/tokens/king');
        const d = await r.json();
        const t = d.king || d.token;
        if (king) {
          king.innerHTML = t && t.symbol
            ? '<strong>King of the hill</strong><p>' + (t.name || t.symbol) + ' · ' + t.symbol + '</p>'
            : '<strong>King of the hill</strong><p class="cx-muted">No live coin yet.</p>';
        }
      } catch (e) {
        if (king) king.innerHTML = '<strong>King of the hill</strong><p class="cx-muted">No live coin yet.</p>';
      }
    }
    async function loadMint() {
      const list = document.getElementById('mintManage');
      if (!list) return;
      const addr = localStorage.getItem('cession_address') || '';
      if (!addr) {
        list.innerHTML = '<p class="cx-muted">Connect a wallet to manage coins you minted.</p>';
        return;
      }
      try {
        const r = await fetch('/api/wallets/' + encodeURIComponent(addr) + '/profile');
        const d = await r.json();
        const created = d.created || [];
        list.innerHTML = created.length
          ? created.map(function (c) {
            return '<div class="cx-row"><span>' + (c.symbol || c) + '</span><span>Burn and fee claims after deploy.</span></div>';
          }).join('')
          : '<p class="cx-muted">You have not minted a coin yet.</p>';
      } catch (e) {
        list.innerHTML = '<p class="cx-muted">No coins to manage yet.</p>';
      }
    }
  }
  ready();
})();
