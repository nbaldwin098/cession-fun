/**
 * FOREVER FEE LOCK
 * Trader never pays more than 1.00%.
 * Protocol never above 0.20%. Promo may only cut protocol.
 */
function tier(marketCapUsd) {
  const m = Number(marketCapUsd) || 0;
  if (m < 1000000) {
    return { name: 'standard', totalBps: 100, creatorBps: 50, holderBps: 20, protocolBps: 20, referralBps: 10 };
  }
  return { name: 'scale', totalBps: 70, creatorBps: 25, holderBps: 20, protocolBps: 20, referralBps: 5 };
}

module.exports = {
  createLamports: 0,
  locked: true,
  forever: true,
  protocolCapBps: 20,
  maxTraderBps: 100,
  tier,
  graduation: { stayOnCession: true, bundleEligible: true }
};
