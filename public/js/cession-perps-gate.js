(function () {
  const COPY = 'Perpetuals are not allowed in the United States.';
  async function allowed() {
    try {
      const r = await fetch('/api/access/perps');
      const d = await r.json();
      return !!d.allowed;
    } catch (e) {
      return false;
    }
  }
  function paintBlocked() {
    const view = document.getElementById('viewPerps');
    if (view) {
      view.innerHTML = '<h1 class="cx-title">Perps</h1><div class="cx-card"><p>' + COPY + '</p><p class="cx-muted">This product is not offered to persons located in the United States.</p></div>';
    }
    const tab = document.getElementById('tabPerps');
    if (tab) tab.style.display = 'none';
  }
  function ready() {
    if (!window.CessionUI) return setTimeout(ready, 40);
    allowed().then(function (ok) {
      if (!ok) {
        paintBlocked();
        const prev = window.CessionUI.go;
        window.CessionUI.go = function (name) {
          if (name === 'perps') {
            paintBlocked();
            if (prev) prev('perps');
            return;
          }
          if (prev) prev(name);
        };
      }
    });
  }
  ready();
})();
