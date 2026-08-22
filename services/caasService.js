/**
 * CaaS orchestration — quotes, orders, buffer handoff, webhooks.
 */
const coinbase = require('./providers/coinbaseOnramp');
const ledger = require('./ledger');
const bufferQueue = require('./bufferQueue');

const quoteCache = new Map();
const QUOTE_TTL_MS = 35 * 1000;

function cacheQuote(q) {
  quoteCache.set(q.quoteId, { q, exp: Date.now() + QUOTE_TTL_MS });
  if (quoteCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of quoteCache) {
      if (v.exp < now) quoteCache.delete(k);
    }
  }
}

function getCachedQuote(quoteId) {
  const row = quoteCache.get(quoteId);
  if (!row) return null;
  if (row.exp < Date.now()) {
    quoteCache.delete(quoteId);
    return null;
  }
  return row.q;
}

async function listAssets() {
  return {
    ok: true,
    demo: coinbase.MODE() !== 'live',
    assets: coinbase.assets(),
    provider: coinbase.MODE() === 'live' ? 'Coinbase Onramp' : 'Coinbase Onramp (demo)',
    disclosure:
      'Crypto purchases are processed by a licensed partner. Assets are delivered to your connected wallet. Crypto is not FDIC or SIPC insured.'
  };
}

async function quote(body) {
  const q = await coinbase.createQuote({
    asset: body.asset,
    amountUsd: body.amountUsd,
    side: body.side || 'buy',
    walletAddress: body.walletAddress
  });
  if (q.ok) {
    cacheQuote(q);
    await ledger.record({
      type: 'caas.quote',
      wallet: body.walletAddress || null,
      amount: q.amountUsd,
      currency: 'USD',
      status: 'quoted',
      demo: q.demo,
      meta: { quoteId: q.quoteId, asset: q.asset, assetAmount: q.assetAmount }
    });
  }
  return q;
}

async function order(body) {
  const walletAddress = body.walletAddress;
  const quoteId = body.quoteId;
  const bufferMinutes = Number(body.bufferMinutes) || 0;
  const cached = quoteId ? getCachedQuote(quoteId) : null;
  const quoteCtx = cached || {
    quoteId,
    asset: body.asset || 'SOL',
    amountUsd: body.amountUsd,
    assetAmount: body.assetAmount
  };
  const result = await coinbase.createOrder({
    quoteId,
    walletAddress,
    bufferMinutes,
    quote: quoteCtx
  });
  if (!result.ok) return result;
  await ledger.record({
    type: 'caas.order',
    wallet: walletAddress,
    amount: result.amountUsd != null ? result.amountUsd : quoteCtx.amountUsd,
    currency: 'USD',
    status: result.status,
    demo: result.demo,
    meta: {
      orderId: result.orderId,
      quoteId,
      asset: result.asset || quoteCtx.asset,
      bufferMinutes
    }
  });
  if (bufferMinutes > 0) {
    const buf = await bufferQueue.enqueue({
      kind: 'caas_order',
      wallet: walletAddress,
      bufferMinutes,
      demo: result.demo,
      payload: {
        orderId: result.orderId,
        quoteId,
        asset: result.asset || quoteCtx.asset,
        amountUsd: result.amountUsd,
        assetAmount: result.assetAmount
      }
    });
    result.bufferId = buf.id;
    result.releaseAt = buf.releaseAt;
  }
  return result;
}

async function orderStatus(orderId) {
  const recent = await ledger.listRecent(200);
  const hit = recent.find((e) => e.meta && e.meta.orderId === orderId);
  if (!hit) return { ok: false, error: 'Order not found' };
  return {
    ok: true,
    orderId,
    status: hit.status,
    demo: hit.demo,
    ts: hit.ts,
    meta: hit.meta
  };
}

async function webhook(body, headers) {
  const result = await coinbase.handleWebhook(body, headers);
  if (body && (body.orderId || body.id)) {
    await ledger.record({
      type: 'caas.webhook',
      status: body.status || 'received',
      demo: result.demo,
      meta: { orderId: body.orderId || body.id, eventType: result.eventType, rawType: body.type }
    });
  }
  return result;
}

module.exports = {
  listAssets,
  quote,
  order,
  orderStatus,
  webhook,
  getCachedQuote
};
