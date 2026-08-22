/**
 * Phantom / MetaMask / Trust only.
 * Order: injected provider (extension or in-app) → native app deep link → install.
 * Never invent addresses. No laggy multi-open.
 */
(function () {
  'use strict';

  function isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  }

  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent || '');
  }

  function originUrl() {
    return location.href.split('#')[0];
  }

  function hostPath() {
    return location.host + location.pathname + location.search;
  }

  function saveAddr(a, kind) {
    if (!a) return;
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
  }

  function closeModal() {
    var m = document.getElementById('walletModal');
    if (m) m.classList.remove('open');
  }

  function sync() {
    if (window.walletEngine && window.walletEngine.renderState) window.walletEngine.renderState();
    if (window.CessionWalletHub && CessionWalletHub.render) CessionWalletHub.render();
  }

  function openApp(schemeUrl, installUrl) {
    var left = false;
    function onHide() {
      if (document.visibilityState === 'hidden' || document.hidden) left = true;
    }
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);

    try {
      var iframe = document.createElement('iframe');
      iframe.style.cssText = 'display:none;width:0;height:0;border:0';
      iframe.src = schemeUrl;
      document.body.appendChild(iframe);
      setTimeout(function () {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1500);
    } catch (e) {}

    try {
      var a = document.createElement('a');
      a.href = schemeUrl;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        if (a.parentNode) a.parentNode.removeChild(a);
      }, 800);
    } catch (e2) {}

    setTimeout(function () {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      if (!left && document.visibilityState === 'visible' && installUrl) {
        window.location.href = installUrl;
      }
    }, 1800);
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
      var mm = eth.providers.find(function (p) { return p.isMetaMask && !p.isTrust && !p.isTrustWallet; });
      if (mm) return mm;
    }
    if (eth.isMetaMask && !eth.isTrust && !eth.isTrustWallet) return eth;
    return null;
  }

  function getTrustProvider() {
    var eth = window.ethereum;
    if (eth) {
      if (eth.providers && eth.providers.length) {
        var t = eth.providers.find(function (p) { return p.isTrust || p.isTrustWallet; });
        if (t) return t;
      }
      if (eth.isTrust || eth.isTrustWallet) return eth;
    }
    if (window.trustwallet && window.trustwallet.ethereum) return window.trustwallet.ethereum;
    return null;
  }

  function getTrustSolana() {
    if (window.trustwallet && window.trustwallet.solana) return window.trustwallet.solana;
    if (window.solana && window.solana.isTrust) return window.solana;
    return null;
  }

  function connectPhantom() {
    var provider = getPhantomProvider();
    if (provider) {
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
          if (isMobile()) openPhantomApp();
        });
      return;
    }
    if (isMobile()) {
      openPhantomApp();
      return;
    }
    window.open('https://phantom.app/download', '_blank', 'noopener');
  }

  function openPhantomApp() {
    var ref = encodeURIComponent(location.origin);
    var scheme = 'phantom://browse/' + encodeURIComponent(originUrl()) + '?ref=' + ref;
    var universal =
      'https://phantom.app/ul/browse/' + encodeURIComponent(originUrl()) + '?ref=' + ref;
    var install = isIOS()
      ? 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977'
      : isAndroid()
      ? 'https://play.google.com/store/apps/details?id=app.phantom'
      : 'https://phantom.app/download';

    openApp(scheme, null);
    setTimeout(function () {
      if (document.visibilityState === 'visible') {
        openApp(universal, install);
      }
    }, 900);
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
          if (isMobile()) openMetaMaskApp();
        });
      return;
    }
    if (isMobile() && window.ethereum && !window.ethereum.isTrust && !window.ethereum.isTrustWallet) {
      window.ethereum
        .request({ method: 'eth_requestAccounts' })
        .then(function (a) {
          if (a && a[0]) saveAddr(a[0], 'metamask');
        })
        .catch(function () {
          openMetaMaskApp();
        });
      return;
    }
    if (isMobile()) {
      openMetaMaskApp();
      return;
    }
    window.open('https://metamask.io/download/', '_blank', 'noopener');
  }

  function openMetaMaskApp() {
    var dappPath = hostPath();
    var scheme = 'metamask://dapp/' + dappPath;
    var universal = 'https://metamask.app.link/dapp/' + dappPath;
    var install = isIOS()
      ? 'https://apps.apple.com/app/metamask/id1438144202'
      : isAndroid()
      ? 'https://play.google.com/store/apps/details?id=io.metamask'
      : 'https://metamask.io/download/';

    openApp(scheme, null);
    setTimeout(function () {
      if (document.visibilityState === 'visible') {
        openApp(universal, install);
      }
    }, 900);
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
          if (isMobile()) openTrustApp();
        });
      return;
    }
    var sol = getTrustSolana();
    if (sol) {
      sol
        .connect()
        .then(function (res) {
          if (res && res.publicKey) saveAddr(res.publicKey.toString(), 'trust');
        })
        .catch(function () {
          if (isMobile()) openTrustApp();
        });
      return;
    }
    if (isMobile()) {
      openTrustApp();
      return;
    }
    window.open('https://trustwallet.com/download', '_blank', 'noopener');
  }

  function openTrustApp() {
    var url = encodeURIComponent(originUrl());
    var scheme = 'trust://open_url?coin_id=501&url=' + url;
    var universal = 'https://link.trustwallet.com/open_url?coin_id=501&url=' + url;
    var install = isIOS()
      ? 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409'
      : isAndroid()
      ? 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp'
      : 'https://trustwallet.com/download';

    openApp(scheme, null);
    setTimeout(function () {
      if (document.visibilityState === 'visible') {
        openApp(universal, install);
      }
    }, 900);
  }

  function resumeIfConnected() {
    try {
      var p = getPhantomProvider();
      if (p && (p.isConnected || p.publicKey)) {
        var pk = p.publicKey;
        if (pk) saveAddr(pk.toString(), 'phantom');
      }
      var mm = getMetaMaskProvider();
      if (mm) {
        mm.request({ method: 'eth_accounts' })
          .then(function (a) {
            if (a && a[0]) saveAddr(a[0], 'metamask');
          })
          .catch(function () {});
      }
      var tr = getTrustProvider();
      if (tr) {
        tr.request({ method: 'eth_accounts' })
          .then(function (a) {
            if (a && a[0]) saveAddr(a[0], 'trust');
          })
          .catch(function () {});
      }
      var ts = getTrustSolana();
      if (ts && ts.publicKey) {
        saveAddr(ts.publicKey.toString(), 'trust');
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
    window.addEventListener('focus', resumeIfConnected);
  });
  var n = 0;
  var t = setInterval(function () {
    patch();
    if (++n > 40) clearInterval(t);
  }, 250);
})();
