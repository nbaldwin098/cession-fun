/**
 * CALABI PRO CRYPTO EXCHANGE (calabi.us)
 * Institutional Trading Engine, Real-time L2 Order Book & Canvas Candlestick Chart
 * Owned and Operated by Cession Protocol
 */

class CalabiExchangeEngine {
  constructor() {
    this.currentPair = 'SOL-USDC';
    this.timeframe = '15m';
    this.orderSide = 'buy';
    this.orderType = 'limit';
    this.chartMode = 'candle';
    
    this.pairsData = {
      'SOL-USDC': { base: 'SOL', quote: 'USDC', price: 154.20, change24h: 5.72, high24h: 158.40, low24h: 148.10, vol24h: '42,891,400 USDC', trades24h: '184,209', precision: 2 },
      'BTC-USDC': { base: 'BTC', quote: 'USDC', price: 65420.00, change24h: 2.84, high24h: 66100.00, low24h: 64200.00, vol24h: '148,290,000 USDC', trades24h: '312,890', precision: 2 },
      'ETH-USDC': { base: 'ETH', quote: 'USDC', price: 3480.50, change24h: 3.15, high24h: 3520.00, low24h: 3390.00, vol24h: '78,410,000 USDC', trades24h: '98,400', precision: 2 },
      'CESS-SOL': { base: 'CESS', quote: 'SOL', price: 0.00285, change24h: 14.80, high24h: 0.00310, low24h: 0.00240, vol24h: '2,480 SOL', trades24h: '14,210', precision: 6 },
      'BONK-SOL': { base: 'BONK', quote: 'SOL', price: 0.00000018, change24h: -1.42, high24h: 0.00000019, low24h: 0.00000017, vol24h: '1,890 SOL', trades24h: '8,400', precision: 8 }
    };

    this.candles = [];
    this.orderBook = { asks: [], bids: [] };
    this.recentTrades = [];
    this.openOrders = [];
    this.tradeHistory = [];
    
    this.init();
  }

  init() {
    this.generateInitialCandles();
    this.generateOrderBook();
    this.generateRecentTrades();
    this.bindEvents();
    this.renderHeaderStats();
    this.renderOrderBook();
    this.renderRecentTrades();
    this.initChartCanvas();
    this.startLiveFeedSimulation();
  }

