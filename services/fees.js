/**
 * FEE PATH
 * Now: curve steal.
 * After curve: keep winners at 0.40%.
 * Later: Cession pool at 0.20% to beat PumpSwap 0.25%.
 */
function tier(marketCapUsd, stage) {
  const m = Number(marketCapUsd) || 0;
  if (stage === 'pool') {
    return { name: 'pool', live: false, totalBps: 20, creatorBps: 0, holderBps: 0, protocolBps: 20, referralBps: 0 };
  }
  if (m < 500000) {
    return { name: 'curve', live: true, totalBps: 100, creatorBps: 50, holderBps: 20, protocolBps: 20, referralBps: 10 };
  }
  return { name: 'stay', live: true, totalBps: 40, creatorBps: 10, holderBps: 10, protocolBps: 20, referralBps: 0 };
}

module.exports = {
  createLamports: 0,
  protocolCapBps: 20,
  maxTraderBps: 100,
  laterPoolBps: 20,
  tier,
  graduation: { stayOnCession: true, bundleEligible: true, laterPool: true }
};
