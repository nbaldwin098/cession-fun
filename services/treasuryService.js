const TREASURY = process.env.TREASURY_SOL_ADDRESS || '9MeQ5XiESSZPUVNzqKQjB9JYEWZScH1shwsbQMfYUTRU';

class TreasuryService {
  constructor() {
    this.address = TREASURY;
    this.explorerUrl = `https://solscan.io/account/${TREASURY}`;
    // Arkham Intelligence gives a richer, third-party-verified wallet/entity profile
    // (labeled inflows/outflows, balances) than a plain block explorer — this is the
    // "proof of funds" profile linked from the site footer.
    this.arkhamUrl = `https://intel.arkm.com/explorer/address/${TREASURY}`;
  }

  getPublicProofOfReserves() {
    return {
      success: true,
      address: this.address,
      explorerUrl: this.explorerUrl,
      arkhamUrl: this.arkhamUrl,
      createFee: '0.05 SOL',
      curveFee: '1.00% = 0.50 creator / 0.25 holders / 0.25 protocol',
      note: 'Live balance is on Solscan/Arkham. This server does not invent holdings.'
    };
  }

  getPublicReserves() {
    return this.getPublicProofOfReserves();
  }
}

module.exports = new TreasuryService();
