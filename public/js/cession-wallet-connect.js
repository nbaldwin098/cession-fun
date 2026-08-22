/**
 * Wallet connect — desktop extensions + mobile in-app browser.
 * MetaMask/Trust/Phantom mobile: open cession.fun inside the wallet browser, then connect.
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
    }, 3200);
  }

  function cleanUrl() {
    try {
      if (window.history && history.replaceState) {
        history.replaceState({}, '', location.origin + location.pathname);
      }
    } catch (e) {}
  }

  function enterApp() {
    try {
      localStorage.setItem('cession_onboarded', '1');
      localStorage.setItem('cession_gate_ok', '1');
      var g = document.getElementById('cessionGate');
      if (g) g.classList.remove('open');
      document.documentElement.classList.remove('gated');
      document.body.classList.remove('gated');
      cleanUrl();
      if (window.CessionExchange && typeof CessionExchange.go === 'function') {
        CessionExchange.go();
      }
    } catch (e) {}
  }

  function closeModal() {
    var m = document.getElementById('walletModal');
    if (m) m.classList.remove('open');
  }

  function sync() {
    if (window.walletEngine && window.walletEngine.renderState) window.walletEngine.renderState();
    if (window.CessionWalletHub && CessionWalletHub.render) CessionWalletHub.render();
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
    else enterApp();
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
      .then(function () {
        signing = false;
        enterApp();
      })
      .catch(function () {
        signing = false;
        enterApp();
      });
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

  function openInPhantomBrowser() {
    var ref = encodeURIComponent(originUrl());
    var url = 'https://phantom.app/ul/browse/' + encodeURIComponent(fullUrl()) + '?ref=' + ref;
    toast('Opening inside Phantom — tap Connect Phantom when the site loads');
    window.location.href = url;
  }

  function connectPhantom() {
    if (connectPhantomInjected()) return;
    if (isMobile()) {
      openInPhantomBrowser();
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
      toast('Opening inside MetaMask — tap Connect MetaMask when the site loads');
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
      toast('Opening inside Trust — tap Connect Trust when the site loads');
      window.location.href =
        'https://link.trustwallet.com/open_url?coin_id=60&url=' + encodeURIComponent(fullUrl());
      return;
    }
    window.open('https://trustwallet.com/download', '_blank', 'noopener');
  }

  function resumeIfConnected() {
    try {
      if (localStorage.getItem('cession_address')) {
        enterApp();
        return;
      }

      var inside = inWalletWebView();
      if (inside) {
        if (inside === 'phantom') connectPhantomInjected();
        else if (inside === 'metamask') connectMetaMask();
        else if (inside === 'trust') connectTrust();
        setTimeout(function () {
          if (localStorage.getItem('cession_address')) enterApp();
        }, 1200);
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
