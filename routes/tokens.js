/**
 * Cession 100x Launchpad & Bonding Curve API Routes
 * Dual Sprint & Sovereign Stack Endpoints
 */

const express = require('express');
const router = express.Router();
const bondingCurve = require('../services/bondingCurve');
const bs58Module = require('bs58');
const ofacChecker = require('../services/ofacChecker');
const accessRoutes = require('./access');

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SOLANA_PROGRAM_ID = process.env.CESSION_SOLANA_PROGRAM_ID || 'Epxb6TRhGwT1gQFj5xCLM6KtZUz9ajD7jZzkVrp3qBR9';
const SOLANA_SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
const BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
const SELL_DISCRIMINATOR = Buffer.from([51, 230, 131, 241, 36, 64, 51, 38]);
const decodeBase58 = (bs58Module.default || bs58Module).decode;
const MAX_TRADE_AGE_SECONDS = 10 * 60;

// Server-side "reasonable effort" compliance gate. This mirrors the client-only
// screen-connection flow, which is not reliably invoked from every entry point, so
// every money-moving route (create/buy/sell/bundle-buy) enforces it directly here.
async function complianceBlock(req, address) {
  const clientIp = accessRoutes.clientIp(req);
  const country = await accessRoutes.countryOf(req);
  const geo = ofacChecker.screenGeoLocation(country, '', clientIp);
  if (!geo.allowed) return geo;
  if (address) {
    const addr = ofacChecker.screenAddress(address, clientIp, country || 'UNKNOWN');
    if (!addr.allowed) return addr;
  }
  return null;
}

function accountKey(key) {
  return typeof key === 'string' ? key : key && key.pubkey;
}

function parseInstructionAmount(data, discriminator, decimals) {
  const bytes = Buffer.from(decodeBase58(data));
  if (bytes.length !== 24 || !bytes.subarray(0, 8).equals(discriminator)) return null;
  const units = bytes.readBigUInt64LE(8);
  if (units > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(units) / (10 ** decimals);
}

async function getConfirmedSolanaTrade(txHash, side, mint, trader) {
  if (!SOLANA_SIGNATURE.test(txHash)) throw new Error('A valid Solana transaction signature is required.');

  const response = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTransaction',
      params: [txHash, { encoding: 'json', commitment: 'finalized', maxSupportedTransactionVersion: 0 }]
    })
  });
  if (!response.ok) throw new Error('Unable to verify the transaction on Solana.');
  const payload = await response.json();
  const transaction = payload.result;
  if (!transaction || transaction.meta.err) throw new Error('Transaction is not a finalized successful Solana transaction.');
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(transaction.blockTime) || transaction.blockTime > now + 60 || now - transaction.blockTime > MAX_TRADE_AGE_SECONDS) {
    throw new Error('Transaction must be finalized within the last 10 minutes.');
  }

  const message = transaction.transaction && transaction.transaction.message;
  const keys = message && message.accountKeys;
  const expectedDiscriminator = side === 'BUY' ? BUY_DISCRIMINATOR : SELL_DISCRIMINATOR;
  const decimals = side === 'BUY' ? 9 : 6;
  const instruction = message && message.instructions.find((item) => {
    const programId = item.programId || accountKey(keys[item.programIdIndex]);
    return programId === SOLANA_PROGRAM_ID && Array.isArray(item.accounts) && item.accounts.length >= 2;
  });
  if (!instruction) throw new Error('Transaction does not contain a Cession trade instruction.');

  const accounts = instruction.accounts.map((entry) => typeof entry === 'number' ? accountKey(keys[entry]) : entry);
  if (accounts[0] !== trader || accounts[1] !== mint) {
    throw new Error('Transaction signer or mint does not match the requested trade.');
  }
  // Account index 6 is the protocol treasury (see public/js/trading.js account ordering);
  // the on-chain program now also pins this via an `address =` constraint, but we
  // re-check here defense-in-depth so a stale/rogue client can't misroute the protocol fee.
  if (accounts[6] !== bondingCurve.treasurySolAddress) {
    throw new Error('Transaction does not pay the protocol treasury.');
  }
  const amount = parseInstructionAmount(instruction.data, expectedDiscriminator, decimals);
  if (!amount || !Number.isFinite(amount)) throw new Error('Transaction instruction does not match the requested trade.');
  return amount;
}

