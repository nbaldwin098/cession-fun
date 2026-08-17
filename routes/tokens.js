/**
 * Calabi 100x Launchpad & Bonding Curve API Routes
 * Dual Sprint & Sovereign Stack Endpoints
 */

const express = require('express');
const router = express.Router();
const bondingCurve = require('../services/bondingCurve');

// Get all tokens (supports filter by type, chain, sorting, and private unlock)
router.get('/', (req, res) => {
  const { sort = 'trending', chain = 'all', type = 'all', key = null } = req.query;
  const tokens = bondingCurve.getAllTokens(sort, chain, type, false, key);
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

// Post Token Chat message
router.post('/:symbol/chat', (req, res) => {
  const { user = 'Anon', text, badge = 'TRADER' } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
  }
  const msg = bondingCurve.addChatMessage(req.params.symbol, user, text, badge);
  res.json({ success: true, message: msg });
});

// Create/Deploy New Token (Meme Sprint OR Long-Term Sovereign Stack)
router.post('/create', (req, res) => {
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
      targetCapUsd = 25000
    } = req.body;

    if (!name || !symbol) {
      return res.status(400).json({ success: false, error: 'Token name and symbol are required.' });
    }

    const token = bondingCurve.createToken({
      name,
      symbol,
      description,
      imageUrl,
      creator: creator || "0xCalabiAnonDev",
      chain: chain || "Base",
      devLockPercent: devLockPercent ? parseInt(devLockPercent) : 100,
      tokenType,
      isPrivate: isPrivate === true || isPrivate === 'true',
      inviteCode,
      antiDumpEnabled: antiDumpEnabled === null ? null : (antiDumpEnabled === true || antiDumpEnabled === 'true'),
      targetCapUsd: targetCapUsd ? parseFloat(targetCapUsd) : 25000
    });

    res.status(201).json({ 
      success: true, 
      token,
      inviteUrl: token.isPrivate ? `/coin/${token.symbol}?key=${token.inviteCode}` : `/coin/${token.symbol}`
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Buy on Bonding Curve
router.post('/:symbol/buy', (req, res) => {
  try {
    const { solAmount, buyerAddress } = req.body;
    if (!solAmount || solAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid SOL / ETH amount is required.' });
    }
    const result = bondingCurve.buyTokens(
      req.params.symbol,
      solAmount,
      buyerAddress || '0xCalabiTrader'
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
    const { tokenAmount, sellerAddress } = req.body;
    if (!tokenAmount || tokenAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid token amount is required.' });
    }
    const result = bondingCurve.sellTokens(
      req.params.symbol,
      tokenAmount,
      sellerAddress || '0xCalabiTrader'
    );
    res.json({
      success: true,
      message: `Successfully sold ${tokenAmount} $${result.token.symbol} for ${result.solOut.toFixed(4)} SOL!`,
      token: result.token,
      trade: result.trade
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Stake in Diamond Vault (Time-Locking for Long-Term Sovereign Stacks)
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
