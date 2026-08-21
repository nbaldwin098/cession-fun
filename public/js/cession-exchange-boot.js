(function () {
  function goExchange() {
    document.querySelectorAll('.page-view').forEach(function (el) { el.classList.remove('active'); });
    var v = document.getElementById('viewExchange');
    if (v) v.classList.add('active');
    document.querySelectorAll('.cx-xtab').forEach(function (t) { t.classList.remove('on'); });
    var tab = document.getElementById('tabExchange');
    if (tab) tab.classList.add('on');
    document.querySelectorAll('.bottom-nav-slot').forEach(function (t) { t.classList.remove('active'); });
    var b = document.getElementById('bnavExchange');
    if (b) b.classList.add('active');
    document.title = 'Exchange | Cession';
  }

  function goGame() {
    if (window.CessionUI && typeof CessionUI.setHomeLane === 'function') {
      CessionUI.setHomeLane('foryou');
    } else {
      document.querySelectorAll('.page-view').forEach(function (el) { el.classList.remove('active'); });
      var h = document.getElementById('viewHome');
      if (h) h.classList.add('active');
    }
    document.title = 'Game | Cession';
  }

  window.CessionExchange = { go: goExchange, game: goGame };

  document.addEventListener('DOMContentLoaded', function () {
    goExchange();
  });
})();
