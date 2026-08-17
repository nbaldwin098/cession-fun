/**
 * Calabi 100x Launchpad & Bonding Curve API Routes
 */

const express = require('express');
const router = express.Router();
const bondingCurve = require('../services/bondingCurve');

// Get all tokens
router.get('/', (req, res) => {
  const { sort = 'trending', chain = 'all' } = req.query;
  const tokens = bondingCurve.getAllTokens(sort, chain);
  res.json({ success: true, count: tokens.length, tokens });
});

// Get King of the Hill (highest progress token)
router.get('/king', (req, res) => {
  const king = bondingCurve.getKingOfTheHill();
  res.json({ success: true, king });
});

// Get Single Token details
router.get('/:symbol', (req, res) => {
  const token = bondingCurve.getToken(req.params.symbol);
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

// Create/Deploy New Token
router.post('/create', (req, res) => {
  try {
    const { name, symbol, description, imageUrl, creator, chain, devLockPercent } = req.body;
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
      devLockPercent: devLockPercent ? parseInt(devLockPercent) : 100
    });
    res.status(201).json({ success: true, token });
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

// Sell on Bonding Curve
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

module.exports = router;
