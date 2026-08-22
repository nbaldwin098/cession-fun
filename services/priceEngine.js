/**
 * Live prices from Coinbase Exchange public WebSocket + REST bootstrap.
 * No simulated ticks for real pairs. One real price source.
 */
const WebSocket = require('ws');
const https = require('https');

const PRODUCTS = [
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD', 'LINK-USD',
  'AVAX-USD', 'ADA-USD', 'DOT-USD', 'LTC-USD', 'BCH-USD', 'UNI-USD',
  'AAVE-USD', 'ATOM-USD', 'NEAR-USD'
];

function emptyTicker(symbol) {
  return {
    symbol,
    price: null,
    change24h: null,
    high24h: null,
    low24h: null,
    volume24h: null,
    lastUpdate: null,
    source: 'coinbase',
    live: false
  };
}

class PriceEngine {
  constructor() {
    this.tickers = {};
    PRODUCTS.forEach((s) => { this.tickers[s] = emptyTicker(s); });
    this.candles = new Map();
    this.orderbooks = new Map();
    this.listeners = new Set();
    this.coinbaseWs = null;
    this.reconnectTimer = null;
    this._bootstrapRest();
    this._connectCoinbaseWebSocket();
  }

  _httpsGet(url) {
    return new Promise((resolve, reject) => {
      https
        .get(url, { headers: { 'User-Agent': 'cession-us/1.0', Accept: 'application/json' } }, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
          });
        })
        .on('error', reject);
    });
  }

  async _bootstrapRest() {
    for (const product of PRODUCTS) {
      try {
        const t = await this._httpsGet('https://api.exchange.coinbase.com/products/' + product + '/ticker');
        const stats = await this._httpsGet('https://api.exchange.coinbase.com/products/' + product + '/stats').catch(() => null);
        const price = parseFloat(t.price);
        if (!isFinite(price)) continue;
        const row = this.tickers[product] || emptyTicker(product);
        row.price = price;
        row.volume24h = stats && stats.volume ? parseFloat(stats.volume) : parseFloat(t.volume || 0);
        if (stats) {
          row.high24h = stats.high ? parseFloat(stats.high) : price;
          row.low24h = stats.low ? parseFloat(stats.low) : price;
          const open = stats.open ? parseFloat(stats.open) : null;
          if (open && open > 0) row.change24h = ((price - open) / open) * 100;
        }
        row.lastUpdate = Date.now();
        row.live = true;
        row.source = 'coinbase';
        this.tickers[product] = row;
        this._seedCandle(product, price);
      } catch (e) {}
    }
    console.log('[PriceEngine] REST bootstrap done');
  }

  _seedCandle(symbol, price) {
    if (!this.candles.has(symbol)) this.candles.set(symbol, []);
    const list = this.candles.get(symbol);
    if (list.length === 0) {
      list.push({ time: Math.floor(Date.now() / 1000), open: price, high: price, low: price, close: price, volume: 0 });
    }
  }

  _connectCoinbaseWebSocket() {
    try {
      this.coinbaseWs = new WebSocket('wss://ws-feed.exchange.coinbase.com');
      this.coinbaseWs.on('open', () => {
        console.log('[PriceEngine] Coinbase WS live');
        this.coinbaseWs.send(JSON.stringify({ type: 'subscribe', product_ids: PRODUCTS, channels: ['ticker'] }));
      });
      this.coinbaseWs.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'ticker' && msg.product_id && msg.price) {
            this._handleCoinbaseTick(msg.product_id, parseFloat(msg.price), parseFloat(msg.volume_24h || 0));
          }
        } catch (err) {}
      });
      this.coinbaseWs.on('error', () => console.warn('[PriceEngine] Coinbase WS error'));
      this.coinbaseWs.on('close', () => {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this._connectCoinbaseWebSocket(), 5000);
      });
    } catch (e) {
      console.warn('[PriceEngine] WS init failed', e.message);
    }
  }

  _handleCoinbaseTick(symbol, price, volume24h) {
    if (!isFinite(price)) return;
    let ticker = this.tickers[symbol];
    if (!ticker) {
      ticker = emptyTicker(symbol);
      this.tickers[symbol] = ticker;
    }
    ticker.price = price;
    if (ticker.high24h == null || price > ticker.high24h) ticker.high24h = price;
    if (ticker.low24h == null || price < ticker.low24h) ticker.low24h = price;
    if (volume24h > 0) ticker.volume24h = volume24h;
    ticker.lastUpdate = Date.now();
    ticker.live = true;
    ticker.source = 'coinbase';
    this._updateCandle(symbol, price);
    this._broadcast({ type: 'TICK', data: ticker });
  }

  _updateCandle(symbol, price) {
    if (!this.candles.has(symbol)) this.candles.set(symbol, []);
    const list = this.candles.get(symbol);
    const now = Math.floor(Date.now() / 1000);
    if (list.length === 0) {
      list.push({ time: now, open: price, high: price, low: price, close: price, volume: 1 });
      return;
    }
    const last = list[list.length - 1];
    if (now - last.time < 60) {
      last.high = Math.max(last.high, price);
      last.low = Math.min(last.low, price);
      last.close = price;
      last.volume += 0.1;
    } else {
      list.push({ time: now, open: last.close, high: Math.max(last.close, price), low: Math.min(last.close, price), close: price, volume: 1 });
      if (list.length > 500) list.shift();
    }
  }

  addClient(ws) {
    this.listeners.add(ws);
    try { ws.send(JSON.stringify({ type: 'SNAPSHOT', tickers: this.tickers })); } catch (e) {}
  }

  removeClient(ws) { this.listeners.delete(ws); }

  _broadcast(msg) {
    const payload = JSON.stringify(msg);
    for (const ws of this.listeners) {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(payload); } catch (e) {}
      }
    }
  }

  getTicker(symbol) {
    const s = String(symbol || '').toUpperCase();
    const key = s.includes('-') ? s : s + '-USD';
    return this.tickers[key] || this.tickers[s] || null;
  }

  getAllTickers() {
    return Object.values(this.tickers).filter((t) => t.price != null);
  }

  getCandles(symbol) {
    const s = String(symbol || '').toUpperCase();
    const key = s.includes('-') ? s : s + '-USD';
    return this.candles.get(key) || this.candles.get(s) || [];
  }

  getOrderbook() { return { bids: [], asks: [] }; }
  getProducts() { return PRODUCTS.slice(); }
}

module.exports = new PriceEngine();
