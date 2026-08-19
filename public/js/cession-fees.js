(function () {
  function rewrite() {
    const fee = document.getElementById('tradeFeeLine');
    if (fee) fee.textContent = 'Trade 1.00%. Creator 0.50%. Holders 0.25%. Protocol 0.25%.';
    const launch = document.querySelector('#deployCoinForm button[type="submit"]');
    if (launch) launch.textContent = 'Launch';
    const mintP = document.querySelector('#viewMint .cx-muted');
    if (mintP) mintP.textContent = 'Create is free. You only pay Solana rent. Trade fee is 1.00%.';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rewrite);
  else rewrite();
})();
