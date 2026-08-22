/**
 * CaaS native checkout — Coinbase Headless style (demo)
 */
(function () {
  function $(id) { return document.getElementById(id); }
  var selected = 'SOL';
  var lastQuote = null;

  function addr() {
    return (window.walletEngine && (window.walletEngine.activeAddress || window.walletEngine.address))
      || localStorage.getItem('cession_address')
      || localStorage.getItem('walletAddress')
      || '';
  }

  function toast(msg) {
    var el = $('cxCopyToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cxCopyToast';
      el.className = 'cx-copy-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function openBuy() {
    if (!addr()) {
      toast('Connect a wallet first');
      if (window.CessionUI) CessionUI.open('walletModal');
      return;
    }
    var m = $('caasBuyModal');
    if (!m) {
      toast('CaaS buy sheet not mounted yet');
      return;
    }
    m.style.display = 'flex';
    m.classList.add('open');
    setAsset('SOL');
    refreshQuote();
  }

  function closeBuy() {
    var m = $('caasBuyModal');
    if (!m) return;
    m.classList.remove('open');
    m.style.display = 'none';
  }

  function setAsset(sym) {
    selected = sym;
    document.querySelectorAll('.cx-caas-asset-pills button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-asset') === sym);
    });
    refreshQuote();
  }

  async function refreshQuote() {
    var amountEl = $('caasAmount');
    var box = $('caasQuoteBox');
    if (!box) return;
    var usd = Number(amountEl && amountEl.value) || 100;
    box.innerHTML = '<div class="cx-muted" style="padding:8px 0">Getting quote…</div>';
    try {
      var r = await fetch('/api/caas/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset: selected, amountUsd: usd, side: 'buy' })
      });
      var q = await r.json();
      if (!q.ok) throw new Error('quote');
      lastQuote = q;
      box.innerHTML =
        '<div class="row"><span>Asset</span><span>' + q.asset + '</span></div>' +
        '<div class="row"><span>Price</span><span>$' + Number(q.price).toLocaleString() + '</span></div>' +
        '<div class="row"><span>Platform fee (' + q.breakdown.platformFeePct + '%)</span><span>$' + q.breakdown.platformFee.toFixed(2) + '</span></div>' +
        '<div class="row"><span>Network</span><span>$' + q.breakdown.networkFee.toFixed(3) + '</span></div>' +
        '<div class="row total"><span>You receive</span><span>~' + q.assetAmount + ' ' + q.asset + '</span></div>';
    } catch (e) {
      box.innerHTML = '<div class="cx-muted">Quote unavailable (demo)</div>';
    }
  }

  async function confirmBuy() {
    var a = addr();
    if (!a) {
      if (window.CessionUI) CessionUI.open('walletModal');
      return;
    }
    var mins = Number(($('caasBuffer') && $('caasBuffer').checked) ? (window.CESSION_BUFFER_MINUTES || 15) : 0);
    try {
      var r = await fetch('/api/caas/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: lastQuote && lastQuote.quoteId, walletAddress: a, bufferMinutes: mins })
      });
      var o = await r.json();
      if (!o.ok) throw new Error('order');
      toast(o.message || 'Demo order recorded');
      closeBuy();
    } catch (e) {
      toast('Order failed (demo)');
    }
  }

  var geoCached = null;
  async function checkGeo() {
    if (geoCached !== null) return geoCached;
    try {
      var r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(2500) });
      var d = await r.json();
      geoCached = (d && d.country_code === 'US');
    } catch (e) {
      geoCached = false;
    }
    return geoCached;
  }

  async function maybeGeoPrompt(onContinue) {
    var isUS = await checkGeo();
    if (!isUS) {
      if (typeof onContinue === 'function') onContinue();
      return;
    }
    var modal = $('geoPromptModal');
    if (!modal) {
      if (typeof onContinue === 'function') onContinue();
      return;
    }
    modal.classList.add('open');
    modal.style.display = 'flex';
    window.__geoContinue = onContinue;
  }

  function geoContinue() {
    var modal = $('geoPromptModal');
    if (modal) { modal.classList.remove('open'); modal.style.display = 'none'; }
    if (typeof window.__geoContinue === 'function') window.__geoContinue();
    window.__geoContinue = null;
  }

  function geoCancel() {
    var modal = $('geoPromptModal');
    if (modal) { modal.classList.remove('open'); modal.style.display = 'none'; }
    window.__geoContinue = null;
    toast('Leverage features are limited for US users');
  }

  window.CessionCaas = {
    openBuy: openBuy,
    closeBuy: closeBuy,
    setAsset: setAsset,
    refreshQuote: refreshQuote,
    confirmBuy: confirmBuy,
    maybeGeoPrompt: maybeGeoPrompt,
    geoContinue: geoContinue,
    geoCancel: geoCancel
  };
})();
