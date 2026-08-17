/**
 * Cession Sovereign Exchange & Launchpad Manager
 * Elite Cyber Coder Theme Controller
 * 
 * Features:
 * 1. Meme Sprints (Fast velocity $25k bonding curves)
 * 2. Sovereign Stacks (Long-term community assets, ROSCA/Tanda micro-endowments)
 * 3. Public vs Private Circles with Invite Passcodes (e.g. fam_trust_2026)
 * 4. 1% Max Sell Anti-Dump Circuit Breaker Guards
 * 5. Diamond Vault Time-Lock Staking (30d / 90d / 365d at 14% - 36% APY)
 * 6. Embedded Live Market Terminal & True Price Oracle under coins
 * 7. Transparent Proof-of-Reserves in Footer
 */

class CalabiLaunchpadManager {
  constructor() {
    this.tokenGrid = document.getElementById('tokenGrid');
    this.stacksGrid = document.getElementById('stacksGrid');
    this.searchInput = document.getElementById('tokenSearchInput');
    this.filterButtons = document.querySelectorAll('.filter-btn');
    
    this.activeFilter = 'trending';
    this.activeChain = 'all';
    this.tokens = [];
    this.stacks = [];
    this.activeToken = null;
    this.activeSelectedSymbol = 'CESS';
    this.activeTimeframe = '15m';
    this.tradeMode = 'BUY'; // 'BUY' | 'SELL' | 'STAKE'
    this.currentView = 'launchpad';
    this.unlockedKeys = new Set();

    // View Tabs
    this.tabViewLaunchpad = document.getElementById('tabViewLaunchpad');
    this.tabViewStacks = document.getElementById('tabViewStacks');
    this.tabViewLeaderboard = document.getElementById('tabViewLeaderboard');

    this.sectionLaunchpad = document.getElementById('sectionLaunchpad');
    this.sectionStacks = document.getElementById('sectionStacks');
    this.sectionLeaderboard = document.getElementById('sectionLeaderboard');

    // Modals
    this.detailModal = document.getElementById('tokenDetailModal');
    this.deployModal = document.getElementById('deployTokenModal');
    this.profileModal = document.getElementById('profileModal');

    // Detail Modal Elements
    this.btnCloseDetail = document.getElementById('btnCloseDetailModal');
    this.detailTabBuy = document.getElementById('detailTabBuy');
    this.detailTabSell = document.getElementById('detailTabSell');
    this.detailTabStake = document.getElementById('detailTabStake');
    this.detailSwapAmount = document.getElementById('detailSwapAmount');
    this.btnExecuteSwap = document.getElementById('btnExecuteDetailSwap');
    this.btnExecuteStake = document.getElementById('btnExecuteDetailStake');
    this.trollboxInput = document.getElementById('trollboxInput');
    this.btnSendTrollbox = document.getElementById('btnSendTrollbox');
    this.btnCopyInvite = document.getElementById('btnCopyInviteLink');

    this.init();
  }

  init() {
    this.checkUrlKeyParam();
    this.fetchTokens();
    this.fetchStacks();
    this.fetchKing();
    this.fetchLeaderboard();
    this.fetchTreasuryReserves();
    this.bindEvents();
    this.handleInitialRoute();

    // Auto-load initial live market feed
    setTimeout(() => {
      this.loadEmbeddedMarketData(this.activeSelectedSymbol, this.activeTimeframe);
    }, 400);
  }

  checkUrlKeyParam() {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key') || params.get('invite');
    if (key) {
      this.unlockedKeys.add(key);
    }
  }

  handleInitialRoute() {
    const path = window.location.pathname.toLowerCase();
    if (path === '/stacks' || path === '/endowments') {
      this.switchMainView('stacks', false);
    } else if (path === '/leaderboard' || path === '/rankings') {
      this.switchMainView('leaderboard', false);
    } else if (path.startsWith('/coin/') || path.startsWith('/token/')) {
      const parts = path.split('/');
      const sym = parts[2];
      if (sym) {
        this.openTokenDetail(sym.toUpperCase(), false);
      }
    }

    window.addEventListener('popstate', () => {
      const curPath = window.location.pathname.toLowerCase();
      if (curPath === '/' || curPath === '/launchpad') {
        this.switchMainView('launchpad', false);
        if (this.detailModal) this.detailModal.classList.remove('active');
      } else if (curPath === '/stacks') {
        this.switchMainView('stacks', false);
      } else if (curPath === '/leaderboard') {
        this.switchMainView('leaderboard', false);
      } else if (curPath.startsWith('/coin/')) {
        const s = curPath.split('/')[2];
        if (s) this.openTokenDetail(s.toUpperCase(), false);
      }
    });
  }

