/**
 * Platform fee schedule.
 * FEES_ENABLED=0 (default) \u2192 all platform fees 0 until explicitly turned on.
 */
const ENABLED = String(process.env.FEES_ENABLED || '0') === '1';
const PLATFORM_BPS = ENABLED ? Number(process.env.FEE_PLATFORM_BPS || 95) : 0;

function tier(marketCapUsd, stage) {
  const m = Number(marketCapUsd) || 0;
  if (!ENABLED) {
    return {
      name: stage === 'pool' ? 'pool' : m < 500000 ? 'curve' : 'stay',
      live: false,
      totalBps: 0,
      creatorBps: 0,
      holderBps: 0,
      protocolBps: 0,
      referralBps: 0,
      enabled: false
    };
  }
  if (stage === 'pool') {
    return { name: 'pool', live: false, totalBps: 20, creatorBps: 0, holderBps: 0, protocolBps: 20, referralBps: 0, enabled: true };
  }
  if (m < 500000) {
    return { name: 'curve', live: true, totalBps: 100, creatorBps: 50, holderBps: 25, protocolBps: 25, referralBps: 0, enabled: true };
  }
  return { name: 'stay', live: true, totalBps: 40, creatorBps: 10, holderBps: 10, protocolBps: 20, referralBps: 0, enabled: true };
}

function platformBps() {
  return PLATFORM_BPS;
}

function quotePlatformFee(amountUsd) {
  const amt = Math.max(0, Number(amountUsd) || 0);
  const fee = (amt * PLATFORM_BPS) / 10000;
  return { enabled: ENABLED, bps: PLATFORM_BPS, feeUsd: Number(fee.toFixed(6)), amountUsd: amt };
}

module.exports = {
  createLamports: 0,
  referral: 'bonus_or_discount_only',
  tier,
  platformBps,
  quotePlatformFee,
  ENABLED,
  graduation: { stayOnCession: true, bundleEligible: true, laterPool: true }
};
