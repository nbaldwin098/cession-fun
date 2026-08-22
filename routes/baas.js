/**
 * BaaS mock routes — look and feel of a real banking layer.
 * All numbers are demo. Real partner APIs will replace these later.
 */
const express = require('express');
const router = express.Router();

function demoSummary(req, res) {
  const now = new Date();
  res.json({
    ok: true,
    demo: true,
    asOf: now.toISOString(),
    disclosure: 'Banking services will be provided by a licensed BaaS partner. Cession does not hold customer funds or full personal information except for fraud / non-payment cases.',
    accounts: {
      checking: { available: 2847.32, currency: 'USD', status: 'active' },
      savings: { available: 1250.00, currency: 'USD', apyDisplay: '4.15%', status: 'active' }
    },
    cashback: {
      thisMonth: 18.42,
      lifetime: 96.10,
      rateDisplay: '1.5% on eligible spend'
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
    recent: [
      { id: 'tx1', title: 'Cashback credit', sub: 'August rewards', amount: 4.20, dir: 'up', when: 'Today' },
      { id: 'tx2', title: 'Apple Pay · Coffee', sub: 'Debit ••••4242', amount: -6.50, dir: 'down', when: 'Yesterday' },
      { id: 'tx3', title: 'ACH deposit', sub: 'From external bank', amount: 500.00, dir: 'up', when: 'Aug 18' },
      { id: 'tx4', title: 'Daily crypto give-back', sub: 'SOL micro-reward', amount: 0.12, dir: 'up', when: 'Aug 17' }
    ],
    family: {
      parentAccounts: 1,
      kidAccounts: 0,
      note: 'Parent & kid accounts coming with live BaaS partner.'
    }
  });
}

router.get('/summary', demoSummary);
router.get('/accounts', demoSummary);

module.exports = router;
