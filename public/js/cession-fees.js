(function () {
  function rewrite() {
    var fee = document.getElementById('tradeFeeLine');
    if (fee) fee.textContent = 'Trade 0.95%. Clear pricing. Part of fees is paid back to customers daily when live.';
    var launch = document.querySelector('#deployCoinForm button[type="submit"]');
    if (launch) launch.textContent = 'Launch in Game';
    var mintP = document.querySelector('#viewMint .cx-muted');
    if (mintP) mintP.textContent = 'Game mint. Create is free except Solana rent. Exchange trade fee is 0.95%.';
    var lines = document.querySelectorAll('[data-fee-line]');
    for (var i = 0; i < lines.length; i++) lines[i].textContent = '0.95% trade fee · daily customer rebate when live';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rewrite);
  else rewrite();
})();
