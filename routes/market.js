/**
 * Calabi Market Data, Orderbook & Leaderboard Routes
 */

const express = require('express');
const router = express.Router();
const priceEngine = require('../services/priceEngine');
const bondingCurve = require('../services/bondingCurve');

/**
 * Get all real-time market tickers
 */
router.get('/tickers', (req, res) => {
  res.json({ success: true, tickers: priceEngine.getAllTickers() });
});

/**
 * Get single ticker
 */
router.get('/tickers/:symbol', (req, res) => {
  const ticker = priceEngine.getTicker(req.params.symbol);
  if (!ticker) {
    return res.status(404).json({ success: false, error: "Ticker not found." });
  }
  res.json({ success: true, ticker });
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
 * Get OHLCV candlestick time-series for TradingView charts
 */
router.get('/candles/:symbol', (req, res) => {
  const candles = priceEngine.getCandles(req.params.symbol);
  res.json({ success: true, symbol: req.params.symbol.toUpperCase(), count: candles.length, candles });
});

/**
 * Get L2 Orderbook Depth
 */
router.get('/orderbook/:symbol', (req, res) => {
  const depth = priceEngine.getOrderbook(req.params.symbol);
  res.json({ success: true, symbol: req.params.symbol.toUpperCase(), depth });
});

module.exports = router;
