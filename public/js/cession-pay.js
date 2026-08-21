(function () {
  function $(id) { return document.getElementById(id); }
  function addr() {
    return (window.walletEngine && (window.walletEngine.activeAddress || window.walletEngine.address))
      || localStorage.getItem('cession_address') || '';
  }
  function toast(m) { alert(m); }
  function open(id) {
    if (window.CessionUI && CessionUI.open) return CessionUI.open(id);
    var m = $(id); if (m) { m.style.display = 'flex'; m.classList.add('open'); }
  }

  function openReceive() {
    if (!addr()) return open('walletModal');
    var box = $('receiveAddress');
    if (box) box.textContent = addr();
    open('receiveModal');
  }

  function copyReceive() {
    var a = addr();
    if (!a) return toast('Connect first.');
    navigator.clipboard.writeText(a).then(function () { toast('Wallet copied. Not a token mint.'); });
  }

  function copyMintLabel(mint) {
    if (!mint) return;
    navigator.clipboard.writeText(mint).then(function () { toast('Token mint copied. Do not send SOL here.'); });
  }

  async function checkSend() {
    var dest = ($('sendDest') && $('sendDest').value || '').trim();
    var out = $('sendVerdict');
    if (!dest) { if (out) out.textContent = ''; return false; }
    var r = await fetch('/api/pay/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: dest })
    });
    var d = await r.json();
    if (out) {
      out.textContent = d.reason || '';
      out.style.color = d.safe ? '#16a34a' : '#dc2626';
    }
    var go = $('sendGo');
    if (go) go.disabled = !d.safe;
    return Boolean(d.safe);
  }

  async function confirmSend() {
    var word = ($('sendWord') && $('sendWord').value || '').trim();
    if (word.toUpperCase() !== 'SEND') return toast('Type SEND to confirm.');
    var ok = await checkSend();
    if (!ok) return toast('Blocked. That address is not a wallet.');
    var dest = ($('sendDest') && $('sendDest').value || '').trim();
    var useBuffer = window.CessionBuffer && CessionBuffer.enabled();
    var sendToggle = $('sendBufferToggle');
    if (sendToggle) useBuffer = sendToggle.checked;
    if (useBuffer && window.CessionBuffer) {
      CessionBuffer.enqueue({ type: 'send', dest: dest, amount: '' });
      toast('Buffered for ' + CessionBuffer.minutes() + ' minutes. Cancel from Exchange if this was a mistake. Not yet on-chain.');
      return;
    }
    toast('No buffer. On-chain sends cannot be reversed after broadcast.');
  }

  function tapTrade(usd) {
    var el = $('tradeAmount');
    if (el) el.value = usd;
  }

  window.CessionPay = {
    openReceive: openReceive,
    openSend: function () { if (!addr()) return open('walletModal'); open('sendModal'); },
    copyReceive: copyReceive,
    copyMintLabel: copyMintLabel,
    checkSend: checkSend,
    confirmSend: confirmSend,
    tapTrade: tapTrade
  };
})();