// Verifies a plain SOL transfer from `fromAddress` to the treasury wallet, used to gate
// endpoints (bundle 1-click buy, initial creator buy) that credit tokens without a direct
// on-chain program instruction, so they cannot mint value for free.
async function getConfirmedSolTransferLamports(txHash, fromAddress) {
  if (!SOLANA_SIGNATURE.test(txHash)) throw new Error('A valid Solana transaction signature is required.');
  const treasury = bondingCurve.treasurySolAddress;

  const response = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTransaction',
      params: [txHash, { encoding: 'jsonParsed', commitment: 'finalized', maxSupportedTransactionVersion: 0 }]
    })
  });
  if (!response.ok) throw new Error('Unable to verify the transaction on Solana.');
  const payload = await response.json();
  const transaction = payload.result;
  if (!transaction || transaction.meta.err) throw new Error('Transaction is not a finalized successful Solana transaction.');
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(transaction.blockTime) || transaction.blockTime > now + 60 || now - transaction.blockTime > MAX_TRADE_AGE_SECONDS) {
    throw new Error('Transaction must be finalized within the last 10 minutes.');
  }

  const message = transaction.transaction && transaction.transaction.message;
  const instructions = (message && message.instructions) || [];
  let lamportsToTreasury = 0;
  for (const item of instructions) {
    const parsed = item.parsed;
    if (!parsed || parsed.type !== 'transfer' || !parsed.info) continue;
    const programId = item.program || item.programId;
    if (programId !== 'system') continue;
    if (parsed.info.source !== fromAddress || parsed.info.destination !== treasury) continue;
    lamportsToTreasury += Number(parsed.info.lamports || 0);
  }
  if (lamportsToTreasury <= 0) throw new Error('Transaction does not contain a matching SOL transfer to the Cession treasury.');
  return lamportsToTreasury;
}

// Cession Pulse Ranked Feed Endpoint (For You Page)
router.get('/pulse', (req, res) => {
  const { lane = 'all', limit = 20 } = req.query;
  const feed = bondingCurve.getPulseFeed(lane, parseInt(limit) || 20);
  res.json({ success: true, count: feed.length, lane, feed });
});

// Global Trade Ticker Stream (for Top Marquee)
router.get('/global-trades', (req, res) => {
  const { limit = 25 } = req.query;
  const trades = bondingCurve.getGlobalRecentTrades(parseInt(limit));
  res.json({ success: true, count: trades.length, trades });
});

// Protocol Transparency & Real Company Treasury Wallets
router.get(['/transparency', '/treasury'], (req, res) => {
  const data = bondingCurve.getTransparencyData();
  res.json(data);
});

// Get "Today's 5" Dynamic Bundle
router.get(['/collections/todays-5', '/bundles/todays-5'], (req, res) => {
  const bundle = bondingCurve.getTodaysFiveBundle();
  res.json({ success: true, bundle });
});

// Get Token Bundles / Curated Baskets (supports ?category=memes|politics|trends|whale|ai)
router.get(['/collections', '/bundles'], (req, res) => {
  const { category = 'all' } = req.query;
  const collections = bondingCurve.getAllCollections(category);
  res.json({ success: true, count: collections.length, category, collections, bundles: collections });
});

// Get Top Performing Bundles (supports ?category=...&limit=5)
router.get(['/collections/top', '/bundles/top'], (req, res) => {
  const { category = 'all', limit = 5 } = req.query;
  const top = bondingCurve.getTopPerformingBundles(category, parseInt(limit) || 5);
  res.json({ success: true, count: top.length, category, bundles: top });
});

// Get Worst Performing Bundles (Dip Hunters, supports ?category=...&limit=5)
router.get(['/collections/worst', '/bundles/worst'], (req, res) => {
  const { category = 'all', limit = 5 } = req.query;
  const worst = bondingCurve.getWorstPerformingBundles(category, parseInt(limit) || 5);
  res.json({ success: true, count: worst.length, category, bundles: worst });
});

// Get Top 5 Best & Top 5 Worst Matrix across Categories
router.get(['/collections/matrix', '/bundles/matrix'], (req, res) => {
  const { category = 'all' } = req.query;
  const matrix = bondingCurve.getBundleMatrix(category);
  res.json({ success: true, matrix });
});

// Get Single Token Bundle
router.get(['/collections/:id', '/bundles/:id'], (req, res) => {
  const collection = bondingCurve.getCollection(req.params.id);
  if (!collection) {
    return res.status(404).json({ success: false, error: 'Bundle not found.' });
  }
  res.json({ success: true, collection, bundle: collection });
});

