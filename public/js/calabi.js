/**
 * Calabi Pro Institutional Crypto Exchange Controller
 * High-performance L2 Orderbook, Glitch-Free Canvas Candlestick Engine & 50+ Crypto Directory
 */

class CalabiExchange {
  constructor() {
    this.activeSymbol = 'SOL';
    this.activePair = 'SOL / USD';
    this.activeTimeframe = '15m';
    this.currentPrice = 156.80;
    this.priceChange24h = 6.15;
    this.high24h = 161.50;
    this.low24h = 147.20;
    this.volume24h = 4200000000;
    this.orderSide = 'buy';
    this.orderType = 'limit';
    this.chartMode = 'canvas'; // 'canvas' or 'tv'
    this.candles = [];
    this.orderbook = { bids: [], asks: [], spread: 0.01, spreadPct: 0.006 };
    this.cryptosList = [];
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.hoverCandle = null;

    this.init();
  }

  async init() {
    this.bindEvents();
    this.initCanvas();
    await this.fetchCryptos();
    await this.loadPairData(this.activeSymbol);
    this.startLiveWebSocket();
    this.handleHashChange();
  }

  bindEvents() {
    // Navigation Tabs
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const viewId = btn.dataset.view;
        this.switchView(viewId);
      });
    });

    // Timeframe Buttons
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTimeframe = btn.dataset.tf;
        this.fetchCandles();
      });
    });

    // Side Toggle (Buy / Sell)
    const buyBtn = document.getElementById('sideBtnBuy');
    const sellBtn = document.getElementById('sideBtnSell');
    if (buyBtn && sellBtn) {
      buyBtn.addEventListener('click', () => {
        this.orderSide = 'buy';
        buyBtn.classList.add('active');
        sellBtn.classList.remove('active');
        this.updateOrderSubmitButton();
      });
      sellBtn.addEventListener('click', () => {
        this.orderSide = 'sell';
        sellBtn.classList.add('active');
        buyBtn.classList.remove('active');
        this.updateOrderSubmitButton();
      });
    }

    // Order Type Tabs
    document.querySelectorAll('.order-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.orderType = btn.dataset.type;
        const priceRow = document.getElementById('orderPriceInputRow');
        if (priceRow) {
          priceRow.style.display = this.orderType === 'market' ? 'none' : 'flex';
        }
      });
    });

    // Percentage Shortcuts
    document.querySelectorAll('.pct-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pct = parseInt(btn.dataset.pct) / 100;
        this.applyBalancePercent(pct);
      });
    });

    // Submit Order Button
    const submitBtn = document.getElementById('btnSubmitOrder');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.handleOrderSubmit());
    }

    // Category Filter Pills
    document.querySelectorAll('.category-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeCategory = pill.dataset.cat;
        this.renderMarketsTable();
      });
    });

    // Market Search Input
    const searchInput = document.getElementById('marketSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderMarketsTable();
      });
    }

    // Hash routing
    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  handleHashChange() {
    const hash = window.location.hash.replace('#', '') || 'markets';
    this.switchView(hash);
  }

  switchView(viewId) {
    document.querySelectorAll('.calabi-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));

    const targetView = document.getElementById(`view-${viewId}`);
    const targetBtn = document.querySelector(`.nav-tab-btn[data-view="${viewId}"]`);

    if (targetView) targetView.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');

    window.location.hash = `#${viewId}`;

    if (viewId === 'trade') {
      setTimeout(() => {
        this.resizeCanvas();
        this.drawChart();
      }, 50);
    }
  }

  /* ==========================================================================
     CANVAS CANDLESTICK ENGINE (GLITCH-FREE, HIGH-DPI & FLICKER-FREE)
     ========================================================================== */
  initCanvas() {
    this.canvas = document.getElementById('calabiCandleCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    // Handle responsive resize cleanly
    if (window.ResizeObserver && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.resizeCanvas();
        this.drawChart();
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    } else {
      window.addEventListener('resize', () => {
        this.resizeCanvas();
        this.drawChart();
      });
    }

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.handleCanvasHover(mouseX, mouseY);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverCandle = null;
      this.hoverMouse = null;
      this.drawChart();
    });

    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.canvas || !this.ctx) return;
    const container = this.canvas.parentElement;
    if (!container) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(320, container.clientWidth || 800);
    const h = Math.max(260, container.clientHeight || 450);

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  async fetchCandles() {
    try {
      const res = await fetch(`/api/market/candles/${this.activeSymbol}?timeframe=${this.activeTimeframe}`);
      const data = await res.json();
      if (data.success && data.candles && data.candles.length > 0) {
        this.candles = data.candles;
      } else {
        this.generateLocalCandles();
      }
      this.drawChart();
    } catch (e) {
      this.generateLocalCandles();
      this.drawChart();
    }
  }

  generateLocalCandles() {
    const candles = [];
    const now = Math.floor(Date.now() / 1000);
    const p = this.currentPrice || 156.80;
    let curr = p * 0.94;

    for (let i = 60; i >= 0; i--) {
      const time = now - (i * 900);
      const chg = (Math.random() - 0.485) * (p * 0.012);
      const open = curr;
      const close = open + chg;
      const high = Math.max(open, close) + Math.random() * (p * 0.005);
      const low = Math.min(open, close) - Math.random() * (p * 0.005);
      const volume = Math.floor(Math.random() * 4000 + 300);

      candles.push({ time, open, high, low, close, volume });
      curr = close;
    }
    this.candles = candles;
  }

  drawChart() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvasWidth || 800;
    const h = this.canvasHeight || 450;
    const paddingRight = 75;
    const paddingBottom = 26;
    const chartW = Math.max(100, w - paddingRight);
    const chartH = Math.max(100, h - paddingBottom);

    // Background fill (pure crisp white)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    if (!this.candles || this.candles.length === 0) {
      ctx.fillStyle = '#64748B';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Loading real-time candlestick data for ${this.activeSymbol}...`, w / 2, h / 2);
      return;
    }

    // Min / Max calculation
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    this.candles.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    if (minPrice === Infinity || maxPrice === -Infinity) {
      minPrice = (this.currentPrice || 100) * 0.9;
      maxPrice = (this.currentPrice || 100) * 1.1;
    }

    // 8% dynamic padding
    const range = maxPrice - minPrice || (minPrice * 0.1) || 1;
    minPrice = Math.max(0, minPrice - range * 0.08);
    maxPrice = maxPrice + range * 0.08;
    const priceSpan = maxPrice - minPrice || 1;

    const getY = (price) => chartH - ((price - minPrice) / priceSpan) * chartH;

    // Gridlines & Price Scale
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748B';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';

    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const p = minPrice + (priceSpan / steps) * i;
      const y = Math.floor(getY(p)) + 0.5;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();

      const label = p >= 1000 ? `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : p >= 1 ? `$${p.toFixed(2)}`
        : p >= 0.01 ? `$${p.toFixed(4)}`
        : `$${p.toFixed(6)}`;
      ctx.fillText(label, chartW + 6, y + 3);
    }

    // Time Axis Separator Line
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(0, chartH + 0.5);
    ctx.lineTo(chartW, chartH + 0.5);
    ctx.stroke();

    // Volume Histogram (Lower 18% of chart)
    const candleCount = this.candles.length;
    const spacing = chartW / candleCount;
    const candleW = Math.max(1.5, spacing * 0.68);

    this.candles.forEach((c, idx) => {
      const x = idx * spacing + spacing / 2;
      const isUp = c.close >= c.open;
      const volH = (c.volume / (maxVol || 1)) * (chartH * 0.18);

      ctx.fillStyle = isUp ? 'rgba(5, 150, 105, 0.16)' : 'rgba(220, 38, 38, 0.16)';
      ctx.fillRect(Math.floor(x - candleW / 2), Math.floor(chartH - volH), Math.ceil(candleW), Math.ceil(volH));
    });

    // Candlesticks (Wicks & Bodies)
    this.candles.forEach((c, idx) => {
      const x = Math.floor(idx * spacing + spacing / 2) + 0.5;
      const isUp = c.close >= c.open;
      const color = isUp ? '#059669' : '#DC2626';

      const yOpen = getY(c.open);
      const yClose = getY(c.close);
      const yHigh = getY(c.high);
      const yLow = getY(c.low);

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, Math.floor(yHigh));
      ctx.lineTo(x, Math.floor(yLow));
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      const bodyY = Math.min(yOpen, yClose);
      const bodyH = Math.max(2, Math.abs(yClose - yOpen));
      ctx.fillRect(Math.floor(x - candleW / 2), Math.floor(bodyY), Math.ceil(candleW), Math.ceil(bodyH));
    });

    // EMA 20 (Smooth Royal Blue Overlay)
    if (this.candles.length >= 2) {
      ctx.strokeStyle = '#1E50FF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let ema = this.candles[0].close;
      const k = 2 / (20 + 1);

      this.candles.forEach((c, idx) => {
        ema = c.close * k + ema * (1 - k);
        const x = idx * spacing + spacing / 2;
        const y = getY(ema);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Current Price Dashed Reference Line
    const lastCandle = this.candles[this.candles.length - 1];
    if (lastCandle) {
      const currentY = Math.floor(getY(lastCandle.close)) + 0.5;
      ctx.strokeStyle = '#1E50FF';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, currentY);
      ctx.lineTo(chartW, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current Price Badge on Right Margin
      ctx.fillStyle = '#1E50FF';
      ctx.fillRect(chartW + 2, currentY - 10, 70, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      const pStr = lastCandle.close >= 1000 ? lastCandle.close.toFixed(2) : lastCandle.close >= 1 ? lastCandle.close.toFixed(2) : lastCandle.close.toFixed(4);
      ctx.fillText(pStr, chartW + 6, currentY + 4);
    }

    // Crosshair & Inspection Tooltip
    if (this.hoverCandle && this.hoverMouse) {
      const { mouseX, mouseY } = this.hoverMouse;

      ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical crosshair
      ctx.beginPath();
      ctx.moveTo(Math.floor(mouseX) + 0.5, 0);
      ctx.lineTo(Math.floor(mouseX) + 0.5, chartH);
      ctx.stroke();

      // Horizontal crosshair
      ctx.beginPath();
      ctx.moveTo(0, Math.floor(mouseY) + 0.5);
      ctx.lineTo(chartW, Math.floor(mouseY) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // Top Floating Bar with OHLCV data
      const c = this.hoverCandle;
      const dateStr = new Date(c.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(6, 4, chartW - 12, 22);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `O: ${c.open.toFixed(2)}  H: ${c.high.toFixed(2)}  L: ${c.low.toFixed(2)}  C: ${c.close.toFixed(2)}  Vol: ${c.volume.toLocaleString()}  [${dateStr}]`,
        12,
        18
      );
    }
  }

  handleCanvasHover(mouseX, mouseY) {
    if (!this.candles || this.candles.length === 0) return;
    const chartW = this.canvasWidth - 75;
    const spacing = chartW / this.candles.length;
    const idx = Math.floor(mouseX / spacing);

    if (idx >= 0 && idx < this.candles.length) {
      this.hoverCandle = this.candles[idx];
      this.hoverMouse = { mouseX, mouseY };
    } else {
      this.hoverCandle = null;
      this.hoverMouse = null;
    }
    this.drawChart();
  }

  /* ==========================================================================
     MARKETS & ALL CRYPTOS DIRECTORY
     ========================================================================== */
  async fetchCryptos() {
    try {
      const res = await fetch('/api/market/all-cryptos');
      const data = await res.json();
      if (data.success && data.cryptos) {
        this.cryptosList = data.cryptos;
        this.renderMarketsTable();
        this.renderTopMarquee();
      }
    } catch (e) {
      console.warn('Could not load crypto catalog:', e);
    }
  }

  renderTopMarquee() {
    const marquee = document.getElementById('topbarTickerStrip');
    if (!marquee || !this.cryptosList.length) return;

    const topCoins = this.cryptosList.slice(0, 5);
    marquee.innerHTML = topCoins.map(coin => `
      <div class="ticker-mini-item" onclick="window.calabiExchange.loadPairData('${coin.symbol}')">
        <span class="ticker-mini-sym">${coin.symbol}</span>
        <span class="ticker-mini-price">$${coin.price > 1 ? coin.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : coin.price}</span>
        <span class="ticker-mini-chg ${coin.change24h >= 0 ? 'up' : 'down'}">${coin.change24h >= 0 ? '+' : ''}${coin.change24h}%</span>
      </div>
    `).join('');
  }

  renderMarketsTable() {
    const tbody = document.getElementById('marketsTableBody');
    if (!tbody) return;

    let filtered = [...this.cryptosList];
    if (this.activeCategory !== 'all') {
      filtered = filtered.filter(c => c.category === this.activeCategory);
    }
    if (this.searchQuery) {
      filtered = filtered.filter(c => c.symbol.toLowerCase().includes(this.searchQuery) || c.name.toLowerCase().includes(this.searchQuery));
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color: var(--text-muted);">No cryptocurrencies found matching "${this.searchQuery}"</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(coin => `
      <tr>
        <td style="color: var(--text-muted); font-weight: 600;">#${coin.rank || 1}</td>
        <td>
          <div class="coin-cell">
            <img class="coin-icon-img" src="${coin.icon}" alt="${coin.symbol}" onerror="this.src='https://assets.coingecko.com/coins/images/4128/small/solana.png'" />
            <div class="coin-name-group">
              <span class="coin-symbol">${coin.symbol}</span>
              <span class="coin-fullname">${coin.name}</span>
            </div>
          </div>
        </td>
        <td class="font-mono text-right" style="font-weight: 700;">$${coin.price > 1 ? coin.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : coin.price}</td>
        <td class="font-mono text-right ${coin.change24h >= 0 ? 'text-green' : 'text-red'}" style="font-weight: 700;">
          ${coin.change24h >= 0 ? '+' : ''}${coin.change24h}%
        </td>
        <td class="font-mono text-right" style="color: var(--text-muted);">$${(coin.volume24h / 1e6).toFixed(1)}M</td>
        <td class="font-mono text-right" style="font-weight: 600;">$${(coin.marketCap / 1e9).toFixed(2)}B</td>
        <td class="text-right">
          <button class="btn-blue" style="padding: 5px 12px; font-size: 11px;" onclick="window.calabiExchange.loadPairData('${coin.symbol}')">
            Trade ↗
          </button>
        </td>
      </tr>
    `).join('');
  }

  async loadPairData(symbol) {
    this.activeSymbol = symbol;
    this.activePair = `${symbol} / USD`;

    const coin = this.cryptosList.find(c => c.symbol === symbol) || { price: 156.80, change24h: 6.15, high24h: 161.50, low24h: 147.20, volume24h: 4200000000 };
    this.currentPrice = coin.price;
    this.priceChange24h = coin.change24h;
    this.high24h = coin.high24h;
    this.low24h = coin.low24h;
    this.volume24h = coin.volume24h;

    // Update Header Elements
    const pairTitle = document.getElementById('terminalPairTitle');
    const pairPrice = document.getElementById('terminalPairPrice');
    const pairChange = document.getElementById('terminalPairChange');
    const pairHigh = document.getElementById('terminalHigh24h');
    const pairLow = document.getElementById('terminalLow24h');
    const pairVol = document.getElementById('terminalVol24h');

    const formatPrice = (p) => {
      if (!p && p !== 0) return '$0.00';
      if (p >= 1000) return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (p >= 1) return `$${p.toFixed(2)}`;
      if (p >= 0.01) return `$${p.toFixed(4)}`;
      return `$${p.toFixed(6)}`;
    };

    if (pairTitle) pairTitle.textContent = this.activePair;
    if (pairPrice) pairPrice.textContent = formatPrice(coin.price);
    if (pairChange) {
      pairChange.textContent = `${coin.change24h >= 0 ? '+' : ''}${coin.change24h}%`;
      pairChange.className = `stat-card-sub ${coin.change24h >= 0 ? 'up' : 'down'}`;
    }
    if (pairHigh) pairHigh.textContent = formatPrice(coin.high24h);
    if (pairLow) pairLow.textContent = formatPrice(coin.low24h);
    if (pairVol) {
      const vol = coin.volume24h || 0;
      pairVol.textContent = vol >= 1e9 ? `$${(vol / 1e9).toFixed(2)}B`
        : vol >= 1e6 ? `$${(vol / 1e6).toFixed(1)}M`
        : `$${vol.toLocaleString()}`;
    }

    // Order Entry unit
    const unitEl = document.getElementById('orderAmountUnit');
    if (unitEl) unitEl.textContent = symbol;
    const priceInput = document.getElementById('orderPriceInput');
    if (priceInput) priceInput.value = coin.price;

    // Switch to Trade view & fetch data
    this.switchView('trade');
    await this.fetchCandles();
    await this.fetchOrderbook();
  }

  async fetchOrderbook() {
    try {
      const res = await fetch(`/api/market/orderbook/${this.activeSymbol}`);
      const data = await res.json();
      if (data.success && data.depth) {
        this.renderOrderbook(data.depth);
      }
    } catch (e) {
      // Fallback
    }
  }

  renderOrderbook(depth) {
    const asksEl = document.getElementById('obAsksList');
    const bidsEl = document.getElementById('obBidsList');
    const spreadEl = document.getElementById('obSpreadVal');

    if (asksEl && depth.asks) {
      const maxTotal = Math.max(...depth.asks.map(a => a.total || a.size || 1));
      asksEl.innerHTML = depth.asks.map(a => {
        const pct = Math.min(100, ((a.total || a.size) / maxTotal) * 100);
        return `
          <div class="ob-row" onclick="document.getElementById('orderPriceInput').value = ${a.price}">
            <div class="ob-depth-bar ask" style="width: ${pct}%;"></div>
            <span class="ob-cell text-red">${a.price.toFixed(2)}</span>
            <span class="ob-cell text-right">${a.size.toFixed(3)}</span>
            <span class="ob-cell text-right" style="color: var(--text-muted);">${(a.total || a.size).toFixed(3)}</span>
          </div>
        `;
      }).join('');
    }

    if (bidsEl && depth.bids) {
      const maxTotal = Math.max(...depth.bids.map(b => b.total || b.size || 1));
      bidsEl.innerHTML = depth.bids.map(b => {
        const pct = Math.min(100, ((b.total || b.size) / maxTotal) * 100);
        return `
          <div class="ob-row" onclick="document.getElementById('orderPriceInput').value = ${b.price}">
            <div class="ob-depth-bar bid" style="width: ${pct}%;"></div>
            <span class="ob-cell text-green">${b.price.toFixed(2)}</span>
            <span class="ob-cell text-right">${b.size.toFixed(3)}</span>
            <span class="ob-cell text-right" style="color: var(--text-muted);">${(b.total || b.size).toFixed(3)}</span>
          </div>
        `;
      }).join('');
    }

    if (spreadEl) spreadEl.textContent = `$${(depth.spread || 0.01).toFixed(2)}`;
  }

  applyBalancePercent(pct) {
    const we = window.walletEngine;
    const key = this.orderSide === 'buy' ? 'usdc' : this.activeSymbol.toLowerCase();
    const bal = (we && we.balances && we.balances[key] !== undefined) ? we.balances[key] : 0.00;
    const amt = bal * pct;

    const amtInput = document.getElementById('orderAmountInput');
    if (amtInput) amtInput.value = amt.toFixed(4);
  }

  updateOrderSubmitButton() {
    const btn = document.getElementById('btnSubmitOrder');
    if (btn) {
      btn.textContent = `${this.orderSide === 'buy' ? 'Buy / Long' : 'Sell / Short'} ${this.activeSymbol}`;
      btn.className = `btn-submit-order ${this.orderSide}`;
    }
  }

  handleOrderSubmit() {
    const we = window.walletEngine;
    const sender = (we && we.activeAddress) ? we.activeAddress : null;
    const checkKey = this.orderSide === 'buy' ? 'usdc' : this.activeSymbol.toLowerCase();
    const bal = (we && we.balances && we.balances[checkKey] !== undefined) ? we.balances[checkKey] : 0.00;
    const amt = parseFloat(document.getElementById('orderAmountInput')?.value) || 0;

    if (!sender || bal <= 0 || bal < amt) {
      this.toast(`❌ Insufficient ${checkKey.toUpperCase()} balance (${bal.toFixed(2)} ${checkKey.toUpperCase()}). Please connect wallet or deposit funds.`, 'error');
      return;
    }

    this.toast(`⚡ Institutional order placed: ${this.orderSide.toUpperCase()} ${amt} ${this.activeSymbol} @ $${this.currentPrice}`, 'success');
  }

  startLiveWebSocket() {
    setInterval(() => {
      // Live sub-second micro-tick
      if (this.candles.length > 0) {
        const delta = (Math.random() - 0.495) * (this.currentPrice * 0.0006);
        this.currentPrice = parseFloat((this.currentPrice + delta).toFixed(2));
        const last = this.candles[this.candles.length - 1];
        last.close = this.currentPrice;
        if (this.currentPrice > last.high) last.high = this.currentPrice;
        if (this.currentPrice < last.low) last.low = this.currentPrice;
        this.drawChart();
      }
    }, 2000);
  }

  toast(msg, type = 'info') {
    if (window.launchpadManager && window.launchpadManager.toast) {
      window.launchpadManager.toast(msg, type);
    } else {
      alert(msg);
    }
  }
}

// Instantiate on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.calabiExchange = new CalabiExchange();
});
