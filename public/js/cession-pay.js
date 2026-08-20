(function () {
  function $(id) { return document.getElementById(id); }
  function addr() {
    return (window.walletEngine && (window.walletEngine.activeAddress || window.walletEngine.address))
      || localStorage.getItem('cession_address') || '';
  }
  function toast(m) { alert(m); }
  function open(id) {
    if (window.CessionUI && CessionUI.open) return CessionUI.open(id);
    const m = $(id); if (m) { m.style.display = 'flex'; m.classList.add('open'); }
  }

  function setAmt(id, n) {
    const el = $(id); if (el) el.value = n;
    document.querySelectorAll('[data-pay-amt]').forEach(function (b) {
      b.classList.toggle('on', Number(b.getAttribute('data-pay-amt')) === Number(n));
    });
  }

  async function openPay() {
    if (!addr()) return open('walletModal');
    try {
      const r = await fetch('/api/pay/status');
      const d = await r.json();
      const note = $('payNote');
      if (note) note.textContent = d.note || '';
      const list = $('payRails');
      if (list && d.rails) {
        list.innerHTML = Object.keys(d.rails).map(function (k) {
          const rail = d.rails[k];
          const label = rail.name + (rail.status === 'reviewing' ? ' · reviewing' : rail.ready ? '' : ' · add key');
          return '<button type="button" class="cx-door" data-rail="' + rail.id + '" onclick="CessionPay.startPay(\'' + rail.id + '\')">' + label + '</button>';
        }).join('');
      }
    } catch (e) {}
    open('payModal');
  }

  function openReceive() {
    if (!addr()) return open('walletModal');
    const a = addr();
    const box = $('receiveAddress');
    if (box) box.textContent = a;
    open('receiveModal');
  }

  function copyReceive() {
    const a = addr();
    if (!a) return toast('Connect first.');
    navigator.clipboard.writeText(a).then(function () { toast('Wallet copied. Not a token mint.'); });
  }

  function copyMintLabel(mint) {
    if (!mint) return;
    navigator.clipboard.writeText(mint).then(function () {
      toast('Token mint copied. Do not send SOL here.');
    });
  }

  async function checkSend() {
    const dest = ($('sendDest') && $('sendDest').value || '').trim();
    const out = $('sendVerdict');
    if (!dest) { if (out) out.textContent = ''; return false; }
    const r = await fetch('/api/pay/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: dest })
    });
    const d = await r.json();
    if (out) {
      out.textContent = d.reason || '';
      out.style.color = d.safe ? '#16a34a' : '#dc2626';
    }
    const go = $('sendGo');
    if (go) go.disabled = !d.safe;
    return Boolean(d.safe);
  }

  async function confirmSend() {
    const dest = ($('sendDest') && $('sendDest').value || '').trim();
    const word = ($('sendWord') && $('sendWord').value || '').trim();
    if (word.toUpperCase() !== 'SEND') return toast('Type SEND to confirm.');
    const ok = await checkSend();
    if (!ok) return toast('Blocked. That address is not a wallet.');
    toast('On-chain sends cannot be reversed.');
  }

  async function startPay(provider) {
    const amount = Number(($('payAmount') && $('payAmount').value) || 20);
    const r = await fetch('/api/pay/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountUsd: amount, provider: provider, address: addr() })
    });
    const d = await r.json();
    if (d.checkoutUrl) {
      window.location.href = d.checkoutUrl;
      return;
    }
    toast(d.error || 'Checkout not live on this rail yet.');
  }

  function tapTrade(usd) {
    const el = $('tradeAmount');
    if (el) el.value = usd;
    document.querySelectorAll('[data-trade-usd]').forEach(function (b) {
      b.classList.toggle('on', Number(b.getAttribute('data-trade-usd')) === Number(usd));
    });
  }

  window.CessionPay = {
    openPay: openPay,
    openReceive: openReceive,
    openSend: function () { if (!addr()) return open('walletModal'); open('sendModal'); },
    copyReceive: copyReceive,
    copyMintLabel: copyMintLabel,
    checkSend: checkSend,
    confirmSend: confirmSend,
    startPay: startPay,
    setAmt: setAmt,
    tapTrade: tapTrade
  };
})();
