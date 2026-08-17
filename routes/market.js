/**
 * Cession & Calabi Market Data, Orderbook & Crypto Directory Routes
 * Powered by TruePriceOracle Multi-Feed Aggregation
 */

const express = require('express');
const router = express.Router();
const priceEngine = require('../services/priceEngine');
const bondingCurve = require('../services/bondingCurve');
const marketData = require('../services/marketData');

/**
 * Get ALL Cryptocurrencies directory (50+ coins with live prices, 24h changes, volume, market cap, sparklines)
 */
router.get('/all-cryptos', (req, res) => {
  const category = req.query.category || 'all';
  const search = req.query.search || '';
  const cryptos = marketData.getAllCryptos(category, search);
  res.json({
    success: true,
    total: cryptos.length,
    category,
    search,
    cryptos
  });
});

/**
 * Get all real-time market tickers
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

  const bench = marketData.getBenchmarkPrice(sym);
  if (bench) {
    return res.json({ success: true, ticker: { symbol: sym, ...bench } });
  }

  const ticker = priceEngine.getTicker(sym);
  if (!ticker) {
    return res.status(404).json({ success: false, error: "Ticker not found." });
  }
  res.json({ success: true, ticker });
});

/**
 * Get Full Market Data Package for ANY Coin / Token
 */
router.get('/token-data/:symbol', (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const key = req.query.key || null;
  const timeframe = req.query.timeframe || '15m';
  const token = bondingCurve.getToken(sym, key) || { symbol: sym, name: sym, chain: 'Solana' };

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
 * Get OHLCV candlestick time-series for charts
 */
router.get('/candles/:symbol', (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const timeframe = req.query.timeframe || '15m';
  const token = bondingCurve.getToken(sym) || { symbol: sym, name: sym, chain: 'Solana' };

  const candles = marketData.generateCandlesticks(token, timeframe, 60);
  res.json({ success: true, symbol: sym, timeframe, count: candles.length, candles });
});

/**
 * Get L2 Orderbook Depth
 */
router.get('/orderbook/:symbol', (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const token = bondingCurve.getToken(sym) || { symbol: sym, name: sym, chain: 'Solana' };

  const depth = marketData.generateOrderBook(token);
  res.json({ success: true, symbol: sym, depth });
});

/**
 * Get Top Traders Daily PnL Leaderboard
 */
router.get('/leaderboard', (req, res) => {
  const leaderboard = bondingCurve.getLeaderboard();
  res.json({ success: true, count: leaderboard.length, leaderboard });
});

/**
 * Get Trending / Popular Coins
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

module.exports = router;