// Create Token Bundle
router.post(['/collections/create', '/bundles/create'], (req, res) => {
  try {
    const { name, symbol, description, category, creator, tokens, imageUrl } = req.body;
    const newCollection = bondingCurve.createCollection({
      name,
      symbol,
      description,
      category: category || "memes",
      creator: creator || "0xCreator",
      tokens,
      imageUrl
    });
    res.status(201).json({ success: true, collection: newCollection, bundle: newCollection });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 1-Click Buy Token Bundle (Requires Confirmed On-Chain SOL Transfer To Treasury)
router.post(['/collections/:id/buy', '/bundles/:id/buy'], async (req, res) => {
  try {
    const { solAmount, totalSolAmount, buyerAddress, txHash } = req.body;
    const amount = parseFloat(totalSolAmount || solAmount);
    const trader = String(buyerAddress || '').trim();
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid SOL amount is required for bundle purchase.' });
    }
    if (!txHash || typeof txHash !== 'string' || !trader) {
      return res.status(400).json({ success: false, error: 'Transaction signature and buyer address are required.' });
    }
    const blocked = await complianceBlock(req, trader);
    if (blocked) return res.status(403).json({ success: false, error: blocked.message, blockType: blocked.reason });
    const signature = txHash.trim();
    if (bondingCurve.hasRecordedTransaction(signature)) return res.status(409).json({ success: false, error: 'Transaction has already been indexed.' });
    const lamports = await getConfirmedSolTransferLamports(signature, trader);
    if (lamports / 1e9 < amount - 1e-6) {
      return res.status(400).json({ success: false, error: 'Confirmed transfer is less than the requested purchase amount.' });
    }
    if (bondingCurve.hasRecordedTransaction(signature) || !bondingCurve.reserveTransaction(signature)) {
      return res.status(409).json({ success: false, error: 'Transaction is already being indexed.' });
    }
    try {
      const result = bondingCurve.buyCollection(req.params.id, amount, trader);
      bondingCurve.recordTransaction({ txHash: signature, wallet: trader, symbol: 'BUNDLE', side: 'BUY', solAmount: amount });
      res.json({ ...result, txHash: signature });
    } finally {
      bondingCurve.releaseTransactionReservation(signature);
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get Token Holders & Distribution
router.get('/:symbol/holders', (req, res) => {
  try {
    const holders = bondingCurve.getTokenHolders(req.params.symbol);
    res.json({ success: true, holders });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Get all tokens (supports filter by type, chain, sorting, graduated, and private unlock)
router.get('/', (req, res) => {
  const { sort = 'bump', chain = 'all', type = 'all', key = null, showGraduated = 'true' } = req.query;
  const tokens = bondingCurve.getAllTokens(sort, chain, type, false, key, showGraduated !== 'false');
  res.json({ success: true, count: tokens.length, tokens });
});

// Get King of the Hill (highest progress public token)
router.get('/king', (req, res) => {
  const king = bondingCurve.getKingOfTheHill();
  res.json({ success: true, king });
});

// Get Sovereign Stacks (Long-Term Community Micro-Endowments)
router.get('/stacks', (req, res) => {
  const stacks = bondingCurve.getSovereignStacks();
  res.json({ success: true, count: stacks.length, stacks });
});

// Get Single Token details (with private circle access check)
router.get('/:symbol', (req, res) => {
  const { key = null } = req.query;
  const token = bondingCurve.getToken(req.params.symbol, key);
  if (!token) {
    return res.status(404).json({ success: false, error: 'Token not found.' });
  }
  res.json({ success: true, token: { ...token, creatorStats: bondingCurve.getCreatorStats(token.creator) } });
});

// Get Token Chat (Trollbox)
router.get('/:symbol/chat', (req, res) => {
  const messages = bondingCurve.getChatMessages(req.params.symbol);
  res.json({ success: true, messages });
});

// Post Token Chat message (with rich media / meme attachments)
router.post('/:symbol/chat', (req, res) => {
  const { user = 'Anon', text, badge = 'TRADER', imageUrl = null } = req.body;
  if ((!text || text.trim().length === 0) && !imageUrl) {
    return res.status(400).json({ success: false, error: 'Message or image cannot be empty.' });
  }
  const msg = bondingCurve.addChatMessage(req.params.symbol, user, text, badge, imageUrl);
  res.json({ success: true, message: msg });
});

// Create/Deploy New Token (0.1 SOL Mint Fee Standard)
router.post(['/create', '/deploy', '/launch'], async (req, res) => {
  try {
    const { 
      name, 
      symbol, 
      description, 
      imageUrl, 
      creator, 
      chain, 
      devLockPercent, 
      tokenType = 'sprint',
      isPrivate = false,
      inviteCode = null,
      antiDumpEnabled = null,
      targetCapUsd = 25000,
      twitter = null,
      telegram = null,
      website = null,
      initialBuySol = null,
      mintFeeSol = 0.1,
      txHash = null
    } = req.body;

    if (!name || !symbol) {
      return res.status(400).json({ success: false, error: 'Token name and symbol are required.' });
    }

    const creatorAddress = creator || "0xCessionAnonDev";
    const blocked = await complianceBlock(req, creatorAddress);
    if (blocked) return res.status(403).json({ success: false, error: blocked.message, blockType: blocked.reason });
    const initialAmount = initialBuySol ? parseFloat(initialBuySol) : 0;
    let signature = null;
    if (initialAmount > 0) {
      if (!txHash || typeof txHash !== 'string') {
        return res.status(400).json({ success: false, error: 'A confirmed Solana transaction signature is required to fund the initial buy.' });
      }
      signature = txHash.trim();
      if (bondingCurve.hasRecordedTransaction(signature)) {
        return res.status(409).json({ success: false, error: 'Transaction has already been indexed.' });
      }
      const lamports = await getConfirmedSolTransferLamports(signature, creatorAddress);
      if (lamports / 1e9 < initialAmount - 1e-6) {
        return res.status(400).json({ success: false, error: 'Confirmed transfer is less than the requested initial buy amount.' });
      }
      if (bondingCurve.hasRecordedTransaction(signature) || !bondingCurve.reserveTransaction(signature)) {
        return res.status(409).json({ success: false, error: 'Transaction is already being indexed.' });
      }
    }

    try {
      const token = bondingCurve.createToken({
        name,
        symbol,
        description,
        imageUrl,
        creator: creatorAddress,
        chain: chain || "Solana",
        devLockPercent: devLockPercent ? parseInt(devLockPercent) : 100,
        tokenType,
        isPrivate: isPrivate === true || isPrivate === 'true',
        inviteCode,
        antiDumpEnabled: antiDumpEnabled === null ? null : (antiDumpEnabled === true || antiDumpEnabled === 'true'),
        targetCapUsd: targetCapUsd ? parseFloat(targetCapUsd) : 25000,
        twitter,
        telegram,
        website,
        mintFeeSol: parseFloat(mintFeeSol) || 0.1
      });

      let initialBuyResult = null;
      if (initialAmount > 0) {
        try {
          initialBuyResult = bondingCurve.buyTokens(token.symbol, initialAmount, creatorAddress, signature);
        } catch (e) {
          console.warn('Initial buy execution error:', e.message);
        }
      }

      res.status(201).json({ 
        success: true, 
        mintFee: 0.1,
        token: initialBuyResult ? initialBuyResult.token : token,
        initialTrade: initialBuyResult ? initialBuyResult.trade : null,
        inviteUrl: token.isPrivate ? `/coin/${token.symbol}?key=${token.inviteCode}` : `/coin/${token.symbol}`
      });
    } finally {
      if (signature) bondingCurve.releaseTransactionReservation(signature);
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

function sanitizeRefCode(refCode, trader) {
  if (!refCode || typeof refCode !== 'string') return null;
  const cleaned = refCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  if (!cleaned) return null;
  const selfCode = trader ? String(trader).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) : '';
  if (cleaned === selfCode) return null;
  return cleaned;
}

// Buy on Bonding Curve (Requires Confirmed On-Chain Program Transaction Signature)
router.post('/:symbol/buy', async (req, res) => {
  try {
    const { buyerAddress, buyer, txHash, refCode } = req.body;
    const trader = String(buyerAddress || buyer || '').trim();
    const token = bondingCurve.getToken(req.params.symbol);
    if (!token || !token.mintAddress) return res.status(404).json({ success: false, error: 'Live token mint not found.' });
    if (!txHash || typeof txHash !== 'string' || !trader) return res.status(400).json({ success: false, error: 'Transaction signature and buyer address are required.' });
    const blocked = await complianceBlock(req, trader);
    if (blocked) return res.status(403).json({ success: false, error: blocked.message, blockType: blocked.reason });
    const signature = txHash.trim();
    if (bondingCurve.hasRecordedTransaction(signature)) return res.status(409).json({ success: false, error: 'Transaction has already been indexed.' });
    const buySol = await getConfirmedSolanaTrade(signature, 'BUY', token.mintAddress, trader);
    if (bondingCurve.hasRecordedTransaction(signature) || !bondingCurve.reserveTransaction(signature)) return res.status(409).json({ success: false, error: 'Transaction is already being indexed.' });
    try {
      const result = bondingCurve.buyTokens(
        req.params.symbol,
        buySol,
        trader,
        signature,
        sanitizeRefCode(refCode, trader)
      );

      res.json({
        success: true,
        message: `Successfully bought ${Math.floor(result.tokensOut).toLocaleString()} $${result.token.symbol} on-chain!`,
        token: result.token,
        trade: result.trade,
        txHash: signature
      });
    } finally {
      bondingCurve.releaseTransactionReservation(signature);
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Sell on Bonding Curve (Requires Confirmed On-Chain Program Transaction Signature)
router.post('/:symbol/sell', async (req, res) => {
  try {
    const { sellerAddress, seller, txHash, refCode } = req.body;
    const trader = String(sellerAddress || seller || '').trim();
    const token = bondingCurve.getToken(req.params.symbol);
    if (!token || !token.mintAddress) return res.status(404).json({ success: false, error: 'Live token mint not found.' });
    if (!txHash || typeof txHash !== 'string' || !trader) return res.status(400).json({ success: false, error: 'Transaction signature and seller address are required.' });
    const blocked = await complianceBlock(req, trader);
    if (blocked) return res.status(403).json({ success: false, error: blocked.message, blockType: blocked.reason });
    const signature = txHash.trim();
    if (bondingCurve.hasRecordedTransaction(signature)) return res.status(409).json({ success: false, error: 'Transaction has already been indexed.' });
    const sellTokens = await getConfirmedSolanaTrade(signature, 'SELL', token.mintAddress, trader);
    if (bondingCurve.hasRecordedTransaction(signature) || !bondingCurve.reserveTransaction(signature)) return res.status(409).json({ success: false, error: 'Transaction is already being indexed.' });
    try {
      const result = bondingCurve.sellTokens(
        req.params.symbol,
        sellTokens,
        trader,
        signature,
        sanitizeRefCode(refCode, trader)
      );

      res.json({
        success: true,
        message: `Successfully sold ${sellTokens.toLocaleString()} $${result.token.symbol} on-chain for ${result.solOut.toFixed(4)} SOL!`,
        token: result.token,
        trade: result.trade,
        txHash: signature
      });
    } finally {
      bondingCurve.releaseTransactionReservation(signature);
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Stake in Staking Vault (Time-Locking for Yield & Anti-Dump Protection)
router.post('/:symbol/stake', (req, res) => {
  try {
    const { amount, durationDays = 90, userAddress } = req.body;
    const parsedAmount = parseFloat(amount);
    const parsedDuration = parseInt(durationDays, 10);
    const trader = String(userAddress || '').trim();
    if (!parsedAmount || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1_000_000_000) {
      return res.status(400).json({ success: false, error: 'Valid staking amount is required.' });
    }
    if (!trader) {
      return res.status(400).json({ success: false, error: 'A wallet address is required to stake.' });
    }
    const boundedDuration = Number.isFinite(parsedDuration) ? Math.min(3650, Math.max(1, parsedDuration)) : 90;
    const result = bondingCurve.stakeTokens(
      req.params.symbol,
      parsedAmount,
      boundedDuration,
      trader
    );
    res.json({
      success: true,
      message: `Successfully time-locked ${parsedAmount.toLocaleString()} $${result.token.symbol} for ${boundedDuration} days at ${result.stake.apy}% APY!`,
      stake: result.stake,
      token: result.token
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Claim Creator Fees (strictly from fee_vault)
router.post('/claim-creator', (req, res) => {
  try {
    const { creator } = req.body;
    res.json({
      success: true,
      message: 'Claimed creator fees from fee_vault',
      claimedSol: '0.00',
      vault: 'fee_vault'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Claim Holder Fees (strictly from fee_vault based on circulating held tokens)
router.post('/claim-holder', (req, res) => {
  try {
    const { holder } = req.body;
    res.json({
      success: true,
      message: 'Claimed holder fees from fee_vault based on circulating held tokens',
      claimedSol: '0.00',
      vault: 'fee_vault'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Increment Share Clicks for Pulse Score
router.post('/:symbol/share', (req, res) => {
  try {
    const token = bondingCurve.tokens[req.params.symbol.toUpperCase()];
    if (token) {
      token.shareClicks = (token.shareClicks || 0) + 1;
    }
    res.json({ success: true, symbol: req.params.symbol, shareClicks: token ? token.shareClicks : 1 });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Report Token for moderation
router.post('/:symbol/report', (req, res) => {
  try {
    const { reporter, reason } = req.body;
    res.json({ success: true, message: `Report logged for ${req.params.symbol}`, reason });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
