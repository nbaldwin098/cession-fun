/**
 * Cession 100x Launchpad & Bonding Curve API Routes
 * Dual Sprint & Sovereign Stack Endpoints
 */

const express = require('express');
const router = express.Router();
const bondingCurve = require('../services/bondingCurve');

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

// Get Token Bundles / Curated Baskets
router.get(['/collections', '/bundles'], (req, res) => {
  const collections = bondingCurve.getAllCollections();
  res.json({ success: true, count: collections.length, collections, bundles: collections });
});

// Get Top Performing Bundles
router.get(['/collections/top', '/bundles/top'], (req, res) => {
  const top = bondingCurve.getTopPerformingBundles();
  res.json({ success: true, count: top.length, bundles: top });
});

// Get Worst Performing Bundles (Dip Hunters)
router.get(['/collections/worst', '/bundles/worst'], (req, res) => {
  const worst = bondingCurve.getWorstPerformingBundles();
  res.json({ success: true, count: worst.length, bundles: worst });
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
    const { name, symbol, description, creator, tokens, imageUrl } = req.body;
    const newCollection = bondingCurve.createCollection({
      name,
      symbol,
      description,
      creator: creator || "0xCreator",
      tokens,
      imageUrl
    });
    res.status(201).json({ success: true, collection: newCollection, bundle: newCollection });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 1-Click Buy Token Bundle
router.post(['/collections/:id/buy', '/bundles/:id/buy'], (req, res) => {
  try {
    const { solAmount, totalSolAmount, buyerAddress } = req.body;
    const amount = totalSolAmount || solAmount;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid SOL amount is required for bundle purchase.' });
    }
    const result = bondingCurve.buyCollection(
      req.params.id,
      amount,
      buyerAddress || '0xCessionTrader'
    );
    res.json(result);
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
  res.json({ success: true, token });
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
router.post(['/create', '/deploy', '/launch'], (req, res) => {
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
      mintFeeSol = 0.1
    } = req.body;

    if (!name || !symbol) {
      return res.status(400).json({ success: false, error: 'Token name and symbol are required.' });
    }

    const token = bondingCurve.createToken({
      name,
      symbol,
      description,
      imageUrl,
      creator: creator || "0xCessionAnonDev",
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
    const initialAmount = initialBuySol ? parseFloat(initialBuySol) : 0;
    if (initialAmount > 0) {
      try {
        initialBuyResult = bondingCurve.buyTokens(token.symbol, initialAmount, creator || "0xCessionAnonDev");
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
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Buy on Bonding Curve
router.post('/:symbol/buy', (req, res) => {
  try {
    const { solAmount, amount, buyerAddress, buyer } = req.body;
    const buySol = parseFloat(solAmount || amount);
    if (!buySol || buySol <= 0 || isNaN(buySol)) {
      return res.status(400).json({ success: false, error: 'Valid SOL amount is required.' });
    }
    const result = bondingCurve.buyTokens(
      req.params.symbol,
      buySol,
      buyerAddress || buyer || '0xCessionTrader'
    );
    res.json({
      success: true,
      message: `Successfully bought ${Math.floor(result.tokensOut).toLocaleString()} $${result.token.symbol}! (MEV Shield Active)`,
      token: result.token,
      trade: result.trade
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Sell on Bonding Curve (with Anti-Dump verification)
router.post('/:symbol/sell', (req, res) => {
  try {
    const { tokenAmount, amount, sellerAddress, seller } = req.body;
    const sellTokens = parseFloat(tokenAmount || amount);
    if (!sellTokens || sellTokens <= 0 || isNaN(sellTokens)) {
      return res.status(400).json({ success: false, error: 'Valid token amount is required.' });
    }
    const result = bondingCurve.sellTokens(
      req.params.symbol,
      sellTokens,
      sellerAddress || seller || '0xCessionTrader'
    );
    res.json({
      success: true,
      message: `Successfully sold ${sellTokens} $${result.token.symbol} for ${result.solOut.toFixed(4)} SOL!`,
      token: result.token,
      trade: result.trade
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Stake in Staking Vault (Time-Locking for Yield & Anti-Dump Protection)
router.post('/:symbol/stake', (req, res) => {
  try {
    const { amount, durationDays = 90, userAddress } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid staking amount is required.' });
    }
    const result = bondingCurve.stakeTokens(
      req.params.symbol,
      amount,
      parseInt(durationDays) || 90,
      userAddress || '0xUser'
    );
    res.json({
      success: true,
      message: `Successfully time-locked ${amount.toLocaleString()} $${result.token.symbol} for ${durationDays} days at ${result.stake.apy}% APY!`,
      stake: result.stake,
      token: result.token
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
