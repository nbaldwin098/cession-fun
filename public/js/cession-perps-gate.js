/**
 * Geo gate for leverage / perps.
 * US: soft prompt + blocked product surface. Non-US: allowed when API says so.
 */
(function () {
  'use strict';
  var COPY = 'Leverage and perpetual-style products are not offered to persons in the United States.';

  async function status() {
    try {
      var r = await fetch('/api/access/perps');
      var d = await r.json();
      return {
        allowed: !!d.allowed,
        country: d.country || '',
        reason: d.reason || ''
      };
    } catch (e) {
      return { allowed: false, country: '', reason: 'check_failed' };
    }
  }

  function softPrompt() {
    if (sessionStorage.getItem('cession_leverage_prompted') === '1') return;
    sessionStorage.setItem('cession_leverage_prompted', '1');
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay-generic';
    overlay.style.display = 'flex';
    overlay.innerHTML =
      '<div class="cx-sheet" role="dialog" style="max-width:400px">' +
      '<div class="cx-sheet-handle"></div>' +
      '<div class="cx-sheet-head"><h2>Not available in the US</h2>' +
      '<button class="cx-sheet-x" type="button" aria-label="Close">\u00d7</button></div>' +
      '<p class="cx-muted" style="padding:0 16px 16px">' +
      COPY +
      ' Spot trading and standard swaps remain available.</p>' +
      '<div class="cx-sheet-actions"><button class="cx-launch" type="button">Got it</button></div></div>';
    document.body.appendChild(overlay);
    function close() {
      overlay.remove();
    }
    overlay.querySelector('.cx-sheet-x').onclick = close;
    overlay.querySelector('.cx-launch').onclick = close;
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
  }

  function paintBlocked() {
    var view = document.getElementById('viewPerps');
    if (view) {
      view.innerHTML =
        '<h1 class="cx-title">Leverage</h1><div class="cx-card"><p>' +
        COPY +
        '</p><p class="cx-muted">This product is not offered to persons located in the United States.</p></div>';
    }
    var tab = document.getElementById('tabPerps');
    if (tab) tab.style.display = 'none';
  }

  function ready() {
    if (!window.CessionUI) return setTimeout(ready, 40);
    status().then(function (s) {
      if (!s.allowed) {
        paintBlocked();
        softPrompt();
        var prev = window.CessionUI.go;
        window.CessionUI.go = function (name) {
          if (name === 'perps' || name === 'leverage') {
            softPrompt();
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
