(function () {
  function wait() {
    if (!window.CessionUI) return setTimeout(wait, 30);
    var ui = window.CessionUI;
    ui.copyReferral = function () {
      var addr = localStorage.getItem('cession_address') || 'cession';
      var url = location.origin + '/r/' + encodeURIComponent(addr.slice(0, 8));
      if (navigator.clipboard) navigator.clipboard.writeText(url);
      alert(url + '\nNot live until deploy.');
    };
    var fee = document.getElementById('tradeFeeLine');
    var oldOpen = ui.openTrade;
    ui.openTrade = function (side) {
      if (oldOpen) oldOpen(side);
      if (fee) fee.style.display = side === 'buy' ? 'block' : 'none';
    };
  }
  wait();
})();
