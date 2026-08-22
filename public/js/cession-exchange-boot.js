(function () {
  function goExchange() {
    document.querySelectorAll('.page-view').forEach(function (el) {
      el.classList.remove('active');
      el.style.display = 'none';
    });
    var v = document.getElementById('viewExchange');
    if (v) {
      v.classList.add('active');
      v.style.display = 'block';
    }
    document.querySelectorAll('.cx-xtab').forEach(function (t) { t.classList.remove('on'); });
    var tab = document.getElementById('tabExchange');
    if (tab) tab.classList.add('on');
    document.querySelectorAll('.bottom-nav-slot').forEach(function (t) { t.classList.remove('active'); });
    var b = document.getElementById('bnavExchange');
    if (b) b.classList.add('active');
    document.title = 'Exchange | Cession';
  }

  function goGame() {
    function enter() {
      if (window.CessionXchange && typeof CessionXchange.go === 'function') {
        CessionXchange.go();
        return;
      }
      if (window.CessionUI && typeof CessionUI.setHomeLane === 'function') {
        CessionUI.setHomeLane('foryou');
      } else {
        document.querySelectorAll('.page-view').forEach(function (el) {
          el.classList.remove('active');
          el.style.display = 'none';
        });
        var h = document.getElementById('viewHome');
        if (h) {
          h.classList.add('active');
          h.style.display = 'block';
        }
      }
      document.querySelectorAll('.cx-xtab').forEach(function (t) { t.classList.remove('on'); });
      var tab = document.getElementById('tabForYou');
      if (tab) tab.classList.add('on');
      document.querySelectorAll('.bottom-nav-slot').forEach(function (t) { t.classList.remove('active'); });
      var b = document.getElementById('bnavMint');
      if (b) b.classList.add('active');
      document.title = 'Xchange | Cession';
    }

    if (window.CessionCaas && typeof CessionCaas.maybeGeoPrompt === 'function') {
      CessionCaas.maybeGeoPrompt(enter);
    } else {
      enter();
    }
  }

  window.CessionExchange = { go: goExchange, game: goGame };

  document.addEventListener('DOMContentLoaded', function () {
    goExchange();
  });
})();
