(function () {
  function rewrite() {
    const fee = document.getElementById('tradeFeeLine');
    if (fee) fee.textContent = 'Trade 1.00%. Creator 0.50%. Holders 0.25%. Protocol 0.25%.';
    const launch = document.querySelector('#deployCoinForm button[type="submit"]');
    if (launch) launch.textContent = 'Launch 0.05 SOL';
    const mintP = document.querySelector('#viewMint .cx-muted');
    if (mintP) mintP.textContent = 'Launch a coin for 0.05 SOL plus rent. When the curve fills the coin stays on Cession and can enter bundles.';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rewrite);
  else rewrite();
})();
