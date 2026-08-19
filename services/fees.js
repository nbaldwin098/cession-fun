function tier(marketCapUsd, stage) {
  const m = Number(marketCapUsd) || 0;
  if (stage === 'pool') {
    return { name: 'pool', live: false, totalBps: 20, creatorBps: 0, holderBps: 0, protocolBps: 20, referralBps: 0 };
  }
  if (m < 500000) {
    return { name: 'curve', live: true, totalBps: 100, creatorBps: 50, holderBps: 25, protocolBps: 25, referralBps: 0 };
  }
  return { name: 'stay', live: true, totalBps: 40, creatorBps: 10, holderBps: 10, protocolBps: 20, referralBps: 0 };
}

module.exports = {
  createLamports: 0,
  referral: 'bonus_or_discount_only',
  tier,
  graduation: { stayOnCession: true, bundleEligible: true, laterPool: true }
};
