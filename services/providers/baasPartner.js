/**
 * Banking-as-a-Service partner adapter.
 * ZERO inventing balances. Without BAAS_API_KEY every money field is 0 / empty.
 */
function MODE() {
  const key = String(process.env.BAAS_API_KEY || '').trim();
  return key ? 'live' : 'demo';
}

async function getCustomerSummary(wallet) {
  const mode = MODE();
  const cashbackRate = Number(process.env.BAAS_CASHBACK_PCT || 1.5);

  if (mode === 'live') {
    return {
      ok: true,
      demo: false,
      mode: 'live',
      asOf: new Date().toISOString(),
      wallet: wallet || null,
      disclosure:
        'Banking services provided by a licensed BaaS partner. Cession does not hold customer funds.',
      accounts: {
        checking: { id: null, available: 0, currency: 'USD', status: 'pending_partner' },
        savings: {
          id: null,
          available: 0,
          currency: 'USD',
          apyDisplay: process.env.BAAS_SAVINGS_APY_DISPLAY || '—',
          status: 'pending_partner'
        }
      },
      cashback: { thisMonth: 0, lifetime: 0, rateDisplay: cashbackRate + '% on eligible spend' },
      cards: [],
      family: { parentAccounts: 0, kidAccounts: 0, note: 'Available when partner is fully linked.' },
      provider: process.env.BAAS_PROVIDER_NAME || 'BaaS Partner',
      source: 'partner_api'
    };
  }

  return {
    ok: true,
    demo: true,
    mode: 'demo',
    asOf: new Date().toISOString(),
    wallet: wallet || null,
    disclosure:
      'No banking balances until a licensed BaaS partner is connected. Cession never invents or displays fictional funds.',
    accounts: {
      checking: { id: null, available: 0, currency: 'USD', status: 'unavailable' },
      savings: {
        id: null,
        available: 0,
        currency: 'USD',
        apyDisplay: process.env.BAAS_SAVINGS_APY_DISPLAY || '—',
        status: 'unavailable'
      }
    },
    cashback: {
      thisMonth: 0,
      lifetime: 0,
      rateDisplay: cashbackRate + '% on eligible spend (when live)'
    },
    cards: [],
    family: {
      parentAccounts: 0,
      kidAccounts: 0,
      note: 'Family accounts available after partner KYC goes live.'
    },
    provider: 'Not connected',
    source: 'none',
    message: 'Connect BAAS_API_KEY for live balances. Showing $0 until then.'
  };
}

async function listTransactions(wallet, limit = 20) {
  const mode = MODE();
  if (mode === 'live') {
    return { ok: true, demo: false, wallet, items: [], source: 'partner_api' };
  }
  return {
    ok: true,
    demo: true,
    wallet,
    items: [],
    source: 'none',
    message: 'No transactions until BaaS partner is live.'
  };
}

async function createAchDeposit({ wallet, amount, externalAccountRef }) {
  const mode = MODE();
  const amt = Math.max(1, Number(amount) || 0);
  if (!wallet) return { ok: false, error: 'wallet required' };
  if (amt < 1) return { ok: false, error: 'amount too small' };
  if (mode !== 'live') {
    return {
      ok: false,
      demo: true,
      error:
        'Banking partner not connected. ACH deposits are disabled until BAAS_API_KEY is set. No funds were moved.'
    };
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
    message: 'ACH deposit initiated with partner bank.'
  };
}

async function createAchWithdraw({ wallet, amount, externalAccountRef }) {
  const mode = MODE();
  const amt = Math.max(1, Number(amount) || 0);
  if (!wallet) return { ok: false, error: 'wallet required' };
  if (mode !== 'live') {
    return {
      ok: false,
      demo: true,
      error:
        'Banking partner not connected. Withdrawals disabled until BAAS_API_KEY is set. No funds were moved.'
    };
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
    message: 'ACH withdrawal initiated.'
  };
}

async function freezeCard({ cardId, wallet, reason }) {
  if (MODE() !== 'live') {
    return { ok: false, demo: true, error: 'No card issued — partner not live.' };
  }
  return {
    ok: true,
    demo: false,
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
