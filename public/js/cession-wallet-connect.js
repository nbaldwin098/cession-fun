/**
 * External wallet connect — Phantom, MetaMask, Trust only.
 * Patches CessionUI after shell loads. No in-app wallets.
 */
(function () {
  'use strict';

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
  }

  function sync() {
    if (window.walletEngine && window.walletEngine.renderState) window.walletEngine.renderState();
  }

  function connectPhantom() {
    if (window.solana && window.solana.isPhantom !== false) {
      window.solana
        .connect()
        .then(function (res) {
          if (res.publicKey) {
            saveAddr(res.publicKey.toString(), 'phantom');
            sync();
          }
        })
        .catch(function () {});
      return;
    }
    if (window.CessionUI && CessionUI.open) CessionUI.open('walletModal');
    else window.open('https://phantom.app/', '_blank');
  }

  function connectMetaMask() {
    var eth = window.ethereum;
    if (eth && eth.providers) {
      eth = eth.providers.find(function (p) { return p.isMetaMask; }) || eth;
    }
    if (eth) {
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
    window.open('https://metamask.io/download/', '_blank');
  }

  function connectTrust() {
    var eth = window.ethereum;
    if (eth && eth.providers) {
      eth =
        eth.providers.find(function (p) {
          return p.isTrust || p.isTrustWallet;
        }) || eth;
    }
    if (eth && (eth.isTrust || eth.isTrustWallet || !eth.isMetaMask)) {
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
    location.href =
      'https://link.trustwallet.com/open_url?coin_id=60&url=' +
      encodeURIComponent(location.href);
  }

  function patch() {
    if (!window.CessionUI) window.CessionUI = {};
    window.CessionUI.connectPhantom = connectPhantom;
    window.CessionUI.connectMetaMask = connectMetaMask;
    window.CessionUI.connectTrust = connectTrust;
  }

  patch();
  document.addEventListener('DOMContentLoaded', patch);
  var n = 0;
  var t = setInterval(function () {
    patch();
    if (++n > 40) clearInterval(t);
  }, 250);
})();
