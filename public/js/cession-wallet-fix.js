(function () {
  function kill() {
    const w = window.walletEngine;
    if (!w) return setTimeout(kill, 50);
    const no = function () {
      alert('Use Phantom or MetaMask. Cession does not create or store seeds.');
    };
    w.generateNewVault = no;
    w.regenerateNewVaultMnemonic = no;
    w.importExistingVault = no;
    w.openCreateWalletModal = function () {
      if (window.CessionUI) CessionUI.go('wallet');
    };
    w.exportSecretPhrase = no;
    w.copyGeneratedMnemonic = no;
    w.copyCurrentMnemonic = no;
    w.confirmCreateVault = no;
    w.vaultData = null;
    try {
      localStorage.removeItem('cession_vault_data');
    } catch (e) {}
  }
  kill();
})();
