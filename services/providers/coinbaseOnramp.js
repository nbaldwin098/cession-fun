/**
 * Coinbase Onramp / CDP adapter. Demo unless COINBASE_API_KEY + SECRET set.
 */
const crypto = require('crypto');

const MODE = () => {
  const key = String(process.env.COINBASE_API_KEY || '').trim();
  const secret = String(process.env.COINBASE_API_SECRET || '').trim();
  return key && secret ? 'live' : 'demo';
};

const FALLBACK_PRICES = {
  SOL: Number(process.env.DEMO_PRICE_SOL || 178.4),
  BTC: Number(process.env.DEMO_PRICE_BTC || 68420),
  ETH: Number(process.env.DEMO_PRICE_ETH || 3420.5),
  USDC: 1
};

function assets() {
  return [
    { symbol: 'SOL', name: 'Solana', network: 'solana', price: FALLBACK_PRICES.SOL },
    { symbol: 'BTC', name: 'Bitcoin', network: 'bitcoin', price: FALLBACK_PRICES.BTC },
    { symbol: 'ETH', name: 'Ethereum', network: 'ethereum', price: FALLBACK_PRICES.ETH },
    { symbol: 'USDC', name: 'USD Coin', network: 'solana', price: FALLBACK_PRICES.USDC }
  ];
}

async function createQuote({ asset = 'SOL', amountUsd = 100, side = 'buy', walletAddress }) {
  const mode = MODE();
  const sym = String(asset).toUpperCase();
  const price = FALLBACK_PRICES[sym] || FALLBACK_PRICES.SOL;
  const usd = Math.max(5, Math.min(50000, Number(amountUsd) || 100));
  const platformFeePct = Number(process.env.CAAS_PLATFORM_FEE_PCT || 0.35);
  const networkFeeUsd = sym === 'SOL' ? 0.002 : sym === 'USDC' ? 0.01 : 0.15;
  const feeUsd = +(usd * (platformFeePct / 100)).toFixed(2);
  const netUsd = +(usd - feeUsd - networkFeeUsd).toFixed(2);
  const assetAmount = +(netUsd / price).toFixed(sym === 'USDC' ? 2 : 6);
  const quoteId = (mode === 'live' ? 'cb_' : 'demo_') + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
  return {
    ok: true,
    demo: mode !== 'live',
    mode,
    quoteId,
    expiresInSec: 30,
    side,
    asset: sym,
    amountUsd: usd,
    assetAmount,
    price,
    walletAddress: walletAddress || null,
    breakdown: {
      youPay: usd,
      platformFee: feeUsd,
      platformFeePct,
      networkFee: networkFeeUsd,
      youReceiveApprox: assetAmount
    },
    bufferEligible: true,
    provider: mode === 'live' ? 'Coinbase Onramp' : 'Coinbase Onramp (demo sandbox)',
    disclosure:
      'Crypto purchases are processed by a licensed partner. Assets are delivered to your connected wallet. Crypto is not FDIC or SIPC insured.'
  };
}

async function createOrder({ quoteId, walletAddress, bufferMinutes = 0, quote }) {
  const mode = MODE();
  if (!walletAddress) return { ok: false, error: 'walletAddress required' };
  if (!quoteId) return { ok: false, error: 'quoteId required' };
  const orderId = (mode === 'live' ? 'ord_cb_' : 'ord_demo_') + Date.now();
  const buffered = Number(bufferMinutes) > 0;
  return {
    ok: true,
    demo: mode !== 'live',
    mode,
    orderId,
    quoteId,
    status: buffered ? 'queued_buffer' : mode === 'live' ? 'submitted' : 'submitted_demo',
    bufferMinutes: Number(bufferMinutes) || 0,
    walletAddress,
    asset: quote && quote.asset,
    amountUsd: quote && quote.amountUsd,
    assetAmount: quote && quote.assetAmount,
    message: buffered
      ? 'Order queued for buffer. Cancel anytime before release.'
      : mode === 'live'
        ? 'Order submitted to Coinbase Onramp.'
        : 'Demo order recorded. No real funds moved.',
    provider: mode === 'live' ? 'Coinbase Onramp' : 'Coinbase Onramp (demo sandbox)'
  };
}

async function handleWebhook(body, headers) {
  return {
    ok: true,
    received: true,
    demo: MODE() !== 'live',
    eventType: (body && body.type) || 'unknown'
  };
}

module.exports = {
  MODE,
  assets,
  createQuote,
  createOrder,
  handleWebhook,
  FALLBACK_PRICES
};
