(function () {
  function $(id) { return document.getElementById(id); }

  function addr() {
    return (window.walletEngine && (window.walletEngine.activeAddress || window.walletEngine.address))
      || localStorage.getItem('cession_address')
      || localStorage.getItem('walletAddress')
      || '';
  }

  function shortAddr(a) {
    if (!a || a.length < 12) return a || '';
    return a.slice(0, 6) + '…' + a.slice(-6);
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
    el._t = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  function closeAllSheets() {
    ['receiveModal', 'sendModal', 'tradeModal', 'walletModal'].forEach(function (id) {
      var m = $(id);
      if (!m) return;
      m.classList.remove('open');
      m.style.display = 'none';
    });
  }

  function open(id) {
    closeAllSheets();
    var m = $(id);
    if (!m) return;
    m.style.display = 'flex';
    m.classList.add('open');
  }

  function close(id) {
    var m = $(id);
    if (!m) return;
    m.classList.remove('open');
    m.style.display = 'none';
  }

  function qrUrl(text) {
    var q = encodeURIComponent(text || '');
    return 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=' + q;
  }

  function openReceive() {
    var a = addr();
    if (!a) return open('walletModal');

    var full = $('receiveAddress');
    var short = $('receiveAddressShort');
    var img = $('receiveQr');
    var warn = $('receiveWarn');

    if (full) full.textContent = a;
    if (short) short.textContent = shortAddr(a);
    if (img) {
      img.alt = 'QR code for ' + shortAddr(a);
      img.src = qrUrl(a);
      img.style.display = 'block';
    }
    if (warn) warn.textContent = 'Only send SOL or SPL tokens to this wallet on Solana. Never send to a token mint address.';

    open('receiveModal');
  }

  function copyReceive() {
    var a = addr();
    if (!a) return toast('Connect a wallet first');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(a).then(function () {
        toast('Address copied');
      }).catch(function () {
        fallbackCopy(a);
      });
    } else {
      fallbackCopy(a);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast('Address copied');
    } catch (e) {
      toast('Copy failed — select the address manually');
    }
    document.body.removeChild(ta);
  }

  function copyMintLabel(mint) {
    if (!mint) return;
    var t = String(mint).trim();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(t).then(function () {
        toast('Mint copied — do not send SOL here');
      });
    }
  }

  function openSend() {
    if (!addr()) return open('walletModal');
    var dest = $('sendDest');
    var word = $('sendWord');
    var verdict = $('sendVerdict');
    var go = $('sendGo');
    if (dest) dest.value = '';
    if (word) word.value = '';
    if (verdict) verdict.textContent = '';
    if (go) go.disabled = true;
    open('sendModal');
  }

  async function checkSend() {
    var dest = ($('sendDest') && $('sendDest').value || '').trim();
    var out = $('sendVerdict');
    if (!dest) {
      if (out) out.textContent = '';
      var go0 = $('sendGo');
      if (go0) go0.disabled = true;
      return false;
    }
    try {
      var r = await fetch('/api/pay/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: dest })
      });
      var d = await r.json();
      if (out) {
        out.textContent = d.reason || (d.safe ? 'Looks like a wallet address.' : 'Not safe to send.');
        out.style.color = d.safe ? '#098458' : '#d12b4a';
      }
      var go = $('sendGo');
      if (go) go.disabled = !d.safe;
      return Boolean(d.safe);
    } catch (e) {
      if (out) {
        out.textContent = 'Could not verify address.';
        out.style.color = '#d12b4a';
      }
      return false;
    }
  }

  async function confirmSend() {
    var word = ($('sendWord') && $('sendWord').value || '').trim();
    if (word.toUpperCase() !== 'SEND') return toast('Type SEND to confirm');
    var ok = await checkSend();
    if (!ok) return toast('Blocked — that is not a wallet');
    var dest = ($('sendDest') && $('sendDest').value || '').trim();
    var useBuffer = window.CessionBuffer && CessionBuffer.enabled();
    var sendToggle = $('sendBufferToggle');
    if (sendToggle) useBuffer = sendToggle.checked;
    if (useBuffer && window.CessionBuffer) {
      CessionBuffer.enqueue({ type: 'send', dest: dest, amount: '' });
      close('sendModal');
      toast('Buffered ' + (CessionBuffer.minutes && CessionBuffer.minutes()) + ' min — cancel on Home');
      return;
    }
    toast('On-chain send is not live yet');
  }

  function tapTrade(usd) {
    var el = $('tradeAmount');
    if (el) el.value = usd;
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-close-sheet')) {
      close(t.getAttribute('data-close-sheet'));
    }
    if (t && t.classList && t.classList.contains('modal-overlay-generic') && t.id) {
      close(t.id);
    }
  });

  window.CessionPay = {
    openReceive: openReceive,
    openSend: openSend,
    closeReceive: function () { close('receiveModal'); },
    closeSend: function () { close('sendModal'); },
    copyReceive: copyReceive,
    copyMintLabel: copyMintLabel,
    checkSend: checkSend,
    confirmSend: confirmSend,
    tapTrade: tapTrade,
    closeAll: closeAllSheets
  };
})();
