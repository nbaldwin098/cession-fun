(function () {
  function ready() {
    if (!window.CessionUI) return setTimeout(ready, 40);
    const ui = window.CessionUI;
    ui.openSearch = function () {
      const m = document.getElementById('searchModal');
      if (m) { m.style.display = 'flex'; m.classList.add('open'); }
      const q = document.getElementById('searchInput');
      if (q) q.focus();
    };
    ui.searchLane = function (lane) {
      ui.go('explore');
      if (ui.setExploreLane) ui.setExploreLane(lane);
      const m = document.getElementById('searchModal');
      if (m) { m.style.display = 'none'; m.classList.remove('open'); }
    };
    ui.goMint = function () { ui.go('mint'); };
    ui.openEarn = function () {
      const m = document.getElementById('stakeModal');
      if (m) { m.style.display = 'flex'; m.classList.add('open'); }
    };
    const prev = ui.go;
    ui.go = function (name) {
      if (prev) prev(name);
      document.querySelectorAll('.cx-xtab').forEach(function (el) { el.classList.remove('on'); });
      const map = { home: 'tabForYou', mint: 'tabMint', following: 'tabFollowing', ai: 'tabAi' };
      const id = name === 'home' ? 'tabForYou' : map[name];
      if (name === 'following' && document.getElementById('tabFollowing')) {
        document.getElementById('tabFollowing').classList.add('on');
      } else if (id && document.getElementById(id)) document.getElementById(id).classList.add('on');
      if (name === 'explore') loadExplore();
      if (name === 'mint') loadMint();
    };
    async function loadExplore() {
      const king = document.getElementById('kingBox');
      const chat = document.getElementById('exploreChat');
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
      if (chat && window.CessionUI.loadChat) window.CessionUI.loadChat();
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
        if (!created.length) {
          list.innerHTML = '<p class="cx-muted">You have not minted a coin yet.</p>';
          return;
        }
        list.innerHTML = created.map(function (c) {
          return '<div class="cx-row"><span>' + (c.symbol || c) + '</span><span>Burn and fee claims unlock after deploy.</span></div>';
        }).join('');
      } catch (e) {
        list.innerHTML = '<p class="cx-muted">No coins to manage yet.</p>';
      }
    }
  }
  ready();
})();
