(function () {
  function save(addr, kind) {
    if (!addr) return;
    localStorage.setItem('cession_address', addr);
    localStorage.setItem('cession_wallet_type', kind || '');
    this.activeAddress = addr;
    this.activeWalletType = kind;
    this.isAuthenticated = true;
    this.renderState();
  }

  function CessionWalletEngine() {
    this.activeAddress = localStorage.getItem('cession_address') || '';
    this.activeWalletType = localStorage.getItem('cession_wallet_type') || 'none';
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

  CessionWalletEngine.prototype.logout = function () {
    this.activeAddress = '';
    this.activeWalletType = 'none';
    this.isAuthenticated = false;
    localStorage.removeItem('cession_address');
    localStorage.removeItem('cession_wallet_type');
    this.renderState();
  };

  CessionWalletEngine.prototype.generateNewVault = function () {
    if (window.CessionWalletCreate) CessionWalletCreate.start();
  };
  CessionWalletEngine.prototype.openCreateWalletModal = function () {
    if (window.CessionWalletCreate) CessionWalletCreate.start();
  };
  CessionWalletEngine.prototype.importExistingVault = function () {};
  CessionWalletEngine.prototype.exportSecretPhrase = function () {};

  CessionWalletEngine.prototype.renderState = function () {
    const addr = this.activeAddress || localStorage.getItem('cession_address') || '';
    const out = document.getElementById('walletScreenDisconnected');
    const inn = document.getElementById('walletScreenConnected');
    const line = document.getElementById('walletScreenAddress');
    if (out) out.style.display = addr ? 'none' : 'block';
    if (inn) inn.style.display = addr ? 'block' : 'none';
    if (line) line.textContent = addr || 'Not connected';
  };

  window.CessionWalletEngine = CessionWalletEngine;
  window.walletEngine = new CessionWalletEngine();
})();
