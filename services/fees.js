function tier(marketCapUsd) {
  const m = Number(marketCapUsd) || 0;
  if (m < 88000) {
    return { name: 'early', totalBps: 100, creatorBps: 50, holderBps: 20, protocolBps: 20, referralBps: 10 };
  }
  if (m < 300000) {
    return { name: 'sweet', totalBps: 125, creatorBps: 95, holderBps: 10, protocolBps: 15, referralBps: 5 };
  }
  if (m < 1000000) {
    return { name: 'growth', totalBps: 100, creatorBps: 50, holderBps: 20, protocolBps: 20, referralBps: 10 };
  }
  if (m < 5000000) {
    return { name: 'large', totalBps: 80, creatorBps: 20, holderBps: 15, protocolBps: 35, referralBps: 10 };
  }
  if (m < 20000000) {
    return { name: 'huge', totalBps: 60, creatorBps: 10, holderBps: 10, protocolBps: 35, referralBps: 5 };
  }
  return { name: 'mega', totalBps: 50, creatorBps: 5, holderBps: 10, protocolBps: 30, referralBps: 5 };
}

function sellSurchargeBps(holdMinutes) {
  const h = Number(holdMinutes);
  if (!Number.isFinite(h) || h < 15) return 50;
  if (h < 240) return 25;
  return 0;
}

function quote(side, marketCapUsd, holdMinutes) {
  const t = tier(marketCapUsd);
  const extra = side === 'sell' ? sellSurchargeBps(holdMinutes) : 0;
  return {
    ...t,
    side,
    holdMinutes: holdMinutes || 0,
    dumpTaxBps: extra,
    traderPaysBps: t.totalBps + extra,
    protocolBps: t.protocolBps + extra
  };
}

module.exports = {
  createLamports: 0,
  locked: 'create free; creator ladder never cut; dump tax is extra protocol only',
  tier,
  sellSurchargeBps,
  quote,
  graduation: { stayOnCession: true, bundleEligible: true }
};
