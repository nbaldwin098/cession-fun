/**
 * Cession Market Data, Orderbook & Leaderboard Routes
 * Powered by TruePriceOracle Multi-Feed Aggregation
 */

const express = require('express');
const router = express.Router();
const priceEngine = require('../services/priceEngine');
const bondingCurve = require('../services/bondingCurve');
const marketData = require('../services/marketData');

/**
 * Get all real-time market tickers (including majors and top launchpad tokens)
 */
router.get('/tickers', (req, res) => {
  res.json({ success: true, tickers: priceEngine.getAllTickers() });
});

/**
 * Get single ticker with True-Price Composite metrics
 */
router.get('/tickers/:symbol', (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const token = bondingCurve.getToken(sym);
  
  if (token) {
    const metrics = marketData.calculateTokenMarketMetrics(token);
    return res.json({ success: true, ticker: metrics });
  }

  const ticker = priceEngine.getTicker(sym);
  if (!ticker) {
    return res.status(404).json({ success: false, error: "Ticker not found." });
  }
  res.json({ success: true, ticker });
});

/**
 * Get Full Market Data Package for ANY Coin / Token (Candles, L2 Depth, True Price Oracle)
 */
router.get('/token-data/:symbol', (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const key = req.query.key || null;
  const timeframe = req.query.timeframe || '15m';
  const token = bondingCurve.getToken(sym, key);

  if (!token) {
    return res.status(404).json({ success: false, error: "Token not found." });
  }

  const metrics = marketData.calculateTokenMarketMetrics(token);
  const candles = marketData.generateCandlesticks(token, timeframe, 60);
  const orderbook = marketData.generateOrderBook(token);

  res.json({
    success: true,
    token,
    metrics,
    candles,
    orderbook,
    recentTrades: token.recentTrades || []
  });
});

/**
 * Get Top Traders Daily PnL Leaderboard
 */
router.get('/leaderboard', (req, res) => {
  const leaderboard = bondingCurve.getLeaderboard();
  res.json({ success: true, count: leaderboard.length, leaderboard });
});

/**
 * Get Trending / Popular Coins (Closest to DEX Graduation)
 */
router.get('/trending', (req, res) => {
  const limit = parseInt(req.query.limit) || 6;
  const trending = bondingCurve.getTrendingCoins(limit);
  res.json({ success: true, count: trending.length, trending });
});

/**
 * Get New Coins Live Feed
 */
router.get('/new-listings', (req, res) => {
  const limit = parseInt(req.query.limit) || 6;
  const newListings = bondingCurve.getNewCoins(limit);
  res.json({ success: true, count: newListings.length, newListings });
});

/**
 * Get 24h Daily PnL Gainers / Losers
 */
router.get('/daily-gainers', (req, res) => {
  const limit = parseInt(req.query.limit) || 6;
  const gainers = bondingCurve.getCoinDailyGainers(limit);
  res.json({ success: true, count: gainers.length, gainers });
});

/**
 * Get OHLCV candlestick time-series for charts
 */
router.get('/candles/:symbol', (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const timeframe = req.query.timeframe || '15m';
  const token = bondingCurve.getToken(sym);

  if (token) {
    const candles = marketData.generateCandlesticks(token, timeframe, 60);
    return res.json({ success: true, symbol: sym, timeframe, count: candles.length, candles });
  }

  const candles = priceEngine.getCandles(sym);
  res.json({ success: true, symbol: sym, timeframe, count: candles.length, candles });
});

/**
 * Get L2 Orderbook Depth
 */
router.get('/orderbook/:symbol', (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const token = bondingCurve.getToken(sym);

  if (token) {
    const depth = marketData.generateOrderBook(token);
    return res.json({ success: true, symbol: sym, depth });
  }

  const depth = priceEngine.getOrderbook(sym);
  res.json({ success: true, symbol: sym, depth });
});

module.exports = router;
