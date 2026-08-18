/**
 * FEE LOCK — do not lower creator, holder, or referral.
 * Protocol 0.20% may be reduced for a named promo. Never raise user total above 1.00% without a public change.
 */
module.exports = {
  locked: true,
  createLamports: 0,
  createNote: 'Create is free. Payer only covers Solana rent.',
  totalBps: 100,
  split: {
    creatorBps: 50,
    holderBps: 20,
    protocolBps: 20,
    referralBps: 10
  },
  floors: {
    creatorBps: 50,
    holderBps: 20,
    referralBps: 10
  },
  promo: {
    allowed: 'protocolBps only',
    protocolOffBps: 10,
    userTotalBps: 90
  },
  graduation: {
    stayOnCession: true,
    bundleEligible: true
  }
};
