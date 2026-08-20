const express = require('express');
const router = express.Router();

const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const SYSTEM = '11111111111111111111111111111111';
const RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

function looksAddr(s) {
  return typeof s === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s.trim());
}

function rails() {
  return {
    stripe: {
      id: 'stripe',
      name: 'Stripe',
      ready: Boolean(process.env.STRIPE_SECRET_KEY),
      status: process.env.STRIPE_ONRAMP_STATUS || (process.env.STRIPE_SECRET_KEY ? 'ready' : 'reviewing'),
      methods: ['card', 'apple_pay', 'bank']
    },
    ramp: {
      id: 'ramp',
      name: 'Ramp',
      ready: Boolean(process.env.RAMP_API_KEY),
      status: process.env.RAMP_API_KEY ? 'ready' : 'needs_key',
      methods: ['card', 'apple_pay', 'bank']
    },
    transak: {
      id: 'transak',
      name: 'Transak',
      ready: Boolean(process.env.TRANSAK_API_KEY),
      status: process.env.TRANSAK_API_KEY ? 'ready' : 'needs_key',
      methods: ['card', 'apple_pay', 'bank']
    },
    coinbase: {
      id: 'coinbase',
      name: 'Coinbase',
      ready: Boolean(process.env.COINBASE_ONRAMP_APP_ID),
      status: process.env.COINBASE_ONRAMP_APP_ID ? 'ready' : 'needs_key',
      methods: ['coinbase', 'card', 'bank']
    }
  };
}

function checkoutUrl(provider, amount, address) {
  const usd = encodeURIComponent(String(amount));
  const wallet = encodeURIComponent(address || '');
  if (provider === 'ramp' && process.env.RAMP_API_KEY) {
    return 'https://app.ramp.network/?hostAppName=Cession&hostLogoUrl=' +
      encodeURIComponent('https://cession.fun/brand/cession-c-mark.svg') +
      '&hostApiKey=' + encodeURIComponent(process.env.RAMP_API_KEY) +
      '&userAddress=' + wallet +
      '&swapAsset=SOLANA_SOL&fiatCurrency=USD&fiatValue=' + usd;
  }
  if (provider === 'transak' && process.env.TRANSAK_API_KEY) {
    return 'https://global.transak.com/?apiKey=' + encodeURIComponent(process.env.TRANSAK_API_KEY) +
      '&cryptoCurrencyCode=SOL&network=solana&walletAddress=' + wallet +
      '&fiatCurrency=USD&fiatAmount=' + usd +
      '&disableWalletAddressForm=true';
  }
  if (provider === 'coinbase' && process.env.COINBASE_ONRAMP_APP_ID) {
    return 'https://pay.coinbase.com/buy/select-asset?appId=' +
      encodeURIComponent(process.env.COINBASE_ONRAMP_APP_ID) +
      '&destinationWallets=' + encodeURIComponent(JSON.stringify([{ address: address, blockchains: ['solana'] }]));
  }
  return null;
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
  const list = rails();
  const anyReady = Object.values(list).some((r) => r.ready && r.status === 'ready');
  res.json({
    success: true,
    brand: 'Cession Pay',
    stripeStatus: list.stripe.status,
    rails: list,
    anyReady,
    note: anyReady
      ? 'Pick a rail. Partners handle identity. We do not take your card.'
      : 'Stripe is reviewing the onramp application. Add Ramp, Transak, or Coinbase keys to unlock a live checkout now.',
    presetsUsd: [20, 50, 100],
    todo: [
      { id: 'stripe', title: 'Stripe onramp', state: 'reviewing' },
      { id: 'ramp', title: 'Ramp Network', state: list.ramp.ready ? 'ready' : 'add_RAMP_API_KEY' },
      { id: 'transak', title: 'Transak', state: list.transak.ready ? 'ready' : 'add_TRANSAK_API_KEY' },
      { id: 'coinbase', title: 'Coinbase Onramp', state: list.coinbase.ready ? 'ready' : 'add_COINBASE_ONRAMP_APP_ID' },
      { id: 'plaid', title: 'Plaid via Stripe bank', state: 'with_stripe_approval' }
    ]
  });
});

router.post('/session', (req, res) => {
  const amount = Math.max(5, Math.min(2000, Number(req.body.amountUsd || 20)));
  const provider = String(req.body.provider || req.body.method || 'stripe');
  const address = String(req.body.address || '').trim();
  const list = rails();
  const rail = list[provider] || list.stripe;

  if (provider === 'stripe') {
    return res.json({
      success: false,
      pending: true,
      provider: 'stripe',
      amountUsd: amount,
      error: 'Stripe is reviewing the Cession onramp application. No card was charged. Use Ramp if a key is set.'
    });
  }

  const url = checkoutUrl(provider, amount, address);
  if (!url) {
    return res.json({
      success: false,
      pending: true,
      provider,
      amountUsd: amount,
      error: rail.name + ' needs an API key on Render. Nothing was charged.'
    });
  }
  res.json({ success: true, provider, amountUsd: amount, checkoutUrl: url });
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