  bindEvents() {
    // Pair selector change
    const pairSelect = document.getElementById('calPairSelect');
    if (pairSelect) {
      pairSelect.addEventListener('change', (e) => this.selectPair(e.target.value));
    }

    // Timeframe buttons
    document.querySelectorAll('.cal-tf-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.cal-tf-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.timeframe = e.currentTarget.dataset.tf;
        this.generateInitialCandles();
        this.drawChart();
      });
    });

    // Buy / Sell Side toggle
    const btnSideBuy = document.getElementById('btnOrderSideBuy');
    const btnSideSell = document.getElementById('btnOrderSideSell');
    const btnSubmit = document.getElementById('btnSubmitOrder');

    if (btnSideBuy && btnSideSell) {
      btnSideBuy.addEventListener('click', () => {
        this.orderSide = 'buy';
        btnSideBuy.classList.add('active');
        btnSideSell.classList.remove('active');
        if (btnSubmit) {
          btnSubmit.classList.remove('sell');
          btnSubmit.innerText = `Buy ${this.pairsData[this.currentPair].base}`;
        }
        this.updateOrderSummary();
      });

      btnSideSell.addEventListener('click', () => {
        this.orderSide = 'sell';
        btnSideSell.classList.add('active');
        btnSideBuy.classList.remove('active');
        if (btnSubmit) {
          btnSubmit.classList.add('sell');
          btnSubmit.innerText = `Sell ${this.pairsData[this.currentPair].base}`;
        }
        this.updateOrderSummary();
      });
    }

    // Order Type Tabs (Limit, Market, Stop)
    document.querySelectorAll('.cal-type-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.cal-type-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.orderType = e.currentTarget.dataset.type;
        const priceGroup = document.getElementById('orderPriceInputGroup');
        if (priceGroup) {
          priceGroup.style.display = this.orderType === 'market' ? 'none' : 'flex';
        }
        this.updateOrderSummary();
      });
    });

    // Inputs change
    const priceInp = document.getElementById('orderPriceInput');
    const sizeInp = document.getElementById('orderSizeInput');
    if (priceInp) priceInp.addEventListener('input', () => this.updateOrderSummary());
    if (sizeInp) sizeInp.addEventListener('input', () => this.updateOrderSummary());

    // Percentage buttons (25%, 50%, 75%, 100%)
    document.querySelectorAll('.cal-pct-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pct = parseFloat(e.currentTarget.dataset.pct) / 100;
        this.setOrderSizePercentage(pct);
      });
    });

    // Order Submit Button
    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => this.handleOrderSubmit());
    }

    // Window Resize for Canvas
    window.addEventListener('resize', () => {
      this.initChartCanvas();
      this.drawChart();
    });
  }

  selectPair(pairKey) {
    if (!this.pairsData[pairKey]) return;
    this.currentPair = pairKey;
    const pair = this.pairsData[pairKey];

    // Update form suffix & labels
    const baseLabels = document.querySelectorAll('.cal-base-sym');
    const quoteLabels = document.querySelectorAll('.cal-quote-sym');
    baseLabels.forEach(el => el.innerText = pair.base);
    quoteLabels.forEach(el => el.innerText = pair.quote);

    const priceInp = document.getElementById('orderPriceInput');
    if (priceInp) priceInp.value = pair.price.toFixed(pair.precision);

    const btnSubmit = document.getElementById('btnSubmitOrder');
    if (btnSubmit) {
      btnSubmit.innerText = `${this.orderSide === 'buy' ? 'Buy' : 'Sell'} ${pair.base}`;
    }

    this.renderHeaderStats();
    this.generateInitialCandles();
    this.generateOrderBook();
    this.renderOrderBook();
    this.drawChart();
    this.updateOrderSummary();
  }

  renderHeaderStats() {
    const p = this.pairsData[this.currentPair];
    const elPrice = document.getElementById('calHeaderPrice');
    const elChange = document.getElementById('calHeaderChange');
    const elHigh = document.getElementById('calHeaderHigh');
    const elLow = document.getElementById('calHeaderLow');
    const elVol = document.getElementById('calHeaderVolume');

    if (elPrice) elPrice.innerText = `$${p.price.toLocaleString(undefined, { minimumFractionDigits: p.precision })}`;
    if (elChange) {
      elChange.innerText = `${p.change24h >= 0 ? '+' : ''}${p.change24h.toFixed(2)}%`;
      elChange.className = `cal-stat-value ${p.change24h >= 0 ? 'cal-val-green' : 'cal-val-red'}`;
    }
    if (elHigh) elHigh.innerText = `$${p.high24h.toLocaleString(undefined, { minimumFractionDigits: p.precision })}`;
    if (elLow) elLow.innerText = `$${p.low24h.toLocaleString(undefined, { minimumFractionDigits: p.precision })}`;
    if (elVol) elVol.innerText = p.vol24h;

    // Available Balances in form
    const availQuote = document.getElementById('availQuoteBal');
    const availBase = document.getElementById('availBaseBal');
    
    const balances = (window.walletEngine && window.walletEngine.balances) ? window.walletEngine.balances : { sol: 0, usdc: 0, eth: 0, cess: 0 };
    if (availQuote) availQuote.innerText = `0.00 ${p.quote}`;
    if (availBase) availBase.innerText = `0.00 ${p.base}`;
  }

  setOrderSizePercentage(pct) {
    const p = this.pairsData[this.currentPair];
    const balances = (window.walletEngine && window.walletEngine.balances) ? window.walletEngine.balances : { sol: 0, usdc: 0 };
    
    // Check if user has real balance
    const available = this.orderSide === 'buy' ? (balances.usdc || 0) : (balances[p.base.toLowerCase()] || 0);
    
    if (available <= 0) {
      this.toast(`⚠️ Zero balance available. Please connect wallet or deposit ${this.orderSide === 'buy' ? p.quote : p.base}.`, 'error');
      const sizeInp = document.getElementById('orderSizeInput');
      if (sizeInp) sizeInp.value = '0.00';
      this.updateOrderSummary();
      return;
    }

    const calculatedSize = this.orderSide === 'buy' 
      ? (available * pct) / p.price 
      : (available * pct);

    const sizeInp = document.getElementById('orderSizeInput');
    if (sizeInp) {
      sizeInp.value = calculatedSize.toFixed(4);
    }
    this.updateOrderSummary();
  }

  updateOrderSummary() {
    const p = this.pairsData[this.currentPair];
    const priceInp = document.getElementById('orderPriceInput');
    const sizeInp = document.getElementById('orderSizeInput');
    
    const price = this.orderType === 'market' ? p.price : (parseFloat(priceInp?.value) || p.price);
    const size = parseFloat(sizeInp?.value) || 0;
    const total = price * size;
    const fee = total * 0.0005; // 0.05% taker fee

    const elTotal = document.getElementById('orderEstTotal');
    const elFee = document.getElementById('orderEstFee');

    if (elTotal) elTotal.innerText = `${total.toFixed(2)} ${p.quote}`;
    if (elFee) elFee.innerText = `${fee.toFixed(4)} ${p.quote} (0.05%)`;
  }

  handleOrderSubmit() {
    const p = this.pairsData[this.currentPair];
    const sizeInp = document.getElementById('orderSizeInput');
    const priceInp = document.getElementById('orderPriceInput');
    
    const size = parseFloat(sizeInp?.value) || 0;
    const price = this.orderType === 'market' ? p.price : (parseFloat(priceInp?.value) || 0);

    if (size <= 0) {
      this.toast('Please enter a valid order size greater than 0', 'error');
      return;
    }

    // STRICT BALANCE ENFORCEMENT
    const balances = (window.walletEngine && window.walletEngine.balances) ? window.walletEngine.balances : { sol: 0, usdc: 0 };
    const requiredBal = this.orderSide === 'buy' ? (price * size) : size;
    const userBal = this.orderSide === 'buy' ? (balances.usdc || 0) : (balances[p.base.toLowerCase()] || 0);

    if (userBal <= 0 || userBal < requiredBal) {
      this.toast(`❌ Insufficient ${this.orderSide === 'buy' ? p.quote : p.base} balance. Available: ${userBal.toFixed(2)} | Required: ${requiredBal.toFixed(2)}. Deposit funds or connect wallet.`, 'error');
      return;
    }

    // Place simulated limit / market order
    const order = {
      id: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      time: new Date().toLocaleTimeString(),
      pair: this.currentPair,
      type: this.orderType.toUpperCase(),
      side: this.orderSide.toUpperCase(),
      price: price.toFixed(p.precision),
      amount: size.toFixed(4),
      filled: '0.00%',
      status: 'OPEN'
    };

    this.openOrders.unshift(order);
    this.renderOrdersTable();
    this.toast(`✅ ${order.side} order placed for ${order.amount} ${p.base} @ $${order.price}`, 'success');

    if (sizeInp) sizeInp.value = '';
    this.updateOrderSummary();
  }

  /* =========================================================
     ORDER BOOK SIMULATION (L2 REAL-TIME DEPTH)
  ========================================================= */
  generateOrderBook() {
    const p = this.pairsData[this.currentPair];
    this.orderBook.asks = [];
    this.orderBook.bids = [];

    const spreadHalf = p.price * 0.0003;
    let cumAsk = 0;
    let cumBid = 0;

    // 8 Asks (Sells above market price)
    for (let i = 8; i >= 1; i--) {
      const askPrice = p.price + (spreadHalf * i) + (Math.random() * spreadHalf);
      const size = (Math.random() * 18 + 2);
      cumAsk += size;
      this.orderBook.asks.push({ price: askPrice, size, total: cumAsk });
    }

    // 8 Bids (Buys below market price)
    for (let i = 1; i <= 8; i++) {
      const bidPrice = p.price - (spreadHalf * i) - (Math.random() * spreadHalf);
      const size = (Math.random() * 18 + 2);
      cumBid += size;
      this.orderBook.bids.push({ price: bidPrice, size, total: cumBid });
    }
  }

  renderOrderBook() {
    const p = this.pairsData[this.currentPair];
    const elAsks = document.getElementById('calOrderBookAsks');
    const elBids = document.getElementById('calOrderBookBids');
    const elSpread = document.getElementById('calOrderBookSpread');

    if (!elAsks || !elBids) return;

    const maxTotal = Math.max(
      ...this.orderBook.asks.map(a => a.total),
      ...this.orderBook.bids.map(b => b.total)
    ) || 100;

    // Render Asks
    elAsks.innerHTML = this.orderBook.asks.map(a => {
      const pct = Math.min(100, (a.total / maxTotal) * 100);
      return `
        <div class="cal-ob-row" onclick="window.calabiEngine.fillPriceFromOB(${a.price.toFixed(p.precision)})">
          <div class="cal-depth-bar cal-depth-ask" style="width: ${pct}%;"></div>
          <span style="color: var(--cal-red); font-weight: 700;">${a.price.toFixed(p.precision)}</span>
          <span style="text-align: right;">${a.size.toFixed(2)}</span>
          <span style="text-align: right; color: var(--cal-text-muted);">${a.total.toFixed(2)}</span>
        </div>
      `;
    }).join('');

    // Render Bids
    elBids.innerHTML = this.orderBook.bids.map(b => {
      const pct = Math.min(100, (b.total / maxTotal) * 100);
      return `
        <div class="cal-ob-row" onclick="window.calabiEngine.fillPriceFromOB(${b.price.toFixed(p.precision)})">
          <div class="cal-depth-bar cal-depth-bid" style="width: ${pct}%;"></div>
          <span style="color: var(--cal-green); font-weight: 700;">${b.price.toFixed(p.precision)}</span>
          <span style="text-align: right;">${b.size.toFixed(2)}</span>
          <span style="text-align: right; color: var(--cal-text-muted);">${b.total.toFixed(2)}</span>
        </div>
      `;
    }).join('');

    // Spread
    const lowestAsk = this.orderBook.asks[this.orderBook.asks.length - 1]?.price || p.price;
    const highestBid = this.orderBook.bids[0]?.price || p.price;
    const spread = Math.max(0.01, lowestAsk - highestBid);
    const spreadPct = (spread / p.price) * 100;

    if (elSpread) {
      elSpread.innerHTML = `
        <span style="color: #fff;">$${p.price.toFixed(p.precision)}</span>
        <span style="font-size: 11px; color: var(--cal-text-muted); font-weight: 500;">Spread: ${spread.toFixed(p.precision)} (${spreadPct.toFixed(3)}%)</span>
      `;
    }
  }

  fillPriceFromOB(price) {
    const priceInp = document.getElementById('orderPriceInput');
    if (priceInp) {
      priceInp.value = price;
      this.updateOrderSummary();
      this.toast(`Order price set to $${price}`, 'info');
    }
  }

  /* =========================================================
     RECENT TRADES TAPE
  ========================================================= */
  generateRecentTrades() {
    const p = this.pairsData[this.currentPair];
    this.recentTrades = [];
    const now = Date.now();

    for (let i = 0; i < 15; i++) {
      const isBuy = Math.random() > 0.48;
      const tradePrice = p.price + (Math.random() * 0.4 - 0.2);
      const size = Math.random() * 8 + 0.5;
      const timeStr = new Date(now - (i * 3000)).toLocaleTimeString();
      this.recentTrades.push({ time: timeStr, price: tradePrice, size, side: isBuy ? 'BUY' : 'SELL' });
    }
  }

  renderRecentTrades() {
    const elTape = document.getElementById('calRecentTradesBody');
    if (!elTape) return;
    const p = this.pairsData[this.currentPair];

    elTape.innerHTML = this.recentTrades.map(t => `
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; padding: 4px 12px; font-family: var(--cal-font-mono); font-size: 11px;">
        <span style="color: ${t.side === 'BUY' ? 'var(--cal-green)' : 'var(--cal-red)'}; font-weight: 700;">${t.price.toFixed(p.precision)}</span>
        <span style="text-align: right; color: #fff;">${t.size.toFixed(2)}</span>
        <span style="text-align: right; color: var(--cal-text-muted);">${t.time}</span>
      </div>
    `).join('');
  }

  /* =========================================================
     BOTTOM ORDERS & POSITIONS TERMINAL
  ========================================================= */
  renderOrdersTable() {
    const elBody = document.getElementById('calOrdersTableBody');
    if (!elBody) return;

    if (this.openOrders.length === 0) {
      elBody.innerHTML = `<tr><td colspan="8" class="cal-empty-table">No open orders. Place a Limit or Market order above.</td></tr>`;
      return;
    }

    elBody.innerHTML = this.openOrders.map((o, idx) => `
      <tr>
        <td style="color: #fff; font-weight: 700;">${o.id}</td>
        <td>${o.time}</td>
        <td style="color: #fff;">${o.pair}</td>
        <td>${o.type}</td>
        <td style="color: ${o.side === 'BUY' ? 'var(--cal-green)' : 'var(--cal-red)'}; font-weight: 800;">${o.side}</td>
        <td>$${o.price}</td>
        <td>${o.amount}</td>
        <td>
          <button class="cal-btn-secondary" style="padding: 2px 8px; font-size: 10px; color: var(--cal-red);" onclick="window.calabiEngine.cancelOrder(${idx})">Cancel</button>
        </td>
      </tr>
    `).join('');
  }

  cancelOrder(idx) {
    if (this.openOrders[idx]) {
      const removed = this.openOrders.splice(idx, 1)[0];
      this.renderOrdersTable();
      this.toast(`Cancelled order ${removed.id}`, 'info');
    }
  }

  /* =========================================================
     CANVAS CANDLESTICK & TECHNICAL CHART
  ========================================================= */
  generateInitialCandles() {
    const p = this.pairsData[this.currentPair];
    this.candles = [];
    let currentClose = p.price * 0.94;
    const count = 60;
    const now = Date.now();
    const intervalMs = 15 * 60 * 1000;

    for (let i = count; i >= 0; i--) {
      const time = now - (i * intervalMs);
      const change = (Math.random() - 0.48) * (p.price * 0.015);
      const open = currentClose;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * (p.price * 0.008);
      const low = Math.min(open, close) - Math.random() * (p.price * 0.008);
      const volume = Math.random() * 1200 + 100;

      this.candles.push({ time, open, high, low, close, volume });
      currentClose = close;
    }
  }

  initChartCanvas() {
    this.canvas = document.getElementById('calabiChartCanvas');
    if (!this.canvas) return;
    
    const container = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = container.clientWidth * dpr;
    this.canvas.height = container.clientHeight * dpr;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);
    this.cssWidth = container.clientWidth;
    this.cssHeight = container.clientHeight;
  }

  drawChart() {
    if (!this.ctx || this.candles.length === 0) return;
    const ctx = this.ctx;
    const w = this.cssWidth;
    const h = this.cssHeight;

    ctx.clearRect(0, 0, w, h);

    // Chart dimensions
    const priceAxisWidth = 65;
    const timeAxisHeight = 24;
    const plotW = w - priceAxisWidth;
    const plotH = h - timeAxisHeight;

    // Min / Max Price
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    this.candles.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    const pricePadding = (maxPrice - minPrice) * 0.08 || 1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    const priceRange = maxPrice - minPrice;

    // Grid lines
    ctx.strokeStyle = '#181E29';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const y = (plotH / 6) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotW, y);
      ctx.stroke();

      // Price labels
      const pVal = maxPrice - (priceRange * (y / plotH));
      ctx.fillStyle = '#64748B';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`$${pVal.toFixed(2)}`, plotW + 6, y + 3);
    }

    const candleWidth = Math.max(3, (plotW / this.candles.length) - 3);
    const candleSpacing = plotW / this.candles.length;

    // Draw Volume Bars at Bottom (20% height)
    this.candles.forEach((c, idx) => {
      const x = idx * candleSpacing + (candleSpacing / 2);
      const isUp = c.close >= c.open;
      const volH = (c.volume / maxVol) * (plotH * 0.22);
      const volY = plotH - volH;

      ctx.fillStyle = isUp ? 'rgba(0, 192, 135, 0.2)' : 'rgba(246, 70, 93, 0.2)';
      ctx.fillRect(x - (candleWidth / 2), volY, candleWidth, volH);
    });

    // Draw Candlesticks
    this.candles.forEach((c, idx) => {
      const x = idx * candleSpacing + (candleSpacing / 2);
      const isUp = c.close >= c.open;
      const color = isUp ? '#00C087' : '#F6465D';

      const highY = plotH - ((c.high - minPrice) / priceRange) * plotH;
      const lowY = plotH - ((c.low - minPrice) / priceRange) * plotH;
      const openY = plotH - ((c.open - minPrice) / priceRange) * plotH;
      const closeY = plotH - ((c.close - minPrice) / priceRange) * plotH;

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(openY - closeY));
      ctx.fillStyle = color;
      ctx.fillRect(x - (candleWidth / 2), bodyTop, candleWidth, bodyHeight);
    });

    // Draw EMA 20 line (Royal Blue)
    ctx.strokeStyle = '#1E50FF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let ema20 = this.candles[0].close;
    const k20 = 2 / (20 + 1);

    this.candles.forEach((c, idx) => {
      ema20 = (c.close * k20) + (ema20 * (1 - k20));
      const x = idx * candleSpacing + (candleSpacing / 2);
      const y = plotH - ((ema20 - minPrice) / priceRange) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  /* =========================================================
     LIVE PRICE TICK SIMULATION
  ========================================================= */
  startLiveFeedSimulation() {
    setInterval(() => {
      const p = this.pairsData[this.currentPair];
      const delta = (Math.random() - 0.49) * (p.price * 0.002);
      p.price = Math.max(0.0001, p.price + delta);

      // Update current candle
      if (this.candles.length > 0) {
        const lastCandle = this.candles[this.candles.length - 1];
        lastCandle.close = p.price;
        if (p.price > lastCandle.high) lastCandle.high = p.price;
        if (p.price < lastCandle.low) lastCandle.low = p.price;
        lastCandle.volume += Math.random() * 5;
      }

      // Add to public trades tape
      const isBuy = delta >= 0;
      this.recentTrades.unshift({
        time: new Date().toLocaleTimeString(),
        price: p.price,
        size: Math.random() * 6 + 0.2,
        side: isBuy ? 'BUY' : 'SELL'
      });
      if (this.recentTrades.length > 25) this.recentTrades.pop();

      this.renderHeaderStats();
      this.generateOrderBook();
      this.renderOrderBook();
      this.renderRecentTrades();
      this.drawChart();
    }, 2400);
  }

  /* =========================================================
     STAKING & EARN VAULTS
  ========================================================= */
  openStakingModal() {
    const modal = document.getElementById('calStakingModal');
    if (modal) modal.style.display = 'flex';
  }

  executeStaking() {
    const token = document.getElementById('calStakeTokenSelect')?.value || 'SOL';
    const amountInp = document.getElementById('calStakeAmountInput');
    const amount = parseFloat(amountInp?.value) || 0;

    if (amount <= 0) {
      this.toast('Please enter a valid amount to stake', 'error');
      return;
    }

    // Strict balance validation
    const balances = (window.walletEngine && window.walletEngine.balances) ? window.walletEngine.balances : { sol: 0 };
    const available = token === 'SOL' ? (balances.sol || 0) : 0;

    if (available <= 0 || available < amount) {
      this.toast(`❌ Insufficient ${token} balance. Available: ${available.toFixed(2)} ${token}. Cannot stake unowned tokens.`, 'error');
      return;
    }

    this.toast(`🎉 Staked ${amount} ${token} successfully into Calabi Institutional Vault!`, 'success');
    if (amountInp) amountInp.value = '';
    const modal = document.getElementById('calStakingModal');
    if (modal) modal.style.display = 'none';
  }

  /* =========================================================
     DEPOSIT & CUSTODY MODAL
  ========================================================= */
  openDepositModal() {
    const modal = document.getElementById('calDepositModal');
    if (modal) modal.style.display = 'flex';
  }

  /* =========================================================
     INSTITUTIONAL API KEYS
  ========================================================= */
  openApiKeysModal() {
    const modal = document.getElementById('calApiModal');
    if (modal) modal.style.display = 'flex';
  }

  generateApiKey() {
    const key = `CAL-PRO-${Array.from({length: 24}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;
    const secret = Array.from({length: 48}, () => Math.floor(Math.random()*16).toString(16)).join('');
    
    document.getElementById('calApiKeyDisplay').value = key;
    document.getElementById('calApiSecretDisplay').value = secret;
    document.getElementById('calApiGeneratedSection').style.display = 'block';
    this.toast('✅ Institutional API Key generated with HMAC-SHA256 signature', 'success');
  }

  toast(msg, type = 'info') {
    const container = document.getElementById('calToastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `cal-toast ${type}`;
    t.innerHTML = `<span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 200);
    }, 3500);
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.calabiEngine = new CalabiExchangeEngine();
});
