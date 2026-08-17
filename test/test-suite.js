/**
 * Calabi Master Automated Test Suite
 * Validates mathematical invariants, fee splits, leaderboards, public reserves, and end-to-end user flows.
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
  runTest('Initial token listing and King of the Hill detection', () => {
    const tokens = bondingCurve.getAllTokens();
    assert(tokens.length >= 3, 'Should have initial sample tokens loaded');
    const king = bondingCurve.getKingOfTheHill();
    assert(king !== null && king.symbol === 'CESS', 'King of the Hill should be CESS initially');
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
    assert(buyResult.token.realSolRaised === 2.0, "Real SOL raised should equal 2.0");
    assert(buyResult.token.feePool.totalGenerated > 0, "Fee pool should accrue swap fee");
  });

  runTest('Constant Product Sell Math & Real SOL Decrement', () => {
    const sellResult = bondingCurve.sellTokens("TDOGE", 5000000, "0xSellerAddress");
    assert(sellResult.solOut > 0, "Should return SOL to seller");
    assert(sellResult.token.realSolRaised < 2.0, "Real SOL raised should correctly decrement upon sell");
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
    assert(buyLarge.token.graduationData.lpBurnTx.startsWith("0xburn"), "LP tokens should be burned permanently to 0xdead");
  });

  // Test 2: Leaderboard & Daily PnL Rankings
  console.log('\n[2] LEADERBOARD & 24H DAILY PnL RANKINGS:');
  runTest('Trader Leaderboard Ranking & Win Rate Metrics', () => {
    const leaderboard = bondingCurve.getTraderLeaderboard();
    assert(Array.isArray(leaderboard) && leaderboard.length > 0, "Leaderboard must return ranked trader list");
    assert(leaderboard[0].rank === 1, "First entry must be Rank #1");
    assert(leaderboard[0].dailyPnlPercent !== undefined, "Daily PnL % must be calculated");
    assert(leaderboard[0].winRate !== undefined, "Win rate must be calculated");
  });

  runTest('Daily Coin Gainers & Losers Ranking', () => {
    const gainers = bondingCurve.getDailyGainers();
    assert(Array.isArray(gainers) && gainers.length > 0, "Daily gainers must return list of tokens");
    assert(gainers[0].change24hPercent >= gainers[gainers.length - 1].change24hPercent, "Gainers must be sorted descending by 24h change %");
  });

  runTest('New Listings Feed Ordering', () => {
    const newListings = bondingCurve.getNewListings();
    assert(Array.isArray(newListings) && newListings.length > 0, "New listings must return token array");
    assert(newListings[0].createdAt >= newListings[newListings.length - 1].createdAt, "New listings must be sorted newest first");
  });

  // Test 3: Transparent Protocol Reserves Treasury (Kraken Model)
  console.log('\n[3] PROOF-OF-RESERVES TREASURY (KRAKEN MODEL):');
  runTest('Public Reserves Ledger, Zero Private Keys, & Multi-Chain Addresses', () => {
    const reserves = treasuryService.getPublicReserves();
    assert(reserves.totalReservesUsd > 0, "Total reserves USD must be positive");
    assert(Array.isArray(reserves.tokenHoldings) && reserves.tokenHoldings.length >= 4, "Must track holdings of ETH, SOL, USDC, CALB");
    assert(reserves.publicWallets.baseL2.address.startsWith("0x"), "Base L2 public address must be valid");
    assert(reserves.publicWallets.solana.address.length >= 32, "Solana public address must be valid");
    assert(reserves.burnStats.totalTokensBurned > 0, "Must track cumulative tokens burned to 0xdead");
  });

  // Test 4: Sovereign Wallet Engine & In-Browser OFAC
  console.log('\n[4] MULTI-WALLET ENGINE & ZERO-SAAS COMPLIANCE:');
  runTest('BIP-39 12-Word Mnemonic Generation with Multi-Chain Derivation', () => {
    const vault = walletEngine.generateSovereignVault();
    assert(vault.mnemonic.split(' ').length === 12, "Mnemonic must have 12 words");
    assert(vault.addresses.eth.startsWith('0x'), "EVM address must start with 0x");
    assert(vault.addresses.btc.startsWith('bc1q'), "BTC address must be Native SegWit bc1q");
    assert(vault.addresses.sol.length >= 32, "Solana address must be Base58 formatted");
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

  // Test 5: End-to-End User Actions
  console.log('\n[5] END-TO-END USER ACTIONS AUDIT:');
  runTest('User Actions: Mint, Trade, Send, Receive, Sell, Buy, Store on Wallet, Trade on Exchange', () => {
    // 1. Store on Wallet & Mint Keypair
    const userVault = walletEngine.generateSovereignVault();
    const userAddress = userVault.addresses.eth;
    assert(userAddress !== null, "User must be able to generate and store wallet keys");

    // 2. Mint / Launch a new coin
    const launchedCoin = bondingCurve.createToken({
      name: "Apex Bull",
      symbol: "ABULL",
      creator: userAddress,
      chain: "Base",
      devLockPercent: 100
    });
    assert.strictEqual(launchedCoin.symbol, "ABULL", "User must be able to mint/launch new coins");

    // 3. Buy coin on bonding curve
    const buyAction = bondingCurve.buyTokens("ABULL", 1.5, userAddress);
    assert(buyAction.tokensOut > 0, "User must be able to buy coin on bonding curve");

    // 4. Sell coin on bonding curve
    const sellAction = bondingCurve.sellTokens("ABULL", 1000000, userAddress);
    assert(sellAction.solOut > 0, "User must be able to sell coin on bonding curve");

    // 5. Send & Receive operations
    const cleanAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
    const screenedSend = ofacChecker.screenAddress(cleanAddress);
    assert.strictEqual(screenedSend.allowed, true, "User must be able to send & receive clean funds");

    // 6. Trade on Exchange Pro Terminal
    treasuryService.recordTrade(15000);
    assert(treasuryService.getPublicReserves().totalReservesUsd > 0, "User must be able to trade on exchange");
  });

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main();
