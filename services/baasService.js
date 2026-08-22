/**
 * BaaS orchestration layer — accounts, cards, ACH, cashback, family hooks.
 */
const partner = require('./providers/baasPartner');
const ledger = require('./ledger');
const giveback = require('./giveback');

async function summary(wallet) {
  const base = await partner.getCustomerSummary(wallet);
  const recent = await partner.listTransactions(wallet, 10);
  const gb = wallet ? await giveback.statusFor(wallet) : null;
  return {
    ...base,
    recent: recent.items || [],
    giveback: gb
  };
}

async function accounts(wallet) {
  const s = await partner.getCustomerSummary(wallet);
  return {
    ok: true,
    demo: s.demo,
    mode: s.mode,
    accounts: s.accounts,
    disclosure: s.disclosure
  };
}

async function transactions(wallet, limit) {
  const tx = await partner.listTransactions(wallet, limit);
  const fromLedger = wallet ? await ledger.listByWallet(wallet, limit) : [];
  return {
    ok: true,
    demo: tx.demo,
    partner: tx.items,
    ledger: fromLedger.map((e) => ({
      id: e.id,
      title: e.type,
      sub: e.status,
      amount: e.amount,
      dir: e.amount != null && e.amount >= 0 ? 'up' : 'down',
      when: e.ts
    }))
  };
}

async function deposit({ wallet, amount, externalAccountRef }) {
  const result = await partner.createAchDeposit({ wallet, amount, externalAccountRef });
  if (result.ok) {
    await ledger.record({
      type: 'baas.deposit',
      wallet,
      amount: result.amount,
      currency: 'USD',
      status: result.status,
      demo: result.demo,
      meta: { transferId: result.transferId, externalAccountRef }
    });
  }
  return result;
}

async function withdraw({ wallet, amount, externalAccountRef }) {
  const result = await partner.createAchWithdraw({ wallet, amount, externalAccountRef });
  if (result.ok) {
    await ledger.record({
      type: 'baas.withdraw',
      wallet,
      amount: -Math.abs(result.amount),
      currency: 'USD',
      status: result.status,
      demo: result.demo,
      meta: { transferId: result.transferId }
    });
  }
  return result;
}

async function freezeCard(opts) {
  const result = await partner.freezeCard(opts);
  if (result.ok) {
    await ledger.record({
      type: 'baas.card_freeze',
      wallet: opts.wallet,
      status: 'frozen',
      demo: result.demo,
      meta: { cardId: opts.cardId, reason: opts.reason }
    });
  }
  return result;
}

async function applyCashback({ wallet, spendAmount }) {
  const rate = Number(process.env.BAAS_CASHBACK_PCT || 1.5) / 100;
  const credit = +(Math.max(0, Number(spendAmount) || 0) * rate).toFixed(2);
  if (credit <= 0) return { ok: false, error: 'no cashback' };
  await ledger.record({
    type: 'baas.cashback',
    wallet,
    amount: credit,
    currency: 'USD',
    status: 'credited',
    demo: partner.MODE() !== 'live',
    meta: { spendAmount, rate }
  });
  return { ok: true, credit, rate };
}

module.exports = {
  summary,
  accounts,
  transactions,
  deposit,
  withdraw,
  freezeCard,
  applyCashback
};
