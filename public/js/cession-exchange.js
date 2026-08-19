(function () {
  function ready() {
    if (!window.CessionUI) return setTimeout(ready, 40);
    const hdr = document.querySelector('.cx-top');
    if (hdr && !document.getElementById('tabExchange')) {
      const b = document.createElement('button');
      b.className = 'cx-xtab';
      b.id = 'tabExchange';
      b.type = 'button';
      b.textContent = 'Exchange';
      b.onclick = function () { CessionUI.go('exchange'); };
      const search = hdr.querySelector('.cx-search-btn');
      if (search) hdr.insertBefore(b, search);
      else hdr.appendChild(b);
    }
    if (!document.getElementById('viewExchange')) {
      const page = document.createElement('main');
      page.className = 'page-view';
      page.id = 'viewExchange';
      page.innerHTML =
        '<h1 class="cx-title">Exchange</h1>' +
        '<div class="cx-card">' +
        '<p>Not live.</p>' +
        '<p class="cx-muted">This will be a router. We do not hold keys or funds.</p>' +
        '<p class="cx-muted">Spot and tools first. Perpetuals are not allowed in the United States.</p>' +
        '</div>';
      const app = document.querySelector('.cx-app');
      if (app) app.appendChild(page);
    }
    const prev = CessionUI.go;
    CessionUI.go = function (name) {
      if (name === 'exchange') {
        document.querySelectorAll('.page-view').forEach(function (el) {
          const on = el.id === 'viewExchange';
          el.classList.toggle('active', on);
          el.style.display = on ? 'block' : 'none';
        });
        document.querySelectorAll('.cx-xtab').forEach(function (el) { el.classList.remove('on'); });
        const t = document.getElementById('tabExchange');
        if (t) t.classList.add('on');
        window.scrollTo(0, 0);
        return;
      }
      if (prev) prev(name);
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
