const TREASURY = process.env.TREASURY_SOL_ADDRESS || '9MeQ5XiESSZPUVNzqKQjB9JYEWZScH1shwsbQMfYUTRU';

class TreasuryService {
  constructor() {
    this.address = TREASURY;
    this.explorerUrl = `https://solscan.io/account/${TREASURY}`;
  }

  getPublicProofOfReserves() {
    return {
      success: true,
      address: this.address,
      explorerUrl: this.explorerUrl,
      createFee: '0.05 SOL',
      curveFee: '1.00% = 0.50 creator / 0.25 holders / 0.25 protocol',
      note: 'Live balance is on Solscan. This server does not invent holdings.'
    };
  }

  getPublicReserves() {
    return this.getPublicProofOfReserves();
  }
}

module.exports = new TreasuryService();
