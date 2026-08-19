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
        '<p>Same model as Pump. Extra 1B to a house agent. 24 hours. Random buy or sell. Max one fill per second. Leftover burns.</p>' +
        '<p class="cx-muted">Create flag is off. No coin can turn this on yet.</p>' +
        '<p class="cx-muted" id="mayhemStatus">Loading…</p>' +
        '</div>' +
        '<div class="cx-feed" id="mayhemGrid"></div>';
      const app = document.querySelector('.cx-app');
      if (app) app.appendChild(page);
    }
    const box = document.getElementById('deployMayhem');
    if (box && box.closest('label')) box.closest('label').remove();
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
      const status = document.getElementById('mayhemStatus');
      const grid = document.getElementById('mayhemGrid');
      try {
        const r = await fetch('/api/mayhem');
        const d = await r.json();
        if (status) status.textContent = d.reason || 'Mayhem is not live.';
      } catch (e) {
        if (status) status.textContent = 'Could not load Mayhem status.';
      }
      if (grid) {
        grid.innerHTML = '<div class="cx-empty"><p class="cx-muted">No Mayhem coins. The create flag is off.</p></div>';
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
