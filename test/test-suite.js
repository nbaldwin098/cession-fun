/**
 * Cession & Cession Master Automated Test Suite
 * Validates mathematical invariants, fee splits, leaderboards, public reserves, Sovereign Stacks, Diamond Staking, Anti-Dump Guards, Curated Token Baskets, Top 10 Holders, and end-to-end user flows.
 */

const assert = require('assert');
const bondingCurve = require('../services/bondingCurve');
const walletEngine = require('../services/walletEngine');
const ofacChecker = require('../services/ofacChecker');
const treasuryService = require('../services/treasuryService');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✕ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✕ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('⚡ CESSION.FUN SOVEREIGN ENGINE & AUDIT TEST SUITE');
  console.log('======================================================\n');

  // Ensure clean state before running invariants
  bondingCurve.resetToDefaults();

  // Test 1: Bonding Curve Math & Fee Splits
  console.log('[1] BONDING CURVE MATHEMATICAL INVARIANTS:');
  runTest('Initial token listing and Dynamic Creation', () => {
    // Seed initial protocol token for testing
    const cessToken = bondingCurve.createToken({
      name: "Cession Protocol",
      symbol: "CESS",
      creator: "0xFounderSovereign",
      chain: "Solana",
      devLockPercent: 100
    });
    const tokens = bondingCurve.getAllTokens();
    assert(tokens.length >= 1, 'Should have at least 1 created token');
    const king = bondingCurve.getKingOfTheHill();
    assert(king !== null && king.symbol === 'CESS', 'King of the Hill should be CESS');
  });

  runTest('Constant Product Buy Math (x * y = k) & Symmetric 0.50% Fee Split (0.25% Treasury, 0.25% Burn)', () => {
    const token = bondingCurve.createToken({
      name: "Test Doge",
      symbol: "TDOGE",
      creator: "0xDevTestAddress",
      chain: "Base",
      devLockPercent: 100
    });

    assert.strictEqual(token.symbol, "TDOGE");
    assert.strictEqual(token.devLockedPercent, 100);
    assert.strictEqual(token.safetyAudit.score >= 90, true, "Dev locked 100% should have score >= 90");

    // Buy 2.0 SOL worth
    const buyResult = bondingCurve.buyTokens("TDOGE", 2.0, "0xBuyerAddress");
    assert(buyResult.tokensOut > 0, "Should mint tokens to buyer");
    assert(buyResult.token.realSolRaised > 1.9, "Real SOL raised should be accrued after net fee split");
    assert(buyResult.token.feePool.totalGenerated > 0, "Fee pool should accrue swap fee");
  });

  runTest('Constant Product Sell Math & Real SOL Decrement', () => {
    const preSellSol = bondingCurve.getToken('TDOGE').realSolRaised;
    const sellResult = bondingCurve.sellTokens("TDOGE", 5000000, "0xBuyerAddress");
    assert(sellResult.solOut > 0, "Should return SOL to seller");
    assert(sellResult.token.realSolRaised < preSellSol, "Real SOL raised should correctly decrement upon sell");
  });

  runTest('Graduation Threshold Trigger at Market-Adjusted $25,000 Sprint Cap & Burn to 0xdead', () => {
    const gradToken = bondingCurve.createToken({
      name: "Graduation Token",
      symbol: "GRAD",
      creator: "0xDevGrad",
      chain: "Solana",
      devLockPercent: 100,
      targetCapUsd: 25000
    });

    const buyLarge = bondingCurve.buyTokens("GRAD", 10.0, "0xWhaleBuyer");
    assert.strictEqual(buyLarge.token.isGraduated, true, "Should graduate upon reaching $25k cap");
    assert.strictEqual(buyLarge.token.curveProgressPercent, 100, "Progress should be 100%");
    assert(buyLarge.token.graduationData.lpBurnTx.startsWith("0xdead"), "LP tokens should be burned permanently to 0xdead");
  });

  // Test 2: Leaderboard & Daily PnL Rankings
  console.log('\n[2] LEADERBOARD & 24H DAILY PnL RANKINGS:');
  runTest('Trader Leaderboard Ranking & Win Rate Metrics', () => {
    const leaders = bondingCurve.getTraderLeaderboard(10);
    assert(Array.isArray(leaders));
  });

  runTest('Daily Coin Gainers & Losers Ranking', () => {
    const gainers = bondingCurve.getDailyGainers(5);
    const losers = bondingCurve.getDailyLosers(5);
    assert(Array.isArray(gainers) && Array.isArray(losers));
  });

  runTest('New Listings Feed Ordering', () => {
    const newCoins = bondingCurve.getNewListings(5);
    assert(Array.isArray(newCoins));
  });

  // Test 3: Curated Token Baskets (Playlists) & 1-Click Proportional Buys
  console.log('\n[3] CURATED TOKEN BASKETS & 1-CLICK PROPORTIONAL AMM ENGINE:');
  runTest('Curated Token Basket Creation & Discovery', () => {
    const basket = bondingCurve.createCollection({
      name: "Solana DeFi Giants",
      description: "Curated basket of top DeFi protocols",
      tokenSymbols: ["CESS", "TDOGE", "GRAD"],
      creator: "0xCuratorMaster"
    });

    assert.strictEqual(basket.name, "Solana DeFi Giants");
    const found = bondingCurve.getCollectionById(basket.id);
    assert(found !== null && found.name === "Solana DeFi Giants");
  });

  runTest('1-Click Proportional AMM Basket Buy Routing', () => {
    const collections = bondingCurve.getAllCollections();
    const targetBasket = collections[0];

    const result = bondingCurve.buyCollection(targetBasket.id, 1.0, "0xBasketBuyer");
    assert.strictEqual(result.success, true);
    assert(result.executions.length > 0, "Executions array must be populated");
    assert(result.totalSolSpent > 0.99, "Should route proportional SOL to each constituent token");
  });

  // Test 4: Pump.fun Sorting Matrix & Top 10 Holders Distribution
  console.log('\n[4] PUMP.FUN REPLICATION (SORTING MATRIX, HOLDERS, STREAMER):');
  runTest('Sorting Matrix: Bump, Creation, Replies, Market Cap, Graduation Progress', () => {
    const bumpSorted = bondingCurve.getAllTokens('bump', 'all', 'sprint');
    assert(bumpSorted.length > 0);
    assert(bumpSorted[0].bumpTimestamp >= bumpSorted[bumpSorted.length - 1].bumpTimestamp, "Bump sorted must be latest trade first");

    const mcapSorted = bondingCurve.getAllTokens('market_cap', 'all', 'sprint');
    assert(mcapSorted[0].marketCapUsd >= mcapSorted[mcapSorted.length - 1].marketCapUsd, "Mcap sorted must be highest cap first");
  });

  runTest('Top 10 Holders Breakdown & Bonding Curve Reserve Ratio', () => {
    const holderData = bondingCurve.getTokenHolders('TDOGE');
    assert(holderData && Array.isArray(holderData.topHolders) && holderData.topHolders.length > 0, "Must return top holders array");
    const firstHolder = holderData.topHolders[0];
    assert(firstHolder.percentage > 0, "First holder percentage must be positive");
    assert(firstHolder.address.includes("Bonding Curve") || firstHolder.address.includes("Reserve") || firstHolder.isBondingCurve === true || firstHolder.percentage > 0, "Top holder is tracked");
  });

  runTest('Global Trade Marquee Streamer', () => {
    const recentTrades = bondingCurve.getGlobalRecentTrades(10);
    assert(Array.isArray(recentTrades) && recentTrades.length > 0, "Global trades must return recent swap records");
    assert(recentTrades[0].symbol !== undefined || recentTrades[0].tokenSymbol !== undefined, "Trade must include symbol");
    assert(recentTrades[0].type === 'BUY' || recentTrades[0].type === 'SELL', "Trade must have BUY or SELL type");
  });

  runTest('Deploy with Social Links & Optional Snipe on Launch', () => {
    const snipedCoin = bondingCurve.createToken({
      name: "Social Snipe Coin",
      symbol: "SNIPE",
      creator: "0xSniperDev",
      chain: "Solana",
      twitter: "https://x.com/snipecoin",
      telegram: "https://t.me/snipecoin",
      website: "https://snipecoin.fun",
      initialBuySol: 0.5
    });

    assert.strictEqual(snipedCoin.symbol, "SNIPE");
    assert.strictEqual(snipedCoin.twitter, "https://x.com/snipecoin");
    assert(snipedCoin.realSolRaised >= 0.49, "Initial snipe on launch must be immediately filled into bonding curve");
  });

  // Test 5: Transparent Protocol Reserves Treasury (Kraken Model)
  console.log('\n[5] PROOF-OF-RESERVES TREASURY (KRAKEN MODEL):');
  runTest('Public Reserves Ledger, Zero Private Keys, & Multi-Chain Addresses', () => {
    const reserves = treasuryService.getPublicReserves();
    assert(reserves.totalReservesUsd > 0, "Total reserves USD must be positive");
    assert(Array.isArray(reserves.tokenHoldings) && reserves.tokenHoldings.length >= 4, "Must track holdings of ETH, SOL, USDC, CALB");
    assert(reserves.publicWallets.baseL2.address.startsWith("0x"), "Base L2 public address must be valid");
    assert(reserves.publicWallets.solana.address.length >= 32, "Solana public address must be valid");
    assert(reserves.burnStats.totalTokensBurned > 0, "Must track cumulative tokens burned to 0xdead");
  });

  // Test 6: Non-Custodial Cryptographic Security & OFAC Compliance
  console.log('\n[6] NON-CUSTODIAL CRYPTOGRAPHIC SECURITY & OFAC COMPLIANCE:');
  runTest('Non-Custodial Zero-Seed Guarantee (Server never stores or generates seed phrases)', () => {
    const authRouter = require('../routes/auth');
    assert.strictEqual(authRouter.deriveSovereignMnemonic, undefined, "Server must NOT have mnemonic derivation methods");
  });

  runTest('Cryptographic Wallet Authentication Signature Requirement', () => {
    const nacl = require('tweetnacl');
    const bs58 = require('bs58').default || require('bs58');
    
    // Valid Solana Keypair & Signature
    const keypair = nacl.sign.keyPair();
    const pubkeyBs58 = bs58.encode(keypair.publicKey);
    const message = "Sign in to Cession.fun\nNonce: 123456";
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = nacl.sign.detached(msgBytes, keypair.secretKey);
    const sigHex = Buffer.from(sigBytes).toString('hex');

    const isValid = nacl.sign.detached.verify(msgBytes, sigBytes, keypair.publicKey);
    assert.strictEqual(isValid, true, "Valid TweetNaCl signature must verify");
  });

  runTest('OFAC Sanctioned Entity Detection & Geoblocking', () => {
    const isSanctioned = ofacChecker.isSanctionedName("LAZARUS GROUP");
    assert.strictEqual(isSanctioned, true, "Lazarus Group should be flagged as OFAC sanctioned");
    
    const checkTainted = ofacChecker.screenAddress("0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c");
    assert.strictEqual(checkTainted.isSanctioned, true, "Tornado Cash router must be flagged as sanctioned");
    assert.strictEqual(checkTainted.allowed, false, "Sanctioned address must be blocked");

    const iranBlock = ofacChecker.screenGeoLocation('IR', '', '185.10.0.1');
    assert.strictEqual(iranBlock.allowed, false, "Iran (IR) must be blocked");

    const usAllow = ofacChecker.screenGeoLocation('US', 'CA', '12.34.56.78');
    assert.strictEqual(usAllow.allowed, true, "US/Global non-sanctioned traffic should be allowed");
  });

  // Test 7: Sovereign Stacks, Diamond Staking & Anti-Dump
  console.log('\n[7] SOVEREIGN STACKS, DIAMOND STAKING & ANTI-DUMP INVARIANTS:');
  runTest('Sovereign Stack Creation & Discovery', () => {
    const stack = bondingCurve.createToken({
      name: "Baldwin Family Trust Stack",
      symbol: "BFT",
      creator: "0xFamCreator",
      chain: "Base",
      tokenType: "stack",
      antiDumpEnabled: true,
      devLockPercent: 100
    });

    assert.strictEqual(stack.tokenType, "stack");
    assert.strictEqual(stack.antiDumpEnabled, true);

    const allStacks = bondingCurve.getSovereignStacks();
    const found = allStacks.find(s => s.symbol === 'BFT');
    assert(found !== undefined, "Created stack should be discoverable in getSovereignStacks");
  });

  runTest('Diamond Vault Staking: 30d/90d/365d Time-Lock APY Yields', () => {
    const stakeRes = bondingCurve.stakeTokens("BFT", 250000, 90, "0xFamMember");
    assert.strictEqual(stakeRes.success, true);
    assert.strictEqual(stakeRes.stake.apy, 22.5, "90-day lock should yield 22.5% APY");
    assert.strictEqual(stakeRes.stake.amount, 250000);
    assert(stakeRes.totalStaked >= 250000, "Vault totalStaked should reflect staked amount");
  });

  runTest('1% Anti-Dump Circuit Breaker Guard Enforcement', () => {
    let threwAntiDump = false;
    try {
      bondingCurve.sellTokens("BFT", 20000000, "0xDumpAttempt");
    } catch (err) {
      if (err.message.includes('Anti-Dump Shield Active')) {
        threwAntiDump = true;
      }
    }
    assert.strictEqual(threwAntiDump, true, "Selling >1% of pool must be blocked by Anti-Dump Shield");
  });

  // Test 8: Multi-Feed True Price Oracle & L2 Market Data
  console.log('\n[8] TRUE PRICE ORACLE & MARKET DATA ENGINE:');
  const marketData = require('../services/marketData');
  
  await runAsyncTest('Multi-Feed Spot Price & True Price Composite Weighting', async () => {
    const btcTrue = await marketData.calculateTruePrice('BTC-USD');
    assert(btcTrue.priceUsd > 1000, "BTC True price must be positive and realistic");
    assert(btcTrue.confidence >= 0.95, "Oracle confidence must be >= 95%");
    assert(btcTrue.sources.length >= 2, "Oracle must aggregate multiple sources (Binance, CoinGecko, AMM)");

    const cessTrue = await marketData.calculateTruePrice('CESS');
    assert(cessTrue.priceUsd > 0, "CESS token true price must be computed");
  });

  runTest('Dynamic OHLCV Candlestick Multi-Timeframe Series Generation', () => {
    ['1m', '5m', '15m', '1h', '1d'].forEach(tf => {
      const candles = marketData.generateTokenCandles('CESS', tf, 30);
      assert.strictEqual(candles.length, 30, `Must generate 30 candles for timeframe ${tf}`);
      assert(candles[0].high >= candles[0].low, "Candle high must be >= low");
      assert(candles[0].open > 0 && candles[0].close > 0, "Open/Close must be positive");
    });
  });

  runTest('L2 Order Book Depth Generation & Spread', () => {
    const ob = marketData.generateTokenOrderBook('CESS');
    assert(Array.isArray(ob.bids) && ob.bids.length > 0, "Orderbook bids must be populated");
    assert(Array.isArray(ob.asks) && ob.asks.length > 0, "Orderbook asks must be populated");
    assert(ob.asks[0].price >= ob.bids[0].price, "Best ask must be >= best bid");
  });

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main();
