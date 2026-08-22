/**
 * Phantom / MetaMask / Trust — extension or native app.
 * One connect prompt, one sign-in prompt, then return to app.
 */
(function () {
  'use strict';

  var signing = false;
  var lastSaved = '';

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
    }, 2200);
  }

  function enterApp() {
    try {
      localStorage.setItem('cession_onboarded', '1');
      localStorage.setItem('cession_gate_ok', '1');
      var g = document.getElementById('cessionGate');
      if (g) g.classList.remove('open');
      document.documentElement.classList.remove('gated');
      document.body.classList.remove('gated');
      if (location.search && /phantom_connect|phantom_encryption/.test(location.search)) {
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
        if (r && r.ok) {
          enterApp();
        }
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

  function openNativeScheme(scheme, fallbackStore) {
    var left = false;
    function onHide() {
      if (document.visibilityState === 'hidden' || document.hidden) left = true;
    }
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    try {
      var a = document.createElement('a');
      a.href = scheme;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        if (a.parentNode) a.parentNode.removeChild(a);
      }, 600);
    } catch (e) {
      try {
        window.location.href = scheme;
      } catch (e2) {}
    }
    setTimeout(function () {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      if (!left && fallbackStore && document.visibilityState === 'visible') {
        window.open(fallbackStore, '_blank', 'noopener');
      }
    }, 2000);
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
        });
      return;
    }
    if (isMobile()) {
      var appUrl = encodeURIComponent(originUrl());
      var redirect = encodeURIComponent(
        fullUrl() + (fullUrl().indexOf('?') >= 0 ? '&' : '?') + 'phantom_connect=1'
      );
      var universal =
        'https://phantom.app/ul/v1/connect?app_url=' +
        appUrl +
        '&redirect_link=' +
        redirect +
        '&cluster=mainnet-beta';
      var scheme =
        'phantom://ul/v1/connect?app_url=' +
        appUrl +
        '&redirect_link=' +
        redirect +
        '&cluster=mainnet-beta';
      openNativeScheme(scheme, null);
      setTimeout(function () {
        if (document.visibilityState === 'visible') {
          openNativeScheme(
            universal,
            isIOS()
              ? 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977'
              : 'https://play.google.com/store/apps/details?id=app.phantom'
          );
        }
      }, 1000);
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
      openNativeScheme(
        'metamask://dapp/' + path,
        isIOS()
          ? 'https://apps.apple.com/app/metamask/id1438144202'
          : 'https://play.google.com/store/apps/details?id=io.metamask'
      );
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
    var sol = getTrustSolana();
    if (sol) {
      sol
        .connect()
        .then(function (res) {
          if (res && res.publicKey) saveAddr(res.publicKey.toString(), 'trust');
        })
        .catch(function () {});
      return;
    }
    if (isMobile()) {
      openNativeScheme(
        'trust://open_url?coin_id=501&url=' + encodeURIComponent(fullUrl()),
        isIOS()
          ? 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409'
          : 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp'
      );
      return;
    }
    window.open('https://trustwallet.com/download', '_blank', 'noopener');
  }

  function resumeIfConnected() {
    try {
      var params = new URLSearchParams(location.search || '');
      if (params.get('phantom_connect') === '1' || params.get('phantom_encryption_public_key')) {
        var p = getPhantomProvider();
        if (p) {
          p.connect({ onlyIfTrusted: true })
            .then(function (res) {
              var key =
                (res && res.publicKey && res.publicKey.toString()) ||
                (p.publicKey && p.publicKey.toString());
              if (key) saveAddr(key, 'phantom');
            })
            .catch(function () {});
        }
      }

      if (localStorage.getItem('cession_address') && localStorage.getItem('cession_session')) {
        enterApp();
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
  var n = 0;
  var t = setInterval(function () {
    patch();
    if (++n > 20) clearInterval(t);
  }, 250);
})();
