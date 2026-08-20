/**
 * HTTP-level smoke test for the "free value" guard rails added to mutating trade routes.
 * Requires a running `node server.js` instance (see BASE_URL). Not wired into `npm test`
 * because it needs a live server + network; run manually with `node test/route-guard-smoke.js`.
 */
const assert = require('assert');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function postJson(path, body) {
  const response = await fetch(baseUrl + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

async function main() {
  let failures = 0;
  const check = (label, ok) => {
    if (ok) {
      console.log(`  \u2713 PASS: ${label}`);
    } else {
      failures++;
      console.log(`  \u2715 FAIL: ${label}`);
    }
  };

  // Ensure a token exists to test against.
  const createRes = await postJson('/api/tokens/create', {
    name: 'Guard Test Coin',
    symbol: 'GUARDT' + Date.now().toString(36).toUpperCase().slice(-4),
    creator: '0xGuardTester'
  });
  check('Token creation without initialBuySol succeeds with no txHash required', createRes.status === 201 && createRes.body.success === true);
  if (!createRes.body.success) {
    console.log('  create error:', createRes.body.error);
    process.exit(1);
  }
  const symbol = createRes.body.token.symbol;

  // Creating with an initialBuySol but no txHash must be rejected (prevents free minted supply/price impact).
  const freeInitialBuy = await postJson('/api/tokens/create', {
    name: 'Guard Test Coin 2',
    symbol: 'GUARDF' + Date.now().toString(36).toUpperCase().slice(-4),
    creator: '0xGuardTester',
    initialBuySol: 5
  });
  check('Create with initialBuySol but no txHash is rejected (400)', freeInitialBuy.status === 400);

  // Buy without txHash must be rejected (400 for missing signature, 404 if the token has no live mint yet).
  const freeBuy = await postJson(`/api/tokens/${symbol}/buy`, { buyerAddress: '0xGuardTester' });
  check('Buy without txHash is rejected', freeBuy.status === 400 || freeBuy.status === 404);

  // Sell without txHash must be rejected (400 for missing signature, 404 if the token has no live mint yet).
  const freeSell = await postJson(`/api/tokens/${symbol}/sell`, { sellerAddress: '0xGuardTester' });
  check('Sell without txHash is rejected', freeSell.status === 400 || freeSell.status === 404);

  // Bundle buy without txHash must be rejected (previously this silently minted free tokens).
  const bundlesRes = await fetch(baseUrl + '/api/tokens/bundles').then((r) => r.json());
  if (bundlesRes.bundles && bundlesRes.bundles.length > 0) {
    const bundleId = bundlesRes.bundles[0].id;
    const freeBundleBuy = await postJson(`/api/tokens/bundles/${bundleId}/buy`, { totalSolAmount: 1, buyerAddress: '0xGuardTester' });
    check('Bundle buy without txHash is rejected (400)', freeBundleBuy.status === 400);
  } else {
    console.log('  (skipped) Bundle buy guard check - no bundles available');
  }

  // Stake with an absurd amount must be rejected.
  const hugeStake = await postJson(`/api/tokens/${symbol}/stake`, { amount: 999_999_999_999, userAddress: '0xGuardTester' });
  check('Stake with an absurd amount is rejected (400)', hugeStake.status === 400);

  // Stake without a userAddress must be rejected.
  const anonStake = await postJson(`/api/tokens/${symbol}/stake`, { amount: 100 });
  check('Stake without a wallet address is rejected (400)', anonStake.status === 400);

  console.log(`\n${failures === 0 ? 'ALL ROUTE GUARD CHECKS PASSED' : failures + ' ROUTE GUARD CHECK(S) FAILED'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Route guard smoke test crashed:', err);
  process.exit(1);
});
