/**
 * CaaS mock routes — Coinbase Headless style quotes.
 * Replace with real CDP Onramp / Transak calls in production.
 */
const express = require('express');
const router = express.Router();

const PRICES = {
  SOL: 178.40,
  BTC: 68420.00,
  ETH: 3420.50,
  USDC: 1.00
};

router.get('/assets', (req, res) => {
  res.json({
    ok: true,
    demo: true,
    assets: [
      { symbol: 'SOL', name: 'Solana', network: 'solana', price: PRICES.SOL },
      { symbol: 'BTC', name: 'Bitcoin', network: 'bitcoin', price: PRICES.BTC },
      { symbol: 'ETH', name: 'Ethereum', network: 'ethereum', price: PRICES.ETH },
      { symbol: 'USDC', name: 'USD Coin', network: 'solana', price: PRICES.USDC }
    ],
    provider: 'Coinbase Onramp (demo)',
    disclosure: 'Crypto purchases are processed by a licensed partner. Assets are delivered to your connected wallet. Crypto is not FDIC or SIPC insured.'
  });
});

router.post('/quote', (req, res) => {
  const { asset = 'SOL', amountUsd = 100, side = 'buy' } = req.body || {};
  const price = PRICES[String(asset).toUpperCase()] || PRICES.SOL;
  const usd = Math.max(5, Number(amountUsd) || 100);
  const platformFeePct = 0.35;
  const networkFeeUsd = asset === 'SOL' ? 0.002 : 0.15;
  const feeUsd = +(usd * (platformFeePct / 100)).toFixed(2);
  const netUsd = +(usd - feeUsd - networkFeeUsd).toFixed(2);
  const assetAmount = +(netUsd / price).toFixed(asset === 'USDC' ? 2 : 6);

  res.json({
    ok: true,
    demo: true,
    quoteId: 'demo_' + Date.now(),
    expiresInSec: 30,
    side,
    asset: String(asset).toUpperCase(),
    amountUsd: usd,
    assetAmount,
    price,
    breakdown: {
      youPay: usd,
      platformFee: feeUsd,
      platformFeePct,
      networkFee: networkFeeUsd,
      youReceiveApprox: assetAmount
    },
    bufferEligible: true,
    provider: 'Coinbase Onramp (demo sandbox)',
    disclosure: 'Final amount may vary slightly with market movement. Partner handles KYC, 3DS2, and delivery to your wallet address.'
  });
});

router.post('/order', (req, res) => {
  const { quoteId, walletAddress, bufferMinutes = 0 } = req.body || {};
  if (!walletAddress) {
    return res.status(400).json({ ok: false, error: 'walletAddress required' });
  }
  res.json({
    ok: true,
    demo: true,
    orderId: 'ord_demo_' + Date.now(),
    status: bufferMinutes > 0 ? 'queued_buffer' : 'submitted_demo',
    bufferMinutes: Number(bufferMinutes) || 0,
    message: bufferMinutes > 0
      ? `Demo order queued for ${bufferMinutes} min buffer. Cancel anytime before broadcast.`
      : 'Demo order recorded. No real funds moved. Connect live Coinbase CDP keys for production.',
    walletAddress
  });
});

module.exports = router;
