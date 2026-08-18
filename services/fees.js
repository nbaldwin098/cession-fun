function tier(marketCapUsd) {
  const m = Number(marketCapUsd) || 0;
  if (m < 88000) {
    return { name: 'small', totalBps: 100, creatorBps: 55, holderBps: 20, protocolBps: 20, referralBps: 5 };
  }
  if (m < 300000) {
    return { name: 'sweet', totalBps: 125, creatorBps: 95, holderBps: 5, protocolBps: 20, referralBps: 5 };
  }
  if (m < 20000000) {
    return { name: 'large', totalBps: 80, creatorBps: 30, holderBps: 20, protocolBps: 20, referralBps: 10 };
  }
  return { name: 'huge', totalBps: 50, creatorBps: 15, holderBps: 10, protocolBps: 20, referralBps: 5 };
}

module.exports = {
  createLamports: 0,
  locked: true,
  protocolCapBps: 20,
  note: 'Steal-all ladder. Protocol never above 0.20%. Promo may only cut protocol.',
  tier,
  graduation: { stayOnCession: true, bundleEligible: true }
};
