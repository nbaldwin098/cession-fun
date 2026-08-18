/**
 * FOREVER FEE LOCK
 * Protocol never above 0.20%. Trader never above 1.00%.
 */
function tier(marketCapUsd) {
  const m = Number(marketCapUsd) || 0;
  if (m < 500000) {
    return { name: 'early', totalBps: 100, creatorBps: 50, holderBps: 20, protocolBps: 20, referralBps: 10 };
  }
  if (m < 1000000) {
    return { name: 'made', totalBps: 85, creatorBps: 35, holderBps: 20, protocolBps: 20, referralBps: 10 };
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
