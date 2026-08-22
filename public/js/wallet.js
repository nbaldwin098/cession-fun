/**
 * Wallet engine — external wallets ONLY.
 * Allowed: Phantom (Solana), MetaMask (EVM), Trust Wallet (EVM / injected).
 * No in-app key generation, no seed phrase vaults, no imported private keys.
 */
(function () {
  'use strict';

  var ALLOWED = ['phantom', 'metamask', 'trust'];

  function save(addr, kind) {
    if (!addr || ALLOWED.indexOf(kind) < 0) return;
    localStorage.setItem('cession_address', String(addr));
    localStorage.setItem('cession_wallet_type', kind);
    this.activeAddress = String(addr);
    this.activeWalletType = kind;
    this.isAuthenticated = true;
    this.renderState();
  }

  function CessionWalletEngine() {
    this.activeAddress = localStorage.getItem('cession_address') || '';
    this.activeWalletType = localStorage.getItem('cession_wallet_type') || 'none';
    if (ALLOWED.indexOf(this.activeWalletType) < 0) {
      this.activeWalletType = 'none';
    }
    this.isAuthenticated = !!this.activeAddress;
    this.renderState();
  }

  CessionWalletEngine.prototype.save = save;

  CessionWalletEngine.prototype.connectPhantom = function () {
    if (window.CessionUI && CessionUI.connectPhantom) return CessionUI.connectPhantom();
  };

  CessionWalletEngine.prototype.connectMetaMask = function () {
    if (window.CessionUI && CessionUI.connectMetaMask) return CessionUI.connectMetaMask();
  };

  CessionWalletEngine.prototype.connectTrust = function () {
    if (window.CessionUI && CessionUI.connectTrust) return CessionUI.connectTrust();
  };

  CessionWalletEngine.prototype.logout = function () {
    this.activeAddress = '';
    this.activeWalletType = 'none';
    this.isAuthenticated = false;
    localStorage.removeItem('cession_address');
    localStorage.removeItem('cession_wallet_type');
    this.renderState();
  };

  CessionWalletEngine.prototype.generateNewVault = function () {
    alert('In-app wallets are disabled. Use Phantom, MetaMask, or Trust Wallet.');
  };
  CessionWalletEngine.prototype.openCreateWalletModal = function () {
    alert('In-app wallets are disabled. Use Phantom, MetaMask, or Trust Wallet.');
  };
  CessionWalletEngine.prototype.importExistingVault = function () {
    alert('Importing private keys is not supported. Connect Phantom, MetaMask, or Trust Wallet.');
  };
  CessionWalletEngine.prototype.exportSecretPhrase = function () {
    alert('Cession never stores seed phrases.');
  };

  CessionWalletEngine.prototype.renderState = function () {
    var addr = this.activeAddress || localStorage.getItem('cession_address') || '';
    var out = document.getElementById('walletScreenDisconnected');
    var inn = document.getElementById('walletScreenConnected');
    var line = document.getElementById('walletScreenAddress');
    var typeLine = document.getElementById('walletScreenType');
    if (out) out.style.display = addr ? 'none' : 'block';
    if (inn) inn.style.display = addr ? 'block' : 'none';
    if (line) line.textContent = addr || 'Not connected';
    if (typeLine) {
      typeLine.textContent = addr
        ? 'Via ' + (this.activeWalletType || localStorage.getItem('cession_wallet_type') || 'wallet')
        : '';
    }
  };

  window.CessionWalletEngine = CessionWalletEngine;
  window.walletEngine = new CessionWalletEngine();
})();
