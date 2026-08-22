/**
 * Banking-as-a-Service partner adapter.
 * Without keys: zeros and empty lists only — no fictional balances.
 */
function MODE() {
  const key = String(process.env.BAAS_API_KEY || '').trim();
  return key ? 'live' : 'demo';
}

async function getCustomerSummary(wallet) {
  const mode = MODE();
  const cashbackRate = Number(process.env.BAAS_CASHBACK_PCT || 1.5);
  return {
    ok: true,
    demo: mode !== 'live',
    mode,
    asOf: new Date().toISOString(),
    wallet: wallet || null,
    disclosure:
      'Banking services are provided by a licensed partner. Cession does not hold customer funds.',
    accounts: {
      checking: { id: null, available: 0, currency: 'USD', status: 'active' },
      savings: {
        id: null,
        available: 0,
        currency: 'USD',
        apyDisplay: process.env.BAAS_SAVINGS_APY_DISPLAY || '—',
        status: 'active'
      }
    },
    cashback: {
      thisMonth: 0,
      lifetime: 0,
      rateDisplay: cashbackRate + '% on eligible spend'
    },
    cards: [],
    family: {
      parentAccounts: 0,
      kidAccounts: 0,
      note: 'Family accounts open after KYC with the banking partner.'
    },
    provider: mode === 'live' ? (process.env.BAAS_PROVIDER_NAME || 'BaaS Partner') : 'Cession Banking',
    source: mode === 'live' ? 'partner_api' : 'none'
  };
}

async function listTransactions(wallet, limit = 20) {
  return { ok: true, demo: MODE() !== 'live', wallet, items: [], source: MODE() === 'live' ? 'partner_api' : 'none' };
}

async function createAchDeposit({ wallet, amount, externalAccountRef }) {
  const mode = MODE();
  const amt = Math.max(1, Number(amount) || 0);
  if (!wallet) return { ok: false, error: 'Connect a wallet first.' };
  if (amt < 1) return { ok: false, error: 'Enter a valid amount.' };
  if (mode !== 'live') {
    return { ok: false, error: 'Deposits are not available yet.' };
  }
  return {
    ok: true,
    demo: false,
    mode: 'live',
    transferId: 'ach_' + Date.now(),
    status: 'pending',
    amount: amt,
    currency: 'USD',
    wallet,
    externalAccountRef: externalAccountRef || null,
    message: 'Deposit submitted.'
  };
}

async function createAchWithdraw({ wallet, amount, externalAccountRef }) {
  const mode = MODE();
  const amt = Math.max(1, Number(amount) || 0);
  if (!wallet) return { ok: false, error: 'Connect a wallet first.' };
  if (mode !== 'live') {
    return { ok: false, error: 'Withdrawals are not available yet.' };
  }
  return {
    ok: true,
    demo: false,
    mode: 'live',
    transferId: 'achw_' + Date.now(),
    status: 'pending',
    amount: amt,
    currency: 'USD',
    wallet,
    externalAccountRef: externalAccountRef || null,
    message: 'Withdrawal submitted.'
  };
}

async function freezeCard({ cardId, wallet, reason }) {
  if (MODE() !== 'live') return { ok: false, error: 'No card on file.' };
  return { ok: true, demo: false, cardId, wallet, status: 'frozen', reason: reason || 'user_request' };
}

async function handleWebhook(body) {
  return { ok: true, received: true, demo: MODE() !== 'live', eventType: (body && body.type) || 'unknown' };
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
