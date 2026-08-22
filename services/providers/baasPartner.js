/**
 * Banking-as-a-Service partner adapter. Demo unless BAAS_API_KEY set.
 */
const crypto = require('crypto');

function MODE() {
  const key = String(process.env.BAAS_API_KEY || '').trim();
  return key ? 'live' : 'demo';
}

function demoWalletSeed(wallet) {
  const h = crypto.createHash('sha256').update(String(wallet || 'anon')).digest();
  const n = h.readUInt32BE(0);
  const checking = 500 + (n % 9000) / 10;
  const savings = 200 + (n % 5000) / 10;
  return {
    checking: +checking.toFixed(2),
    savings: +savings.toFixed(2),
    cashbackMonth: +((n % 4000) / 100).toFixed(2),
    cashbackLife: +((n % 20000) / 100).toFixed(2)
  };
}

async function getCustomerSummary(wallet) {
  const mode = MODE();
  const seed = demoWalletSeed(wallet);
  const cashbackRate = Number(process.env.BAAS_CASHBACK_PCT || 1.5);
  return {
    ok: true,
    demo: mode !== 'live',
    mode,
    asOf: new Date().toISOString(),
    wallet: wallet || null,
    disclosure:
      'Banking services will be provided by a licensed BaaS partner. Cession does not hold customer funds or full personal information except for fraud / non-payment cases.',
    accounts: {
      checking: {
        id: mode === 'live' ? undefined : 'acc_demo_chk',
        available: seed.checking,
        currency: 'USD',
        status: 'active'
      },
      savings: {
        id: mode === 'live' ? undefined : 'acc_demo_sav',
        available: seed.savings,
        currency: 'USD',
        apyDisplay: process.env.BAAS_SAVINGS_APY_DISPLAY || '4.15%',
        status: 'active'
      }
    },
    cashback: {
      thisMonth: seed.cashbackMonth,
      lifetime: seed.cashbackLife,
      rateDisplay: cashbackRate + '% on eligible spend'
    },
    cards: [
      {
        id: 'card_demo_1',
        last4: '4242',
        network: 'Visa',
        status: 'active',
        type: 'debit',
        label: 'Cession Debit'
      }
    ],
    family: {
      parentAccounts: 1,
      kidAccounts: 0,
      note: 'Parent & kid accounts available when live BaaS partner is connected.'
    },
    provider: mode === 'live' ? (process.env.BAAS_PROVIDER_NAME || 'BaaS Partner') : 'BaaS Partner (demo)'
  };
}

async function listTransactions(wallet, limit = 20) {
  const mode = MODE();
  return {
    ok: true,
    demo: mode !== 'live',
    wallet,
    items: [
      { id: 'tx1', title: 'Cashback credit', sub: 'Monthly rewards', amount: 4.2, dir: 'up', when: 'Today' },
      { id: 'tx2', title: 'Card spend', sub: 'Debit ••••4242', amount: -6.5, dir: 'down', when: 'Yesterday' },
      { id: 'tx3', title: 'ACH deposit', sub: 'From external bank', amount: 500, dir: 'up', when: '3d ago' },
      { id: 'tx4', title: 'Daily crypto give-back', sub: 'SOL micro-reward', amount: 0.12, dir: 'up', when: '4d ago' }
    ].slice(0, limit)
  };
}

async function createAchDeposit({ wallet, amount, externalAccountRef }) {
  const mode = MODE();
  const amt = Math.max(1, Number(amount) || 0);
  if (!wallet) return { ok: false, error: 'wallet required' };
  if (amt < 1) return { ok: false, error: 'amount too small' };
  return {
    ok: true,
    demo: mode !== 'live',
    mode,
    transferId: (mode === 'live' ? 'ach_' : 'ach_demo_') + Date.now(),
    status: mode === 'live' ? 'pending' : 'pending_demo',
    amount: amt,
    currency: 'USD',
    wallet,
    externalAccountRef: externalAccountRef || null,
    message: mode === 'live' ? 'ACH deposit initiated with partner bank.' : 'Demo ACH recorded. Connect BAAS_API_KEY for live deposits.'
  };
}

async function createAchWithdraw({ wallet, amount, externalAccountRef }) {
  const mode = MODE();
  const amt = Math.max(1, Number(amount) || 0);
  if (!wallet) return { ok: false, error: 'wallet required' };
  return {
    ok: true,
    demo: mode !== 'live',
    mode,
    transferId: (mode === 'live' ? 'achw_' : 'achw_demo_') + Date.now(),
    status: mode === 'live' ? 'pending' : 'pending_demo',
    amount: amt,
    currency: 'USD',
    wallet,
    externalAccountRef: externalAccountRef || null,
    message: mode === 'live' ? 'ACH withdrawal initiated.' : 'Demo withdrawal recorded. Partner executes when live.'
  };
}

async function freezeCard({ cardId, wallet, reason }) {
  return {
    ok: true,
    demo: MODE() !== 'live',
    cardId,
    wallet,
    status: 'frozen',
    reason: reason || 'user_request'
  };
}

async function handleWebhook(body) {
  return {
    ok: true,
    received: true,
    demo: MODE() !== 'live',
    eventType: (body && body.type) || 'unknown'
  };
}

module.exports = {
  MODE,
  getCustomerSummary,
  listTransactions,
  createAchDeposit,
  createAchWithdraw,
  freezeCard,
  handleWebhook
};
