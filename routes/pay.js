const express = require('express');
const router = express.Router();

const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const SYSTEM = '11111111111111111111111111111111';
const RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

function looksAddr(s) {
  return typeof s === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s.trim());
}

async function rpc(method, params) {
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  return r.json();
}

router.get('/status', (req, res) => {
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY);
  const coinbase = Boolean(process.env.COINBASE_ONRAMP_APP_ID);
  res.json({
    success: true,
    brand: 'Cession Pay',
    stripeReady: stripe,
    coinbaseReady: coinbase,
    note: stripe
      ? 'Fiat checkout is live through Stripe.'
      : 'Fiat checkout UI is live. Stripe onramp unlocks after your application is approved.',
    presetsUsd: [20, 50, 100]
  });
});

router.post('/session', (req, res) => {
  const amount = Math.max(5, Math.min(2000, Number(req.body.amountUsd || 20)));
  const method = String(req.body.method || 'card');
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.json({
      success: false,
      pending: true,
      amountUsd: amount,
      method,
      error: 'Cession Pay is waiting on Stripe onramp approval. No card was charged.'
    });
  }
  res.json({
    success: false,
    pending: true,
    amountUsd: amount,
    method,
    error: 'Create a Stripe onramp session in production after approval. Nothing was charged.'
  });
});

router.post('/classify', async (req, res) => {
  const address = String(req.body.address || '').trim();
  if (!looksAddr(address)) {
    return res.json({ success: true, safe: false, kind: 'invalid', reason: 'That is not a Solana address.' });
  }
  try {
    const out = await rpc('getAccountInfo', [address, { encoding: 'jsonParsed' }]);
    const acc = out.result && out.result.value;
    if (!acc) {
      return res.json({ success: true, safe: true, kind: 'wallet', reason: 'Empty wallet address. Safe for SOL.' });
    }
    const owner = acc.owner || '';
    if (owner === TOKEN || owner === TOKEN22) {
      return res.json({
        success: true,
        safe: false,
        kind: 'mint_or_token',
        reason: 'Token mint or token account. SOL sent here is gone. Blocked.'
      });
    }
    if (owner !== SYSTEM) {
      return res.json({
        success: true,
        safe: false,
        kind: 'program',
        reason: 'Program or contract address. SOL sent here may be unrecoverable. Blocked.'
      });
    }
    return res.json({ success: true, safe: true, kind: 'wallet', reason: 'System wallet. OK to send SOL.' });
  } catch (e) {
    return res.status(502).json({ success: false, safe: false, kind: 'error', reason: 'Could not check the address. Try again.' });
  }
});

module.exports = router;
