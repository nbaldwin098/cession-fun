module.exports = {
  createLamports: 0,
  createNote: 'Create is free. Payer only covers Solana rent for mint and vaults.',
  totalBps: 100,
  split: {
    creatorBps: 50,
    holderBps: 20,
    protocolBps: 20,
    referralBps: 10
  },
  promo: {
    name: 'Launch promo',
    protocolOffBps: 10,
    userTotalBps: 90
  },
  graduation: {
    stayOnCession: true,
    bundleEligible: true,
    copy: 'When the curve fills, the coin stays on Cession. Those coins can enter official bundles.'
  },
  pumpCompare: {
    pumpCreate: 'Free (network rent only)',
    pumpCurveTotal: '1.25%',
    pumpCreatorOnCurve: '0.30%',
    cessionCreate: 'Free (network rent only)',
    cessionTotal: '1.00%',
    cessionCreator: '0.50%'
  }
};
