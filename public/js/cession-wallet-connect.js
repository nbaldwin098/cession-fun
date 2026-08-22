/**
 * Phantom / MetaMask / Trust only.
 * Mobile: open native apps via universal / deep links, then return to this origin.
 * Desktop: injected provider only — never invent addresses.
 */
(function () {
  'use strict';

  function isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  }

  function originUrl() {
    return location.origin + location.pathname + location.search;
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
  }

  function closeModal() {
    var m = document.getElementById('walletModal');
    if (m) m.classList.remove('open');
  }

  function sync() {
    if (window.walletEngine && window.walletEngine.renderState) window.walletEngine.renderState();
    if (window.CessionWalletHub && CessionWalletHub.render) CessionWalletHub.render();
  }

  function openDeep(urls) {
    var i = 0;
    function tryNext() {
      if (i >= urls.length) return;
      var u = urls[i++];
      try {
        var a = document.createElement('a');
        a.href = u;
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          if (a.parentNode) a.parentNode.removeChild(a);
        }, 500);
      } catch (e) {
        tryNext();
      }
    }
    tryNext();
  }

  function connectPhantom() {
    var provider = window.phantom && window.phantom.solana
      ? window.phantom.solana
      : window.solana && window.solana.isPhantom
      ? window.solana
      : null;

    if (provider) {
      provider
        .connect({ onlyIfTrusted: false })
        .then(function (res) {
          var key = res && res.publicKey ? res.publicKey.toString() : (provider.publicKey && provider.publicKey.toString());
          if (key) {
            saveAddr(key, 'phantom');
            sync();
          }
        })
        .catch(function () {});
      return;
    }

    if (isMobile()) {
      var browse =
        'https://phantom.app/ul/browse/' +
        encodeURIComponent(originUrl()) +
        '?ref=' +
        encodeURIComponent(location.origin);
      openDeep([browse, 'https://phantom.app/download']);
      return;
    }
    window.open('https://phantom.app/download', '_blank', 'noopener');
  }

  function connectMetaMask() {
    var eth = window.ethereum;
    if (eth && eth.providers) {
      eth = eth.providers.find(function (p) { return p.isMetaMask; }) || eth;
    }
    if (eth && (eth.isMetaMask || !eth.isTrust)) {
      eth
        .request({ method: 'eth_requestAccounts' })
        .then(function (a) {
          if (a && a[0]) {
            saveAddr(a[0], 'metamask');
            sync();
          }
        })
        .catch(function () {});
      return;
    }
    if (isMobile()) {
      var dapp =
        'https://metamask.app.link/dapp/' +
        location.host +
        location.pathname +
        location.search;
      openDeep([dapp, 'https://metamask.io/download/']);
      return;
    }
    window.open('https://metamask.io/download/', '_blank', 'noopener');
  }

  function connectTrust() {
    var eth = window.ethereum;
    if (eth && eth.providers) {
      eth =
        eth.providers.find(function (p) {
          return p.isTrust || p.isTrustWallet;
        }) || eth;
    }
    if (eth && (eth.isTrust || eth.isTrustWallet)) {
      eth
        .request({ method: 'eth_requestAccounts' })
        .then(function (a) {
          if (a && a[0]) {
            saveAddr(a[0], 'trust');
            sync();
          }
        })
        .catch(function () {});
      return;
    }
    if (window.trustwallet && window.trustwallet.solana) {
      window.trustwallet.solana
        .connect()
        .then(function (res) {
          if (res && res.publicKey) {
            saveAddr(res.publicKey.toString(), 'trust');
            sync();
          }
        })
        .catch(function () {});
      return;
    }
    if (isMobile()) {
      var link =
        'https://link.trustwallet.com/open_url?coin_id=501&url=' +
        encodeURIComponent(originUrl());
      openDeep([link, 'https://trustwallet.com/download']);
      return;
    }
    window.open('https://trustwallet.com/download', '_blank', 'noopener');
  }

  function resumeIfConnected() {
    try {
      if (window.phantom && window.phantom.solana && window.phantom.solana.isConnected) {
        var pk = window.phantom.solana.publicKey;
        if (pk) saveAddr(pk.toString(), 'phantom');
      } else if (window.solana && window.solana.isPhantom && window.solana.isConnected) {
        if (window.solana.publicKey) saveAddr(window.solana.publicKey.toString(), 'phantom');
      }
      if (window.ethereum) {
        window.ethereum.request({ method: 'eth_accounts' }).then(function (a) {
          if (a && a[0]) {
            var kind = window.ethereum.isTrust || window.ethereum.isTrustWallet ? 'trust' : 'metamask';
            saveAddr(a[0], kind);
          }
        }).catch(function () {});
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
  var n = 0;
  var t = setInterval(function () {
    patch();
    if (++n > 40) clearInterval(t);
  }, 250);
})();
