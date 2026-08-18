/**
 * Cession Sovereign Multi-Chain Wallet & Screening Engine
 * STRICT NON-CUSTODIAL MODEL:
 * The backend NEVER generates, stores, or returns seed phrases or private keys.
 * All wallet identity is managed client-side by Phantom (Solana) and MetaMask (Ethereum).
 */

const ofacChecker = require('./ofacChecker');

class WalletEngine {
  /**
   * Screen a wallet address for OFAC sanctions compliance
   */
  screenWallet(address) {
    if (!address) return { allowed: false, detail: 'No address provided' };
    return ofacChecker.screenAddress(address);
  }

  /**
   * Format shortened wallet display name
   */
  formatShortAddress(address) {
    if (!address) return '0x000...0000';
    if (address.length <= 10) return address;
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  }
}

module.exports = new WalletEngine();
