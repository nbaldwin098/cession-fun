/**
 * Wallet connect for desktop (extensions) + mobile (apps).
 *
 * Phantom mobile (Safari/Chrome): official encrypted deeplink → approve in app → redirect back.
 * MetaMask / Trust mobile: open site inside their browser (only path that works without WalletConnect), then connect.
 * Desktop: injected provider, connect + one sign-in.
 */
(function () {
  'use strict';

  var signing = false;
  var lastSaved = '';
  var PHANTOM_SK_KEY = 'cession_phantom_sk';
  var PHANTOM_SESSION_KEY = 'cession_phantom_session';

  function ua() {
    return navigator.userAgent || '';
  }
  function isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua());
  }
  function isIOS() {
    return /iPhone|iPad|iPod/i.test(ua());
  }

  function inWalletWebView() {
    var u = ua();
    if (/Phantom/i.test(u)) return 'phantom';
    if (/MetaMask/i.test(u)) return 'metamask';
    if (/Trust/i.test(u) || /TrustWallet/i.test(u)) return 'trust';
    if (window.phantom && window.phantom.solana) return 'phantom';
    if (window.ethereum && (window.ethereum.isTrust || window.ethereum.isTrustWallet)) return 'trust';
    if (window.ethereum && window.ethereum.isMetaMask) return 'metamask';
    return null;
  }

  function originUrl() {
    return location.origin + '/';
  }
  function fullUrl() {
    return location.href.split('#')[0];
  }

  function toast(msg) {
    var el = document.getElementById('cxCopyToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cxCopyToast';
      el.className = 'cx-copy-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.classList.remove('show');
    }, 2800);
  }

  function enterApp() {
    try {
      localStorage.setItem('cession_onboarded', '1');
      localStorage.setItem('cession_gate_ok', '1');
      var g = document.getElementById('cessionGate');
      if (g) g.classList.remove('open');
      document.documentElement.classList.remove('gated');
      document.body.classList.remove('gated');
      if (location.search && /phantom_|errorCode/.test(location.search)) {
        var clean = location.origin + location.pathname;
        if (window.history && history.replaceState) history.replaceState({}, '', clean);
      }
      if (window.CessionExchange && typeof CessionExchange.go === 'function') {
        CessionExchange.go();
      }
    } catch (e) {}
  }

  function saveAddr(a, kind) {
    if (!a) return;
    var same = a === lastSaved && a === localStorage.getItem('cession_address');
    lastSaved = a;
    localStorage.setItem('cession_address', a);
    if (kind) localStorage.setItem('cession_wallet_type', kind);
    if (window.walletEngine) {
      window.walletEngine.activeAddress = a;
      if (kind) window.walletEngine.activeWalletType = kind;
      window.walletEngine.isAuthenticated = true;
      if (window.walletEngine.renderState) window.walletEngine.renderState();
    }
    if (window.CessionWalletHub && CessionWalletHub.setActive) {
      CessionWalletHub.setActive(a, kind);
    }
    if (window.CessionWalletHub && CessionWalletHub.paintActiveStrip) {
      CessionWalletHub.paintActiveStrip();
    }
    closeModal();
    sync();
    if (localStorage.getItem('cession_session')) {
      enterApp();
      return;
    }
    if (!same) signInOnce(kind);
  }

  function signInOnce(kind) {
    if (signing) return;
    if (localStorage.getItem('cession_session')) {
      enterApp();
      return;
    }
    if (!window.CessionSession || !CessionSession.establish) {
      enterApp();
      return;
    }
    signing = true;
    CessionSession.establish(kind || localStorage.getItem('cession_wallet_type') || 'phantom')
      .then(function (r) {
        signing = false;
        if (r && r.ok) enterApp();
      })
      .catch(function () {
        signing = false;
      });
  }

  function closeModal() {
    var m = document.getElementById('walletModal');
    if (m) m.classList.remove('open');
  }

  function sync() {
    if (window.walletEngine && window.walletEngine.renderState) window.walletEngine.renderState();
    if (window.CessionWalletHub && CessionWalletHub.render) CessionWalletHub.render();
  }

  var B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function b58encode(bytes) {
    var digits = [0];
    for (var i = 0; i < bytes.length; i++) {
      var carry = bytes[i];
      for (var j = 0; j < digits.length; j++) {
        carry += digits[j] << 8;
        digits[j] = carry % 58;
        carry = (carry / 58) | 0;
      }
      while (carry) {
        digits.push(carry % 58);
        carry = (carry / 58) | 0;
      }
    }
    var str = '';
    for (var z = 0; z < bytes.length && bytes[z] === 0; z++) str += '1';
    for (var k = digits.length - 1; k >= 0; k--) str += B58[digits[k]];
    return str;
  }
  function b58decode(str) {
    var bytes = [0];
    for (var i = 0; i < str.length; i++) {
      var val = B58.indexOf(str[i]);
      if (val < 0) throw new Error('bad b58');
      var carry = val;
      for (var j = 0; j < bytes.length; j++) {
        carry += bytes[j] * 58;
        bytes[j] = carry & 0xff;
        carry >>= 8;
      }
      while (carry) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    for (var z = 0; z < str.length && str[z] === '1'; z++) bytes.push(0);
    return new Uint8Array(bytes.reverse());
  }

  function loadNacl(cb) {
    if (window.nacl && window.nacl.box) return cb(null, window.nacl);
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/nacl-fast.min.js';
    s.onload = function () {
      cb(null, window.nacl);
    };
    s.onerror = function () {
      cb(new Error('nacl load failed'));
    };
    document.head.appendChild(s);
  }

  function getOrCreatePhantomDappKey(nacl) {
    try {
      var raw = sessionStorage.getItem(PHANTOM_SK_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        return nacl.box.keyPair.fromSecretKey(new Uint8Array(arr));
      }
    } catch (e) {}
    var kp = nacl.box.keyPair();
    sessionStorage.setItem(PHANTOM_SK_KEY, JSON.stringify(Array.from(kp.secretKey)));
    return kp;
  }

  function getPhantomProvider() {
    if (window.phantom && window.phantom.solana) return window.phantom.solana;
    if (window.solana && window.solana.isPhantom) return window.solana;
    return null;
  }
  function getMetaMaskProvider() {
    var eth = window.ethereum;
    if (!eth) return null;
    if (eth.providers && eth.providers.length) {
      var mm = eth.providers.find(function (p) {
        return p.isMetaMask && !p.isTrust && !p.isTrustWallet;
      });
      if (mm) return mm;
    }
    if (eth.isMetaMask && !eth.isTrust && !eth.isTrustWallet) return eth;
    return null;
  }
  function getTrustProvider() {
    var eth = window.ethereum;
    if (eth) {
      if (eth.providers && eth.providers.length) {
        var t = eth.providers.find(function (p) {
          return p.isTrust || p.isTrustWallet;
        });
        if (t) return t;
      }
      if (eth.isTrust || eth.isTrustWallet) return eth;
    }
    if (window.trustwallet && window.trustwallet.ethereum) return window.trustwallet.ethereum;
    return null;
  }

  function connectPhantomInjected() {
    var provider = getPhantomProvider();
    if (!provider) return false;
    provider
      .connect({ onlyIfTrusted: false })
      .then(function (res) {
        var key =
          (res && res.publicKey && res.publicKey.toString()) ||
          (provider.publicKey && provider.publicKey.toString());
        if (key) saveAddr(key, 'phantom');
      })
      .catch(function (err) {
        if (err && err.code === 4001) return;
      });
    return true;
  }

  function connectPhantomMobileDeeplink() {
    loadNacl(function (err, nacl) {
      if (err || !nacl) {
        openInPhantomBrowser();
        return;
      }
      try {
        var kp = getOrCreatePhantomDappKey(nacl);
        var dappPk = b58encode(kp.publicKey);
        var appUrl = encodeURIComponent(originUrl());
        var redirect = encodeURIComponent(
          location.origin + location.pathname + '?phantom_cb=1'
        );
        var url =
          'https://phantom.app/ul/v1/connect' +
          '?app_url=' +
          appUrl +
          '&dapp_encryption_public_key=' +
          dappPk +
          '&redirect_link=' +
          redirect +
          '&cluster=mainnet-beta';
        toast('Opening Phantom — approve, then you come back here');
        window.location.href = url;
      } catch (e) {
        openInPhantomBrowser();
      }
    });
  }

  function openInPhantomBrowser() {
    var ref = encodeURIComponent(originUrl());
    var url = 'https://phantom.app/ul/browse/' + encodeURIComponent(fullUrl()) + '?ref=' + ref;
    toast('Open cession.fun inside Phantom, then tap Connect');
    window.location.href = url;
  }

  function handlePhantomRedirect() {
    var params = new URLSearchParams(location.search || '');
    if (params.get('errorCode')) {
      toast('Phantom connect cancelled');
      if (window.history && history.replaceState) {
        history.replaceState({}, '', location.origin + location.pathname);
      }
      return;
    }
    var data = params.get('data');
    var nonce = params.get('nonce');
    var phantomPk = params.get('phantom_encryption_public_key');
    if (!data || !nonce || !phantomPk) {
      if (params.get('phantom_cb') === '1' || params.get('phantom_connect') === '1') {
        if (connectPhantomInjected()) return;
      }
      return;
    }

    loadNacl(function (err, nacl) {
      if (err || !nacl) return;
      try {
        var kp = getOrCreatePhantomDappKey(nacl);
        var shared = nacl.box.before(b58decode(phantomPk), kp.secretKey);
        var decrypted = nacl.box.open.after(b58decode(data), b58decode(nonce), shared);
        if (!decrypted) {
          toast('Could not read Phantom response');
          return;
        }
        var json = JSON.parse(new TextDecoder().decode(decrypted));
        if (json.public_key) {
          if (json.session) sessionStorage.setItem(PHANTOM_SESSION_KEY, json.session);
          saveAddr(json.public_key, 'phantom');
        }
      } catch (e) {
        console.warn('[phantom redirect]', e);
        toast('Phantom handoff failed — try Connect again');
      }
    });
  }

  function connectPhantom() {
    if (connectPhantomInjected()) return;
    if (isMobile()) {
      connectPhantomMobileDeeplink();
      return;
    }
    window.open('https://phantom.app/download', '_blank', 'noopener');
  }

  function connectMetaMask() {
    var eth = getMetaMaskProvider();
    if (eth) {
      eth
        .request({ method: 'eth_requestAccounts' })
        .then(function (a) {
          if (a && a[0]) saveAddr(a[0], 'metamask');
        })
        .catch(function (err) {
          if (err && err.code === 4001) return;
        });
      return;
    }
    if (inWalletWebView() === 'metamask' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_requestAccounts' })
        .then(function (a) {
          if (a && a[0]) saveAddr(a[0], 'metamask');
        })
        .catch(function () {});
      return;
    }
    if (isMobile()) {
      var path = location.host + location.pathname + location.search;
      toast('Opens in MetaMask — then tap Connect MetaMask');
      window.location.href = 'https://link.metamask.io/dapp/' + path;
      return;
    }
    window.open('https://metamask.io/download/', '_blank', 'noopener');
  }

  function connectTrust() {
    var eth = getTrustProvider();
    if (eth) {
      eth
        .request({ method: 'eth_requestAccounts' })
        .then(function (a) {
          if (a && a[0]) saveAddr(a[0], 'trust');
        })
        .catch(function (err) {
          if (err && err.code === 4001) return;
        });
      return;
    }
    if (isMobile()) {
      toast('Opens in Trust — then tap Connect Trust');
      window.location.href =
        'https://link.trustwallet.com/open_url?coin_id=60&url=' + encodeURIComponent(fullUrl());
      return;
    }
    window.open('https://trustwallet.com/download', '_blank', 'noopener');
  }

  function resumeIfConnected() {
    try {
      handlePhantomRedirect();

      if (localStorage.getItem('cession_address') && localStorage.getItem('cession_session')) {
        enterApp();
        return;
      }

      var inside = inWalletWebView();
      if (inside && !localStorage.getItem('cession_address')) {
        if (inside === 'phantom') connectPhantomInjected();
        else if (inside === 'metamask') connectMetaMask();
        else if (inside === 'trust') connectTrust();
        return;
      }

      var ph = getPhantomProvider();
      if (ph && (ph.isConnected || ph.publicKey) && !localStorage.getItem('cession_address')) {
        var pk = ph.publicKey;
        if (pk) saveAddr(pk.toString(), 'phantom');
      }
      var mm = getMetaMaskProvider();
      if (mm && !localStorage.getItem('cession_address')) {
        mm.request({ method: 'eth_accounts' })
          .then(function (a) {
            if (a && a[0]) saveAddr(a[0], 'metamask');
          })
          .catch(function () {});
      }
      var tr = getTrustProvider();
      if (tr && !localStorage.getItem('cession_address')) {
        tr.request({ method: 'eth_accounts' })
          .then(function (a) {
            if (a && a[0]) saveAddr(a[0], 'trust');
          })
          .catch(function () {});
      }
    } catch (e) {}
  }

  function patch() {
    if (!window.CessionUI) window.CessionUI = {};
    window.CessionUI.connectPhantom = connectPhantom;
    window.CessionUI.connectMetaMask = connectMetaMask;
    window.CessionUI.connectTrust = connectTrust;
  }

  patch();
  document.addEventListener('DOMContentLoaded', function () {
    patch();
    resumeIfConnected();
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') resumeIfConnected();
    });
  });
  if (document.readyState !== 'loading') {
    resumeIfConnected();
  }
  var n = 0;
  var t = setInterval(function () {
    patch();
    if (++n > 20) clearInterval(t);
  }, 250);
})();
