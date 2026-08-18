(function () {
  function rewrite() {
    document.querySelectorAll('*').forEach(function (el) {
      if (!el.childNodes || el.children.length) return;
      const t = el.textContent || '';
      if (!t) return;
      let n = t
        .replace(/Launch 0\.05 SOL/g, 'Launch free')
        .replace(/0\.05 SOL/g, 'free')
        .replace(/Create fee is 0\.05 SOL\./g, '')
        .replace(/Trade fee 0\.25%/g, 'Trade fee 1.00% · creator 0.50%')
        .replace(/We do not hold keys\.?/gi, '')
        .replace(/Cession does not hold keys\.?/gi, '');
      if (n !== t) el.textContent = n.trim();
    });
    const fee = document.getElementById('tradeFeeLine');
    if (fee) fee.textContent = 'Trade 1.00%. Creator 0.50%. Promo can cut the protocol slice.';
    const launch = document.querySelector('#deployCoinForm button[type="submit"]');
    if (launch) launch.textContent = 'Launch free';
    const mintP = document.querySelector('#viewMint .cx-muted');
    if (mintP) mintP.textContent = 'Launch is free except Solana rent. When the curve fills the coin stays on Cession and can enter bundles. Burn and claims unlock after deploy.';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rewrite);
  else rewrite();
  setTimeout(rewrite, 800);
})();
