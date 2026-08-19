(function () {
  function ready() {
    if (!window.CessionUI) return setTimeout(ready, 40);
    const hdr = document.querySelector('.cx-top');
    if (hdr && !document.getElementById('tabMayhem')) {
      const b = document.createElement('button');
      b.className = 'cx-xtab';
      b.id = 'tabMayhem';
      b.type = 'button';
      b.textContent = 'Mayhem';
      b.onclick = function () { CessionUI.go('mayhem'); };
      const search = hdr.querySelector('.cx-search-btn');
      if (search) hdr.insertBefore(b, search);
      else hdr.appendChild(b);
    }
    if (!document.getElementById('viewMayhem')) {
      const page = document.createElement('main');
      page.className = 'page-view';
      page.id = 'viewMayhem';
      page.innerHTML =
        '<h1 class="cx-title">Mayhem</h1>' +
        '<div class="cx-card">' +
        '<p>Same model as Pump Mayhem. Opt-in at create. Labeled on the coin.</p>' +
        '<p class="cx-muted">At launch the coin mints 2,000,000,000 tokens. 1B sits on the curve. 1B goes to a house agent.</p>' +
        '<p class="cx-muted">For 24 hours the agent buys and sells at random, at most one trade per second, with a max SOL size per trade. Leftover agent tokens burn.</p>' +
        '<p class="cx-muted">Auto: more human trades, more agent trades. Manual: the creator triggers each agent fill.</p>' +
        '<p class="cx-muted">Activity is not guaranteed. The agent can buy or sell. This is not a return.</p>' +
        '</div>' +
        '<div class="cx-card">' +
        '<strong>Agent</strong>' +
        '<p class="cx-muted" id="mayhemStatus">Not live until the program is deployed. No agent trades run off-chain.</p>' +
        '<button class="cx-launch" type="button" onclick="CessionUI.openCreate()">Create with Mayhem</button>' +
        '</div>' +
        '<div class="cx-feed" id="mayhemGrid"></div>';
      const app = document.querySelector('.cx-app');
      if (app) app.appendChild(page);
    }
    const form = document.getElementById('deployCoinForm');
    if (form && !document.getElementById('deployMayhem')) {
      const lab = document.createElement('label');
      lab.className = 'gate-agree';
      lab.style.color = '#111';
      lab.innerHTML = '<input id="deployMayhem" type="checkbox"> Mayhem — extra 1B for a 24h agent. Same rules as Pump.';
      const btn = form.querySelector('button[type="submit"]');
      if (btn) form.insertBefore(lab, btn);
      else form.appendChild(lab);
    }
    const prev = CessionUI.go;
    CessionUI.go = function (name) {
      if (name === 'mayhem') {
        document.querySelectorAll('.page-view').forEach(function (el) {
          const on = el.id === 'viewMayhem';
          el.classList.toggle('active', on);
          el.style.display = on ? 'block' : 'none';
        });
        document.querySelectorAll('.cx-xtab').forEach(function (el) { el.classList.remove('on'); });
        const t = document.getElementById('tabMayhem');
        if (t) t.classList.add('on');
        loadMayhem();
        window.scrollTo(0, 0);
        return;
      }
      if (prev) prev(name);
    };
    async function loadMayhem() {
      const grid = document.getElementById('mayhemGrid');
      if (!grid) return;
      try {
        const r = await fetch('/api/pulse?lane=all&limit=50');
        const d = await r.json();
        const list = (d.feed || []).filter(function (c) { return c.mayhem || c.mayhemMode; });
        grid.innerHTML = list.length
          ? list.map(function (c) {
            return '<div class="cx-card"><strong>' + (c.name || c.symbol) + '</strong><p class="cx-muted">Mayhem · ' + c.symbol + '</p></div>';
          }).join('')
          : '<div class="cx-empty"><p class="cx-muted">No Mayhem coins yet. Agent does not run until the program is live.</p></div>';
      } catch (e) {
        grid.innerHTML = '<div class="cx-empty"><p class="cx-muted">No Mayhem coins yet.</p></div>';
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