  bindEvents() {
    // Navigation view tabs
    if (this.tabViewLaunchpad) this.tabViewLaunchpad.addEventListener('click', () => this.switchMainView('launchpad'));
    if (this.tabViewStacks) this.tabViewStacks.addEventListener('click', () => this.switchMainView('stacks'));
    if (this.tabViewLeaderboard) this.tabViewLeaderboard.addEventListener('click', () => this.switchMainView('leaderboard'));

    // Search filter
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => {
        this.renderTokenGrid();
        this.renderStacksGrid();
      });
    }

    // Filter Buttons
    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.getAttribute('data-filter');
        this.fetchTokens();
      });
    });

    // Deploy Modal Handlers
    const btnOpenDeploy = document.getElementById('btnOpenDeployModal');
    const btnCloseDeploy = document.getElementById('btnCloseDeployModal');
    const deployForm = document.getElementById('deployTokenForm');
    if (btnOpenDeploy) btnOpenDeploy.addEventListener('click', () => this.openDeployModal());
    if (btnCloseDeploy) btnCloseDeploy.addEventListener('click', () => this.closeDeployModal());
    if (deployForm) deployForm.addEventListener('submit', (e) => this.handleDeploySubmit(e));

    // Asset mode radio toggle
    const privacyRadios = document.querySelectorAll('input[name="privacySelect"]');
    const privateGroup = document.getElementById('privateCodeGroup');
    privacyRadios.forEach(r => {
      r.addEventListener('change', () => {
        if (privateGroup) {
          privateGroup.style.display = r.value === 'private' ? 'block' : 'none';
        }
      });
    });

    // Profile Modal Handlers
    const btnProfile = document.getElementById('btnOpenProfileModal');
    const btnCloseProfile = document.getElementById('btnCloseProfileModal');
    if (btnProfile) btnProfile.addEventListener('click', () => this.openProfileModal());
    if (btnCloseProfile) btnCloseProfile.addEventListener('click', () => this.closeProfileModal());

    // Detail Modal Handlers
    if (this.btnCloseDetail) this.btnCloseDetail.addEventListener('click', () => this.closeDetailModal());
    if (this.detailTabBuy) this.detailTabBuy.addEventListener('click', () => this.setTradeMode('BUY'));
    if (this.detailTabSell) this.detailTabSell.addEventListener('click', () => this.setTradeMode('SELL'));
    if (this.detailTabStake) this.detailTabStake.addEventListener('click', () => this.setTradeMode('STAKE'));

    // Quick Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = parseFloat(btn.getAttribute('data-amt'));
        if (this.detailSwapAmount) {
          this.detailSwapAmount.value = amt;
          this.updateSwapEstimate();
        }
      });
    });

    if (this.detailSwapAmount) {
      this.detailSwapAmount.addEventListener('input', () => this.updateSwapEstimate());
    }

    if (this.btnExecuteSwap) {
      this.btnExecuteSwap.addEventListener('click', () => this.executeSwap());
    }

    if (this.btnExecuteStake) {
      this.btnExecuteStake.addEventListener('click', () => this.executeStake());
    }

    // Trollbox
    if (this.btnSendTrollbox && this.trollboxInput) {
      this.btnSendTrollbox.addEventListener('click', () => this.sendTrollboxMessage());
      this.trollboxInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendTrollboxMessage();
      });
    }

    // Copy Invite Link
    if (this.btnCopyInvite) {
      this.btnCopyInvite.addEventListener('click', () => this.copyInviteLink());
    }

    // Embedded Market Timeframe Switchers
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTimeframe = btn.getAttribute('data-tf');
        this.loadEmbeddedMarketData(this.activeSelectedSymbol, this.activeTimeframe);
      });
    });
  }

  switchMainView(viewName, pushUrl = true) {
    this.currentView = viewName;
    const views = [
      { name: 'launchpad', tab: this.tabViewLaunchpad, sec: this.sectionLaunchpad, path: '/' },
      { name: 'stacks', tab: this.tabViewStacks, sec: this.sectionStacks, path: '/stacks' },
      { name: 'leaderboard', tab: this.tabViewLeaderboard, sec: this.sectionLeaderboard, path: '/leaderboard' }
    ];

    views.forEach(v => {
      if (v.tab) v.tab.classList.toggle('active', v.name === viewName);
      if (v.sec) v.sec.style.display = v.name === viewName ? 'block' : 'none';
      if (pushUrl && v.name === viewName && window.location.pathname !== v.path) {
        history.pushState(null, '', v.path);
      }
    });

    if (viewName === 'stacks') {
      this.fetchStacks();
    } else if (viewName === 'leaderboard') {
      this.fetchLeaderboard();
    }
  }

  /* Audio Synthesizer */
  playAudioSfx(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'buy') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'sell') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'stake') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {}
  }

  /* =========================================================
     FETCH TOKENS & SOVEREIGN STACKS
  ========================================================= */
  async fetchTokens() {
    try {
      const keyParam = Array.from(this.unlockedKeys).join(',');
      const res = await fetch(`/api/tokens?type=sprint&sort=${this.activeFilter}&chain=${this.activeChain}&key=${keyParam}`);
      const data = await res.json();
      if (data.success) {
        this.tokens = data.tokens;
        this.renderTokenGrid();
      }
    } catch (err) {
      console.warn('Tokens fetch error:', err);
    }
  }

  async fetchStacks() {
    try {
      const res = await fetch('/api/tokens/stacks');
      const data = await res.json();
      if (data.success) {
        this.stacks = data.stacks;
        this.renderStacksGrid();
      }
    } catch (err) {
      console.warn('Stacks fetch error:', err);
    }
  }

  async unlockPrivateCircle() {
    const input = document.getElementById('privateCircleUnlockInput');
    if (!input || !input.value.trim()) {
      this.toast('Please enter a private passcode.', 'error');
      return;
    }
    const passcode = input.value.trim();
    this.unlockedKeys.add(passcode);
    this.toast(`🔑 Unlocking Private Circle for key: "${passcode}"...`, 'info');
    
    await this.fetchTokens();
    await this.fetchStacks();
    this.toast(`✓ Access Granted to private circles matching "${passcode}"!`, 'success');
  }

  renderTokenGrid() {
    if (!this.tokenGrid) return;
    const query = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';
    const filtered = this.tokens.filter(t => {
      return t.name.toLowerCase().includes(query) ||
             t.symbol.toLowerCase().includes(query) ||
             t.creator.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      this.tokenGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="font-size: 28px; margin-bottom: 8px;">⚡</div>
          <h3 style="font-size: 15px; color: #fff; font-family: var(--font-mono);">No active Meme Sprints found</h3>
          <p style="color: var(--text-secondary); font-size: 12px; margin-bottom: 14px;">Deploy a zero-fee bonding curve sprint on Base or Solana.</p>
          <button class="btn btn-launch" onclick="window.launchpadManager.openDeployModal('sprint')">+ Launch Meme Sprint</button>
        </div>
      `;
      return;
    }

    this.tokenGrid.innerHTML = filtered.map(t => this.createTokenCardHtml(t)).join('');
  }

  renderStacksGrid() {
    if (!this.stacksGrid) return;
    const query = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';
    const filtered = this.stacks.filter(t => {
      return t.name.toLowerCase().includes(query) ||
             t.symbol.toLowerCase().includes(query) ||
             t.creator.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      this.stacksGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="font-size: 28px; margin-bottom: 8px;">🏛️</div>
          <h3 style="font-size: 15px; color: #fff; font-family: var(--font-mono);">No Sovereign Stacks found</h3>
          <p style="color: var(--text-secondary); font-size: 12px; margin-bottom: 14px;">Create a long-term community micro-endowment or family pool.</p>
          <button class="btn btn-launch" onclick="window.launchpadManager.openDeployModal('stack')">+ Create Sovereign Stack</button>
        </div>
      `;
      return;
    }

    this.stacksGrid.innerHTML = filtered.map(t => this.createTokenCardHtml(t)).join('');
  }

  createTokenCardHtml(t) {
    const isStack = t.tokenType === 'stack';
    const isPrivate = t.isPrivate;
    const badgeType = isStack 
      ? `<span class="badge-tag stack">🏛️ STACK</span>` 
      : `<span class="badge-tag" style="background: var(--cyber-blue-subtle); color: var(--cyber-blue); border: 1px solid var(--border-blue);">⚡ SPRINT</span>`;
    
    const privacyBadge = isPrivate 
      ? `<span class="badge-tag private">🔒 PRIVATE CIRCLE</span>`
      : '';

    const antiDumpBadge = t.antiDumpEnabled
      ? `<span class="badge-tag" style="background: var(--cyber-red-subtle); color: var(--cyber-red); border: 1px solid var(--border-red);">🛡️ 1% ANTI-DUMP</span>`
      : '';

    return `
      <div class="token-card ${isStack ? 'stack-card' : ''}" onclick="window.launchpadManager.selectCoinForLiveMarket('${t.symbol}')">
        <div class="token-card-top">
          <img src="${t.imageUrl || 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=200'}" class="token-avatar" alt="${t.name}">
          <div class="token-meta">
            <div class="token-name-row">
              <span class="token-name">${t.name}</span>
              <span class="token-symbol">$${t.symbol}</span>
            </div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
              ${badgeType}
              ${privacyBadge}
              ${antiDumpBadge}
              <span class="chain-badge-sm">${t.chain === 'Solana' ? '⚡ SOL' : '🔵 BASE'}</span>
            </div>
          </div>
        </div>

        <p class="token-desc-snippet">${t.description}</p>

        <div class="token-card-stats">
          <div class="card-stat-item">
            <span class="stat-label">MARKET CAP</span>
            <span class="stat-val highlight">$${Math.floor(t.marketCapUsd).toLocaleString()}</span>
          </div>
          <div class="card-stat-item">
            <span class="stat-label">${isStack ? 'DIAMOND APY' : 'GRADUATION'}</span>
            <span class="stat-val ${isStack ? 'cyan' : 'up'}">${isStack ? '28.5% APY' : t.bondingCurveProgressPercent + '%'}</span>
          </div>
          <div class="card-stat-item">
            <span class="stat-label">DEV LOCK</span>
            <span class="stat-val safe">${t.devLockedPercent}%</span>
          </div>
        </div>

        <div class="curve-bar-container">
          <div class="curve-bar-label">
            <span>${isStack ? 'COMMUNITY VAULT PROGRESS' : 'DEX GRADUATION TARGET ($' + (t.targetCapUsd || 25000).toLocaleString() + ')'}</span>
            <span>${t.bondingCurveProgressPercent}%</span>
          </div>
          <div class="curve-bar-track">
            <div class="curve-bar-fill" style="width: ${Math.min(100, t.bondingCurveProgressPercent)}%;"></div>
          </div>
        </div>
      </div>
    `;
  }

  /* =========================================================
     EMBEDDED LIVE MARKET TERMINAL & TRUE PRICE (UNDER ALL COINS)
  ========================================================= */
  selectCoinForLiveMarket(symbol) {
    this.activeSelectedSymbol = symbol;
    this.loadEmbeddedMarketData(symbol, this.activeTimeframe);
    
    // Scroll smoothly to market section
    const sec = document.getElementById('embeddedMarketSection');
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async loadEmbeddedMarketData(symbol, timeframe = '15m') {
    try {
      const res = await fetch(`/api/market/token-data/${symbol}?timeframe=${timeframe}`);
      const data = await res.json();
      if (!data.success) return;

      const meta = data.tokenMeta;
      const truePrice = data.truePrice;

      // Update Header Elements
      const img = document.getElementById('embedCoinImg');
      const name = document.getElementById('embedCoinName');
      const sym = document.getElementById('embedCoinSymbol');
      const tag = document.getElementById('embedCoinTypeTag');
      const sub = document.getElementById('embedCoinSub');
      const priceVal = document.getElementById('embedTruePrice');
      const chg = document.getElementById('embedPriceChg');
      const vol = document.getElementById('embedVol24h');
      const high = document.getElementById('embedHigh24h');
      const low = document.getElementById('embedLow24h');

      if (img) img.src = meta.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200';
      if (name) name.textContent = meta.name;
      if (sym) sym.textContent = `$${meta.symbol}`;
      if (tag) {
        tag.textContent = meta.tokenType === 'stack' ? '🏛️ SOVEREIGN STACK' : '⚡ MEME SPRINT';
        tag.className = meta.tokenType === 'stack' ? 'badge-tag stack' : 'badge-tag safe';
      }
      if (sub) sub.textContent = `${meta.chain} Network • Invariant AMM + Multi-Feed Oracle [Confidence: ${(truePrice.confidence * 100).toFixed(1)}%]`;
      
      if (priceVal) priceVal.textContent = `$${truePrice.priceUsd < 0.01 ? truePrice.priceUsd.toFixed(8) : truePrice.priceUsd.toFixed(4)}`;
      if (chg) {
        const c = meta.change24h || 5.4;
        chg.textContent = `${c >= 0 ? '+' : ''}${c.toFixed(1)}%`;
        chg.style.color = c >= 0 ? 'var(--market-green)' : 'var(--cyber-red)';
      }
      if (vol) vol.textContent = `$${Math.floor(meta.volume24hUsd || 24500).toLocaleString()}`;
      if (high) high.textContent = `$${(truePrice.priceUsd * 1.12).toFixed(6)}`;
      if (low) low.textContent = `$${(truePrice.priceUsd * 0.91).toFixed(6)}`;

      // Render Candlestick Chart on Canvas
      this.drawCandlesticks(data.candles || []);

      // Render L2 Orderbook Depth
      this.renderOrderbookDepth(data.orderbook || { bids: [], asks: [] });
    } catch (e) {
      console.warn('Market data load error:', e);
    }
  }

  drawCandlesticks(candles) {
    const canvas = document.getElementById('embedMarketCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set internal resolution
    canvas.width = canvas.parentElement.clientWidth || 600;
    canvas.height = canvas.parentElement.clientHeight || 340;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Background Grid
    ctx.strokeStyle = '#0a101f';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    if (!candles || candles.length === 0) return;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    candles.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });

    const priceRange = (maxPrice - minPrice) || (minPrice * 0.1) || 1;
    const padTop = 30;
    const padBottom = 30;
    const chartHeight = H - padTop - padBottom;
    const candleWidth = Math.max(4, (W / candles.length) * 0.65);
    const step = W / candles.length;

    candles.forEach((c, i) => {
      const x = i * step + step / 2;
      const openY = H - padBottom - ((c.open - minPrice) / priceRange) * chartHeight;
      const closeY = H - padBottom - ((c.close - minPrice) / priceRange) * chartHeight;
      const highY = H - padBottom - ((c.high - minPrice) / priceRange) * chartHeight;
      const lowY = H - padBottom - ((c.low - minPrice) / priceRange) * chartHeight;

      const isUp = c.close >= c.open;
      const color = isUp ? '#00ffaa' : '#ff0055';

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      const top = Math.min(openY, closeY);
      const height = Math.max(2, Math.abs(openY - closeY));
      ctx.fillRect(x - candleWidth / 2, top, candleWidth, height);
    });
  }

  renderOrderbookDepth(ob) {
    const asksTbody = document.getElementById('embedOrderbookAsks');
    const bidsTbody = document.getElementById('embedOrderbookBids');

    if (asksTbody && ob.asks) {
      asksTbody.innerHTML = ob.asks.slice(-4).reverse().map(a => `
        <tr>
          <td>$${a.price.toFixed(6)}</td>
          <td>${Math.floor(a.size).toLocaleString()}</td>
          <td>$${a.total.toFixed(2)}</td>
        </tr>
      `).join('');
    }

    if (bidsTbody && ob.bids) {
      bidsTbody.innerHTML = ob.bids.slice(0, 4).map(b => `
        <tr>
          <td>$${b.price.toFixed(6)}</td>
          <td>${Math.floor(b.size).toLocaleString()}</td>
          <td>$${b.total.toFixed(2)}</td>
        </tr>
      `).join('');
    }
  }

  async executeQuickBuy() {
    if (!window.walletEngine || !window.walletEngine.isAuthenticated) {
      this.toast('Please Sign In or Connect Wallet first.', 'warning');
      if (window.walletEngine) window.walletEngine.openAuthModal();
      return;
    }

    const input = document.getElementById('quickSwapSolInput');
    const amt = parseFloat(input?.value || 0.1);
    if (!amt || amt <= 0) {
      this.toast('Please enter a valid amount.', 'error');
      return;
    }

    const symbol = this.activeSelectedSymbol || 'CESS';
    const userAddr = window.walletEngine.activeAddress;

    try {
      const res = await fetch(`/api/tokens/${symbol}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solAmount: amt, buyerAddress: userAddr })
      });
      const data = await res.json();
      if (data.success) {
        this.playAudioSfx('buy');
        this.toast(data.message, 'success');
        this.loadEmbeddedMarketData(symbol, this.activeTimeframe);
        this.fetchTokens();
        this.fetchStacks();
      } else {
        this.toast(data.error || 'Swap failed', 'error');
      }
    } catch (e) {
      this.toast('Error executing swap.', 'error');
    }
  }

  /* =========================================================
     KING OF THE HILL HERO
  ========================================================= */
  async fetchKing() {
    try {
      const res = await fetch('/api/tokens/king');
      const data = await res.json();
      if (data.success && data.king) {
        this.renderKing(data.king);
      }
    } catch (err) {
      console.warn('King fetch error:', err);
    }
  }

  renderKing(king) {
    const kingName = document.getElementById('kingName');
    const kingDesc = document.getElementById('kingDesc');
    const kingImg = document.getElementById('kingImg');
    const kingMcap = document.getElementById('kingMcap');
    const kingProgress = document.getElementById('kingProgress');
    const kingProgressBar = document.getElementById('kingProgressBar');
    const kingFeePool = document.getElementById('kingFeePool');
    const kingChain = document.getElementById('kingChain');

    if (kingName) kingName.innerHTML = `${king.name} (<span id="kingSymbol" style="color: var(--cyber-blue);">$${king.symbol}</span>)`;
    if (kingDesc) kingDesc.textContent = king.description;
    if (kingImg) kingImg.src = king.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200';
    if (kingMcap) kingMcap.textContent = `$${Math.floor(king.marketCapUsd).toLocaleString()}`;
    if (kingProgress) kingProgress.textContent = `${king.bondingCurveProgressPercent}% ($${(king.targetCapUsd || 25000).toLocaleString()} Target)`;
    if (kingProgressBar) kingProgressBar.style.width = `${Math.min(100, king.bondingCurveProgressPercent)}%`;
    if (kingFeePool) kingFeePool.textContent = `$${king.totalFeePoolDistributedUsd.toFixed(2)}`;
    if (kingChain) kingChain.textContent = king.chain === 'Solana' ? '⚡ Solana' : '🔵 Base L2';

    const btnKing = document.getElementById('btnKingQuickBuy');
    if (btnKing) {
      btnKing.textContent = `⚡ Trade $${king.symbol}`;
      btnKing.onclick = () => this.openTokenDetail(king.symbol);
    }
  }

  /* =========================================================
     DETAIL MODAL & TERMINAL TRADING
  ========================================================= */
  async openTokenDetail(symbol, pushUrl = true) {
    try {
      this.activeSelectedSymbol = symbol;
      this.loadEmbeddedMarketData(symbol, this.activeTimeframe);

      const keyParam = Array.from(this.unlockedKeys).join(',');
      const res = await fetch(`/api/tokens/${symbol}?key=${keyParam}`);
      const data = await res.json();
      if (!data.success) {
        this.toast('Unable to load token details: ' + (data.error || 'Private token without key'), 'error');
        return;
      }

      this.activeToken = data.token;
      this.renderDetailModal(data.token, data.trades || []);
      if (this.detailModal) this.detailModal.classList.add('active');

      if (pushUrl && window.location.pathname !== `/coin/${symbol}`) {
        history.pushState(null, '', `/coin/${symbol}`);
      }

      if (window.chartController) {
        window.chartController.loadCandles(data.token.symbol);
      }

      this.loadTrollbox(data.token.symbol);
    } catch (err) {
      console.warn('Detail open error:', err);
    }
  }

  closeDetailModal() {
    if (this.detailModal) this.detailModal.classList.remove('active');
    this.activeToken = null;
    if (window.location.pathname.startsWith('/coin/')) {
      history.pushState(null, '', '/');
    }
  }

  renderDetailModal(token, trades) {
    const img = document.getElementById('detailTokenImg');
    const imgBig = document.getElementById('detailTokenImgBig');
    const name = document.getElementById('detailTokenName');
    const symbol = document.getElementById('detailTokenSymbol');
    const chain = document.getElementById('detailTokenChain');
    const desc = document.getElementById('detailTokenDesc');
    const price = document.getElementById('detailTokenPrice');
    const mcap = document.getElementById('detailTokenMcap');
    const gradCap = document.getElementById('detailGradCap');
    const fees = document.getElementById('detailTokenFees');
    const curveBar = document.getElementById('detailCurveBar');
    const curvePct = document.getElementById('detailCurvePercent');
    const typeBadge = document.getElementById('detailTypeBadge');
    const antiDumpBadge = document.getElementById('detailAntiDumpBadge');
    const privateBanner = document.getElementById('detailPrivateBanner');
    const antiDumpNotice = document.getElementById('antiDumpNotice');

    const avatar = token.imageUrl || 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=200';
    if (img) img.src = avatar;
    if (imgBig) imgBig.src = avatar;
    if (name) name.textContent = token.name;
    if (symbol) symbol.textContent = `$${token.symbol}`;
    if (chain) chain.textContent = token.chain === 'Solana' ? '⚡ Solana' : '🔵 Base L2';
    if (desc) desc.textContent = token.description;
    if (price) price.textContent = `$${token.currentPriceUsd.toFixed(8)}`;
    if (mcap) mcap.textContent = `$${Math.floor(token.marketCapUsd).toLocaleString()}`;
    if (gradCap) gradCap.textContent = `$${(token.targetCapUsd || 25000).toLocaleString()}`;
    if (fees) fees.textContent = `$${token.totalFeePoolDistributedUsd.toFixed(2)}`;
    if (curveBar) curveBar.style.width = `${Math.min(100, token.bondingCurveProgressPercent)}%`;
    if (curvePct) curvePct.textContent = `${token.bondingCurveProgressPercent}%`;

    const isStack = token.tokenType === 'stack';
    if (typeBadge) {
      typeBadge.textContent = isStack ? '🏛️ SOVEREIGN STACK' : '⚡ MEME SPRINT';
      typeBadge.className = isStack ? 'badge-tag stack' : 'badge-tag';
    }

    if (antiDumpBadge) {
      antiDumpBadge.style.display = token.antiDumpEnabled ? 'inline-block' : 'none';
    }

    if (antiDumpNotice) {
      antiDumpNotice.style.display = (token.antiDumpEnabled && this.tradeMode === 'SELL') ? 'block' : 'none';
    }

    if (privateBanner) {
      privateBanner.style.display = token.isPrivate ? 'block' : 'none';
    }

    this.setTradeMode('BUY');
    this.renderTradeTape(trades);
  }

  setTradeMode(mode) {
    this.tradeMode = mode;
    if (!this.activeToken) return;

    const sym = this.activeToken.symbol;
    const isSol = this.activeToken.chain === 'Solana';
    const curr = isSol ? 'SOL' : 'ETH';

    const buySec = document.getElementById('tradeBuySellSection');
    const stakeSec = document.getElementById('tradeStakeSection');
    const inputLabel = document.getElementById('detailSwapInputLabel');
    const antiDumpNotice = document.getElementById('antiDumpNotice');

    if (this.detailTabBuy) this.detailTabBuy.className = mode === 'BUY' ? 'trade-mode-btn active-buy' : 'trade-mode-btn';
    if (this.detailTabSell) this.detailTabSell.className = mode === 'SELL' ? 'trade-mode-btn active-sell' : 'trade-mode-btn';
    if (this.detailTabStake) this.detailTabStake.className = mode === 'STAKE' ? 'trade-mode-btn active-stake' : 'trade-mode-btn';

    if (mode === 'STAKE') {
      if (buySec) buySec.style.display = 'none';
      if (stakeSec) stakeSec.style.display = 'block';
    } else {
      if (buySec) buySec.style.display = 'block';
      if (stakeSec) stakeSec.style.display = 'none';

      if (mode === 'BUY') {
        if (this.btnExecuteSwap) {
          this.btnExecuteSwap.className = 'btn btn-action-buy';
          this.btnExecuteSwap.textContent = `Buy $${sym}`;
        }
        if (inputLabel) inputLabel.textContent = `Amount in ${curr}`;
        if (antiDumpNotice) antiDumpNotice.style.display = 'none';
      } else {
        if (this.btnExecuteSwap) {
          this.btnExecuteSwap.className = 'btn btn-action-sell';
          this.btnExecuteSwap.textContent = `Sell $${sym}`;
        }
        if (inputLabel) inputLabel.textContent = `Amount of $${sym} to Sell`;
        if (antiDumpNotice) antiDumpNotice.style.display = this.activeToken.antiDumpEnabled ? 'block' : 'none';
      }
      this.updateSwapEstimate();
    }
  }

  updateSwapEstimate() {
    if (!this.activeToken || !this.detailSwapAmount) return;
    const amt = parseFloat(this.detailSwapAmount.value) || 0;
    const estBox = document.getElementById('detailSwapEstimate');
    if (!estBox) return;

    if (amt <= 0) {
      estBox.innerHTML = `Estimated Output: <strong>0 $${this.activeToken.symbol}</strong>`;
      return;
    }

    const price = this.activeToken.currentPriceUsd;
    const solPrice = 150.00;

    if (this.tradeMode === 'BUY') {
      const usdIn = amt * solPrice;
      const tokensOut = usdIn / (price * 1.005);
      estBox.innerHTML = `Estimated Output: <strong>${Math.floor(tokensOut).toLocaleString()} $${this.activeToken.symbol}</strong> (0.25% Treasury, 0.25% Burn)`;
    } else {
      const usdOut = amt * price * 0.995;
      const solOut = usdOut / solPrice;
      estBox.innerHTML = `Estimated Output: <strong>${solOut.toFixed(4)} SOL / ETH</strong>`;
    }
  }

  async executeSwap() {
    if (!window.walletEngine || !window.walletEngine.isAuthenticated) {
      this.toast('Please Sign In or Connect Wallet first.', 'warning');
      if (window.walletEngine) window.walletEngine.openAuthModal();
      return;
    }

    if (!this.activeToken) return;
    const amt = parseFloat(this.detailSwapAmount.value);
    if (!amt || amt <= 0) {
      this.toast('Please enter a valid amount.', 'error');
      return;
    }

    const userAddr = window.walletEngine.activeAddress;
    const endpoint = this.tradeMode === 'BUY'
      ? `/api/tokens/${this.activeToken.symbol}/buy`
      : `/api/tokens/${this.activeToken.symbol}/sell`;

    const body = this.tradeMode === 'BUY'
      ? { solAmount: amt, buyerAddress: userAddr }
      : { tokenAmount: amt, sellerAddress: userAddr };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        this.playAudioSfx(this.tradeMode === 'BUY' ? 'buy' : 'sell');
        this.toast(data.message, 'success');
        this.openTokenDetail(this.activeToken.symbol);
        this.fetchTokens();
        this.fetchStacks();
        this.fetchKing();
        this.detailSwapAmount.value = '';
      } else {
        this.toast(data.error, 'error');
      }
    } catch (err) {
      this.toast('Trade execution failed.', 'error');
    }
  }

  async executeStake() {
    if (!window.walletEngine || !window.walletEngine.isAuthenticated) {
      this.toast('Please Sign In or Connect Wallet first.', 'warning');
      if (window.walletEngine) window.walletEngine.openAuthModal();
      return;
    }

    if (!this.activeToken) return;
    const amtInput = document.getElementById('stakeAmountInput');
    const durInput = document.getElementById('stakeDurationSelect');
    const amt = parseFloat(amtInput ? amtInput.value : 0);
    const durationDays = durInput ? parseInt(durInput.value) : 90;

    if (!amt || amt <= 0) {
      this.toast('Please enter an amount of tokens to stake.', 'error');
      return;
    }

    const userAddr = window.walletEngine.activeAddress;

    try {
      const res = await fetch(`/api/tokens/${this.activeToken.symbol}/stake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, durationDays, userAddress: userAddr })
      });
      const data = await res.json();

      if (data.success) {
        this.playAudioSfx('stake');
        this.toast(data.message, 'success');
        if (amtInput) amtInput.value = '';
        this.openTokenDetail(this.activeToken.symbol);
        this.fetchStacks();
      } else {
        this.toast(data.error, 'error');
      }
    } catch (err) {
      this.toast('Staking failed.', 'error');
    }
  }

  copyInviteLink() {
    if (!this.activeToken) return;
    const url = `${window.location.origin}/coin/${this.activeToken.symbol}?key=${this.activeToken.inviteCode || ''}`;
    navigator.clipboard.writeText(url).then(() => {
      this.toast(`✓ Private Invite Link Copied: ${url}`, 'success');
    });
  }

  renderTradeTape(trades) {
    const tbody = document.getElementById('detailTradeTape');
    if (!tbody) return;

    if (!trades || trades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 10px;">No trades recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = trades.slice(0, 10).map(tr => `
      <tr>
        <td style="color: var(--text-muted);">${tr.time}</td>
        <td style="color: ${tr.type === 'BUY' ? 'var(--market-green)' : 'var(--cyber-red)'}; font-weight: 800;">${tr.type}</td>
        <td>${tr.amountSol || tr.amount || 0}</td>
      </tr>
    `).join('');
  }

  /* Trollbox */
  async loadTrollbox(symbol) {
    try {
      const res = await fetch(`/api/tokens/${symbol}/chat`);
      const data = await res.json();
      const feed = document.getElementById('trollboxFeed');
      if (feed && data.success) {
        feed.innerHTML = '';
        data.messages.forEach(m => {
          const div = document.createElement('div');
          div.className = 'trollbox-msg';
          div.innerHTML = `<span style="color: var(--cyber-blue); font-weight: 800;">[${m.user}]</span>: <span>${m.text}</span>`;
          feed.appendChild(div);
        });
        feed.scrollTop = feed.scrollHeight;
      }
    } catch (err) {}
  }

  async sendTrollboxMessage() {
    if (!this.activeToken || !this.trollboxInput) return;
    const text = this.trollboxInput.value.trim();
    if (!text) return;

    const user = window.walletEngine && window.walletEngine.isAuthenticated
      ? (window.walletEngine.userProfile?.username || `Trader_${window.walletEngine.activeAddress.substring(2, 6)}`)
      : "AnonCoder";

    try {
      const res = await fetch(`/api/tokens/${this.activeToken.symbol}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, text, badge: "DIAMOND" })
      });
      const data = await res.json();
      if (data.success) {
        this.trollboxInput.value = '';
        this.loadTrollbox(this.activeToken.symbol);
      }
    } catch (err) {}
  }

  /* =========================================================
     DEPLOY COIN / SOVEREIGN STACK
  ========================================================= */
  openDeployModal(defaultMode = 'sprint') {
    if (this.deployModal) {
      this.deployModal.classList.add('active');
      const radio = document.querySelector(`input[name="tokenTypeSelect"][value="${defaultMode}"]`);
      if (radio) radio.checked = true;
    }
  }

  closeDeployModal() {
    if (this.deployModal) this.deployModal.classList.remove('active');
  }

  async handleDeploySubmit(e) {
    e.preventDefault();
    if (!window.walletEngine || !window.walletEngine.isAuthenticated) {
      this.toast('Please Sign In or Connect Wallet before deploying.', 'warning');
      if (window.walletEngine) window.walletEngine.openAuthModal();
      return;
    }

    const name = document.getElementById('newTokenName').value;
    const symbol = document.getElementById('newTokenSymbol').value;
    const description = document.getElementById('newTokenDesc').value;
    const imageUrl = document.getElementById('newTokenImage').value;
    const devLockPercent = document.getElementById('newDevLockPercent').value;
    
    const typeRadio = document.querySelector('input[name="tokenTypeSelect"]:checked');
    const tokenType = typeRadio ? typeRadio.value : 'sprint';

    const privacyRadio = document.querySelector('input[name="privacySelect"]:checked');
    const isPrivate = privacyRadio ? privacyRadio.value === 'private' : false;
    const inviteCode = document.getElementById('newInviteCode') ? document.getElementById('newInviteCode').value.trim() : null;

    const chainRadio = document.querySelector('input[name="deployChain"]:checked');
    const chain = chainRadio ? chainRadio.value : "Base";

    const userAddr = window.walletEngine.activeAddress;

    try {
      const res = await fetch('/api/tokens/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          symbol,
          description,
          imageUrl,
          creator: userAddr,
          chain,
          devLockPercent,
          tokenType,
          isPrivate,
          inviteCode: isPrivate ? (inviteCode || `circle_${symbol.toLowerCase()}`) : null,
          antiDumpEnabled: tokenType === 'stack'
        })
      });
      const data = await res.json();

      if (data.success) {
        this.toast(`$${data.token.symbol} Deployed Successfully!`, 'success');
        this.closeDeployModal();
        document.getElementById('deployTokenForm').reset();
        
        if (isPrivate && data.token.inviteCode) {
          this.unlockedKeys.add(data.token.inviteCode);
        }

        await this.fetchTokens();
        await this.fetchStacks();
        this.openTokenDetail(data.token.symbol);
      } else {
        this.toast(data.error, 'error');
      }
    } catch (err) {
      this.toast('Error deploying token.', 'error');
    }
  }

  /* Leaderboard & Reserves */
  async fetchLeaderboard() {
    try {
      const res = await fetch('/api/market/leaderboard');
      const data = await res.json();
      if (data.success && data.leaderboard) {
        const tbody = document.getElementById('leaderboardTableBody');
        if (tbody) {
          tbody.innerHTML = data.leaderboard.map(t => `
            <tr>
              <td style="font-weight: 800; color: ${t.rank <= 3 ? 'var(--cyber-blue)' : 'var(--text-muted)'};">#${t.rank}</td>
              <td><span style="font-weight: 700; color: #fff;">${t.username}</span> <span style="font-size: 10px; color: var(--text-muted);">(${t.address})</span></td>
              <td><span class="badge-tag safe">${t.badge}</span></td>
              <td style="color: var(--market-green); font-weight: 800;">+${t.dailyPnlPercent}% ($${t.dailyProfitUsd.toLocaleString()})</td>
              <td>$${t.totalVolumeUsd.toLocaleString()}</td>
              <td style="color: var(--cyber-blue); font-weight: 700;">${t.winRate}%</td>
              <td style="color: var(--text-muted);">${t.tradesCount}</td>
            </tr>
          `).join('');
        }
      }
    } catch (e) {}
  }

  async fetchTreasuryReserves() {
    try {
      const res = await fetch('/api/treasury/public-reserves');
      const data = await res.json();
      if (data.success) {
        const totalEl = document.getElementById('treasuryTotalReservesUsd');
        const burnTokensEl = document.getElementById('treasuryTotalBurnedTokens');
        const burnUsdEl = document.getElementById('treasuryTotalBurnedUsd');
        const tableBody = document.getElementById('treasuryHoldingsTableBody');

        if (totalEl) totalEl.textContent = `$${data.totalReservesUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        if (burnTokensEl) burnTokensEl.textContent = `${data.burnStats.totalTokensBurned.toLocaleString()} TOKENS`;
        if (burnUsdEl) burnUsdEl.textContent = `$${data.burnStats.totalUsdValueBurned.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD Burned to 0xdead`;

        if (tableBody && data.tokenHoldings) {
          tableBody.innerHTML = data.tokenHoldings.map(h => `
            <tr>
              <td><strong>${h.name}</strong> ($${h.symbol})</td>
              <td>${h.amount.toLocaleString()} ${h.symbol}</td>
              <td style="color: var(--cyber-blue);">$${h.priceUsd.toFixed(2)}</td>
              <td style="font-weight: 800; color: #fff;">$${h.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td style="color: ${h.change24h >= 0 ? 'var(--market-green)' : 'var(--cyber-red)'}; font-weight: 700;">${h.change24h >= 0 ? '+' : ''}${h.change24h}%</td>
            </tr>
          `).join('');
        }
      }
    } catch (e) {}
  }

  /* Modals & Toasts */
  openProfileModal() {
    if (this.profileModal) this.profileModal.classList.add('active');
  }
  closeProfileModal() {
    if (this.profileModal) this.profileModal.classList.remove('active');
  }

  toast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type === 'error' ? 'error' : ''}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4500);
  }
}

window.showToast = (msg, type) => {
  if (window.launchpadManager) window.launchpadManager.toast(msg, type);
};

window.launchpadManager = null;
document.addEventListener('DOMContentLoaded', () => {
  window.launchpadManager = new CalabiLaunchpadManager();
});
