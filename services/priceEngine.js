/**
 * Live prices from Binance public REST + WebSocket.
 */
const WebSocket = require('ws');
const https = require('https');

const PRODUCTS = [
  { symbol: 'BTC-USDT', bin: 'btcusdt' },
  { symbol: 'ETH-USDT', bin: 'ethusdt' },
  { symbol: 'SOL-USDT', bin: 'solusdt' },
  { symbol: 'XRP-USDT', bin: 'xrpusdt' },
  { symbol: 'DOGE-USDT', bin: 'dogeusdt' },
  { symbol: 'LINK-USDT', bin: 'linkusdt' },
  { symbol: 'AVAX-USDT', bin: 'avaxusdt' },
  { symbol: 'ADA-USDT', bin: 'adausdt' },
  { symbol: 'DOT-USDT', bin: 'dotusdt' },
  { symbol: 'BNB-USDT', bin: 'bnbusdt' }
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
    source: 'binance',
    live: false
  };
}

class PriceEngine {
  constructor() {
    this.tickers = {};
    PRODUCTS.forEach((p) => {
      this.tickers[p.symbol] = emptyTicker(p.symbol);
    });
    this.candles = new Map();
    this.listeners = new Set();
    this.ws = null;
    this.reconnectTimer = null;
    this._bootstrapRest();
    this._connectWs();
    setInterval(() => this._bootstrapRest().catch(() => {}), 30000);
  }

  _httpsGet(url) {
    return new Promise((resolve, reject) => {
      https
        .get(url, { headers: { 'User-Agent': 'cession-us/1.0', Accept: 'application/json' } }, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          });
        })
        .on('error', reject);
    });
  }

  async _bootstrapRest() {
    try {
      const all = await this._httpsGet('https://api.binance.com/api/v3/ticker/24hr');
      const map = {};
      PRODUCTS.forEach((p) => {
        map[p.bin.toUpperCase()] = p.symbol;
      });
      all.forEach((row) => {
        const sym = map[row.symbol];
        if (!sym) return;
        const price = parseFloat(row.lastPrice);
        if (!isFinite(price)) return;
        const t = this.tickers[sym] || emptyTicker(sym);
        t.price = price;
        t.change24h = parseFloat(row.priceChangePercent);
        t.high24h = parseFloat(row.highPrice);
        t.low24h = parseFloat(row.lowPrice);
        t.volume24h = parseFloat(row.volume);
        t.lastUpdate = Date.now();
        t.live = true;
        t.source = 'binance';
        this.tickers[sym] = t;
      });
    } catch (e) {
      console.warn('[PriceEngine] Binance REST failed', e.message);
    }
  }

  _connectWs() {
    try {
      const streams = PRODUCTS.map((p) => p.bin + '@ticker').join('/');
      const url = 'wss://stream.binance.com:9443/stream?streams=' + streams;
      this.ws = new WebSocket(url);
      this.ws.on('open', () => console.log('[PriceEngine] Binance WS live'));
      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          const d = msg.data || msg;
          if (!d || !d.s) return;
          const bin = String(d.s).toLowerCase();
          const prod = PRODUCTS.find((p) => p.bin === bin);
          if (!prod) return;
          const price = parseFloat(d.c);
          if (!isFinite(price)) return;
          const t = this.tickers[prod.symbol] || emptyTicker(prod.symbol);
          t.price = price;
          if (d.P != null) t.change24h = parseFloat(d.P);
          if (d.h) t.high24h = parseFloat(d.h);
          if (d.l) t.low24h = parseFloat(d.l);
          if (d.v) t.volume24h = parseFloat(d.v);
          t.lastUpdate = Date.now();
          t.live = true;
          t.source = 'binance';
          this.tickers[prod.symbol] = t;
          this._broadcast({ type: 'TICK', data: t });
        } catch (e) {}
      });
      this.ws.on('close', () => {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this._connectWs(), 5000);
      });
      this.ws.on('error', () => {
        try {
          this.ws.close();
        } catch (e) {}
      });
    } catch (e) {
      console.warn('[PriceEngine] Binance WS init failed', e.message);
    }
  }

  addClient(ws) {
    this.listeners.add(ws);
    try {
      ws.send(JSON.stringify({ type: 'SNAPSHOT', tickers: this.tickers }));
    } catch (e) {}
  }

  removeClient(ws) {
    this.listeners.delete(ws);
  }

  _broadcast(msg) {
    const payload = JSON.stringify(msg);
    for (const c of this.listeners) {
      if (c.readyState === WebSocket.OPEN) {
        try {
          c.send(payload);
        } catch (e) {}
      }
    }
  }

  getTicker(symbol) {
    const s = String(symbol || '').toUpperCase();
    if (this.tickers[s]) return this.tickers[s];
    if (this.tickers[s + '-USDT']) return this.tickers[s + '-USDT'];
    if (this.tickers[s.replace('-USD', '-USDT')]) return this.tickers[s.replace('-USD', '-USDT')];
    return null;
  }

  getAllTickers() {
    return Object.values(this.tickers).filter((t) => t.price != null);
  }

  getCandles() {
    return [];
  }

  getOrderbook() {
    return { bids: [], asks: [] };
  }

  getProducts() {
    return PRODUCTS.map((p) => p.symbol);
  }
}

module.exports = new PriceEngine();
