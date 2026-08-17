/**
 * Cession Sovereign Exchange & Launchpad Manager
 * Elite Cyber Coder Theme Controller
 * 
 * Features:
 * 1. Meme Sprints (Fast velocity $25k bonding curves)
 * 2. Curated Token Baskets & Playlists (1-Click Proportional AMM Basket Buys)
 * 3. Pump.fun Feature Replication (Live Marquee Tape, Sorting Matrix, Top 10 Holders, Rich Meme Trollbox)
 * 4. Sovereign Stacks (Long-term community assets, ROSCA/Tanda micro-endowments)
 * 5. 1% Max Sell Anti-Dump Circuit Breaker Guards
 * 6. Diamond Vault Time-Lock Staking (30d / 90d / 365d at 14% - 36% APY)
 * 7. Embedded Live Market Terminal & True Price Oracle under coins
 * 8. Transparent Proof-of-Reserves in Footer
 */

class CessionLaunchpadManager {
  constructor() {
    this.tokenGrid = document.getElementById('tokenGrid');
    this.stacksGrid = document.getElementById('stacksGrid');
    this.collectionsGrid = document.getElementById('collectionsGrid');
    this.searchInput = document.getElementById('tokenSearchInput');
    
    this.activeFilter = 'trending';
    this.activeSort = 'bump'; // 'bump' | 'creation' | 'replies' | 'market_cap' | 'progress'
    this.showGraduated = true;
    this.activeChain = 'all';
    this.tokens = [];
    this.stacks = [];
    this.collections = [];
    this.globalTrades = [];
    this.activeToken = null;
    this.activeSelectedSymbol = 'CESS';
    this.activeTimeframe = '15m';
    this.tradeMode = 'BUY'; // 'BUY' | 'SELL' | 'STAKE'
    this.currentView = 'launchpad';
    this.unlockedKeys = new Set();
    this.chatAttachmentUrl = null;

    // View Tabs
    this.tabViewLaunchpad = document.getElementById('tabViewLaunchpad');
    this.tabViewCollections = document.getElementById('tabViewCollections');
    this.tabViewStacks = document.getElementById('tabViewStacks');
    this.tabViewLeaderboard = document.getElementById('tabViewLeaderboard');

    this.sectionLaunchpad = document.getElementById('sectionLaunchpad');
    this.sectionCollections = document.getElementById('sectionCollections');
    this.sectionStacks = document.getElementById('sectionStacks');
    this.sectionLeaderboard = document.getElementById('sectionLeaderboard');

    // Modals
    this.detailModal = document.getElementById('tokenDetailModal');
    this.deployModal = document.getElementById('deployTokenModal');
    this.profileModal = document.getElementById('profileModal');
    this.howItWorksModal = document.getElementById('howItWorksModal');
    this.createBasketModal = document.getElementById('createBasketModal');

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
    this.btnAttachMeme = document.getElementById('btnAttachMeme');
    this.btnCopyInvite = document.getElementById('btnCopyInviteLink');

    this.init();
  }

  init() {
    this.checkUrlKeyParam();
    this.fetchTokens();
    this.fetchCollections();
    this.fetchStacks();
    this.fetchKing();
    this.fetchGlobalTrades();
    this.fetchLeaderboard();
    this.fetchTreasuryReserves();
    this.bindEvents();
    this.handleInitialRoute();

    // Setup streaming intervals
    setInterval(() => this.fetchGlobalTrades(), 6000);
    setInterval(() => this.fetchTokens(false), 12000);

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
    } else if (path === '/collections' || path === '/baskets' || path === '/playlists') {
      this.switchMainView('collections', false);
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
      } else if (curPath === '/collections' || curPath === '/baskets') {
        this.switchMainView('collections', false);
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
    if (this.tabViewCollections) this.tabViewCollections.addEventListener('click', () => this.switchMainView('collections'));
    if (this.tabViewStacks) this.tabViewStacks.addEventListener('click', () => this.switchMainView('stacks'));
    if (this.tabViewLeaderboard) this.tabViewLeaderboard.addEventListener('click', () => this.switchMainView('leaderboard'));

    // How It Works Modal
    const btnOpenHow = document.getElementById('btnHowItWorksNav');
    const btnCloseHow = document.getElementById('btnCloseHowItWorksModal');
    if (btnOpenHow) btnOpenHow.addEventListener('click', () => this.openHowItWorksModal());
    if (btnCloseHow) btnCloseHow.addEventListener('click', () => this.closeHowItWorksModal());

    // Sorting Matrix Pills
    document.querySelectorAll('.sort-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sort-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeSort = btn.getAttribute('data-sort') || 'bump';
        this.fetchTokens();
      });
    });

    // Show Graduated Toggle
    const chkGrad = document.getElementById('toggleShowGraduated');
    if (chkGrad) {
      chkGrad.addEventListener('change', (e) => {
        this.showGraduated = e.target.checked;
        this.fetchTokens();
      });
    }

    // Search filter
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => {
        this.renderTokenGrid();
        this.renderStacksGrid();
        this.renderCollectionsGrid();
      });
    }

    // Deploy Modal Handlers
    const btnOpenDeploy = document.getElementById('btnOpenDeployModal');
    const btnCloseDeploy = document.getElementById('btnCloseDeployModal');
    const deployForm = document.getElementById('deployTokenForm');
    if (btnOpenDeploy) btnOpenDeploy.addEventListener('click', () => this.openDeployModal());
    if (btnCloseDeploy) btnCloseDeploy.addEventListener('click', () => this.closeDeployModal());
    if (deployForm) deployForm.addEventListener('submit', (e) => this.handleDeploySubmit(e));

    // Create Basket Modal Handlers
    const btnOpenCreateBasket = document.getElementById('btnOpenCreateBasketModal');
    const btnCloseCreateBasket = document.getElementById('btnCloseCreateBasketModal');
    const createBasketForm = document.getElementById('createBasketForm');
    if (btnOpenCreateBasket) btnOpenCreateBasket.addEventListener('click', () => this.openCreateBasketModal());
    if (btnCloseCreateBasket) btnCloseCreateBasket.addEventListener('click', () => this.closeCreateBasketModal());
    if (createBasketForm) createBasketForm.addEventListener('submit', (e) => this.handleCreateBasketSubmit(e));

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
        const amt = btn.getAttribute('data-amt');
        if (this.detailSwapAmount) {
          if (amt === 'max') {
            this.detailSwapAmount.value = this.tradeMode === 'BUY' ? '5.0' : '100000';
          } else {
            this.detailSwapAmount.value = parseFloat(amt);
          }
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

    if (this.btnAttachMeme) {
      this.btnAttachMeme.addEventListener('click', () => this.attachMemePrompt());
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
      { name: 'collections', tab: this.tabViewCollections, sec: this.sectionCollections, path: '/collections' },
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

    if (viewName === 'collections') {
      this.fetchCollections();
    } else if (viewName === 'stacks') {
      this.fetchStacks();
    } else if (viewName === 'leaderboard') {
      this.fetchLeaderboard();
    }
  }

  /* =========================================================
     [HOW IT WORKS] MODAL
  ========================================================= */
  openHowItWorksModal() {
    if (this.howItWorksModal) this.howItWorksModal.classList.add('active');
  }

  closeHowItWorksModal() {
    if (this.howItWorksModal) this.howItWorksModal.classList.remove('active');
  }

  /* =========================================================
     TOP GLOBAL TRADE MARQUEE TICKER TAPE
  ========================================================= */
  async fetchGlobalTrades() {
    try {
      const res = await fetch('/api/tokens/global-trades');
      const data = await res.json();
      if (data.success && data.trades) {
        this.globalTrades = data.trades;
        this.renderGlobalTradeMarquee();
      }
    } catch (e) {}
  }

  renderGlobalTradeMarquee() {
    const marquee = document.getElementById('globalTradeMarquee');
    if (!marquee || !this.globalTrades || this.globalTrades.length === 0) return;

    const pillsHtml = this.globalTrades.map(tr => {
      const isBuy = tr.type === 'BUY';
      const shortAddr = tr.user ? (tr.user.length > 8 ? `${tr.user.substring(0, 4)}..${tr.user.slice(-2)}` : tr.user) : 'trader';
      const amtStr = tr.amountSol ? `${tr.amountSol.toFixed(2)} SOL` : `${tr.amount} tokens`;
      const avatar = tr.imageUrl || 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=60';

      return `
        <div class="marquee-pill" onclick="window.launchpadManager.openTokenDetail('${tr.symbol}')">
          <img src="${avatar}" class="marquee-pill-avatar" alt="${tr.symbol}">
          <span style="font-weight: 800; color: #fff;">${shortAddr}</span>
          <span class="marquee-pill-type ${isBuy ? 'buy' : 'sell'}">${tr.type}</span>
          <span style="color: var(--cyber-blue); font-weight: 700;">$${tr.symbol}</span>
          <span style="color: var(--text-muted);">(${amtStr})</span>
        </div>
      `;
    }).join('');

    // Duplicate track to ensure seamless infinite scroll
    marquee.innerHTML = pillsHtml + pillsHtml;
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
     FETCH TOKENS & CURATED BASKETS
  ========================================================= */
  async fetchTokens(render = true) {
    try {
      const keyParam = Array.from(this.unlockedKeys).join(',');
      const res = await fetch(`/api/tokens?type=sprint&sort=${this.activeSort}&chain=${this.activeChain}&showGraduated=${this.showGraduated}&key=${keyParam}`);
      const data = await res.json();
      if (data.success) {
        this.tokens = data.tokens;
        if (render) this.renderTokenGrid();
      }
    } catch (err) {
      console.warn('Tokens fetch error:', err);
    }
  }

  async fetchCollections() {
    try {
      const res = await fetch('/api/tokens/collections');
      const data = await res.json();
      if (data.success) {
        this.collections = data.collections;
        this.renderCollectionsGrid();
      }
    } catch (err) {
      console.warn('Collections fetch error:', err);
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
          <h3 style="font-size: 15px; color: #fff; font-family: var(--font-mono);">No active coins found</h3>
          <p style="color: var(--text-secondary); font-size: 12px; margin-bottom: 14px;">Deploy a zero-fee bonding curve sprint on Base or Solana.</p>
          <button class="btn btn-launch" onclick="window.launchpadManager.openDeployModal('sprint')">+ Launch Coin</button>
        </div>
      `;
      return;
    }

    this.tokenGrid.innerHTML = filtered.map(t => this.createTokenCardHtml(t)).join('');
  }

  renderCollectionsGrid() {
    if (!this.collectionsGrid) return;
    const query = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';
    const filtered = this.collections.filter(c => {
      return c.name.toLowerCase().includes(query) ||
             c.description.toLowerCase().includes(query) ||
             c.creator.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      this.collectionsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="font-size: 28px; margin-bottom: 8px;">🧺</div>
          <h3 style="font-size: 15px; color: #fff; font-family: var(--font-mono);">No Curated Baskets found</h3>
          <p style="color: var(--text-secondary); font-size: 12px; margin-bottom: 14px;">Group your favorite coins into a 1-Click shareable basket playlist.</p>
          <button class="btn btn-launch" onclick="window.launchpadManager.openCreateBasketModal()">+ Create Curated Basket</button>
        </div>
      `;
      return;
    }

    this.collectionsGrid.innerHTML = filtered.map(c => this.createCollectionCardHtml(c)).join('');
  }

  createCollectionCardHtml(c) {
    const creatorShort = c.creator ? (c.creator.length > 8 ? `${c.creator.substring(0, 6)}...` : c.creator) : 'Cession';
    const tokensHtml = c.tokens.map(tk => `
      <div class="basket-token-pill">
        <span style="font-weight: 800; color: var(--cyber-blue);">$${tk.symbol}</span>
        <span style="color: var(--text-muted); font-size: 10px;">${tk.weight}%</span>
      </div>
    `).join('');

    return `
      <div class="collection-card">
        <div class="collection-header">
          <img src="${c.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'}" class="collection-avatar" alt="${c.name}">
          <div style="flex: 1;">
            <div class="collection-title">${c.name}</div>
            <div class="collection-creator">Curated by <span>${creatorShort}</span> • ${c.tokens.length} Coins</div>
          </div>
        </div>

        <p class="collection-desc">${c.description}</p>

        <div style="margin-bottom: 12px;">
          <div style="font-size: 10px; font-weight: 800; font-family: var(--font-mono); color: var(--text-muted); margin-bottom: 6px;">PORTFOLIO ALLOCATION:</div>
          <div class="basket-tokens-list">
            ${tokensHtml}
          </div>
        </div>

        <div class="collection-stats-bar">
          <div>
            <span class="c-stat-label">TOTAL LIQUIDITY</span>
            <span class="c-stat-val">$${Math.floor(c.totalMarketCapUsd || 48000).toLocaleString()}</span>
          </div>
          <div>
            <span class="c-stat-label">1-CLICK BUY</span>
            <span class="c-stat-val cyan">Proportional AMM</span>
          </div>
        </div>

        <button class="btn-buy-basket" onclick="window.launchpadManager.buyBasket('${c.id}')">
          🧺 1-Click Buy Basket (0.5 SOL)
        </button>
      </div>
    `;
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
    const isGraduated = t.bondingCurveProgressPercent >= 100;
    const creatorShort = t.creator ? (t.creator.length > 8 ? `${t.creator.substring(0, 5)}...` : t.creator) : 'dev';
    const repliesCount = t.chatMessagesCount || (t.chatMessages ? t.chatMessages.length : 0);
    const timeAgoStr = t.bumpTimestamp ? this.formatTimeAgo(t.bumpTimestamp) : '1m ago';

    const badgeType = isGraduated
      ? `<span class="badge-tag safe">🎓 GRADUATED</span>`
      : (isStack 
          ? `<span class="badge-tag stack">🏛️ STACK</span>` 
          : `<span class="badge-tag" style="background: var(--cyber-blue-subtle); color: var(--cyber-blue); border: 1px solid var(--border-blue);">⚡ SPRINT</span>`);

    return `
      <div class="token-card ${isStack ? 'stack-card' : ''}" onclick="window.launchpadManager.openTokenDetail('${t.symbol}')">
        <div class="token-card-top">
          <img src="${t.imageUrl || 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=200'}" class="token-avatar" alt="${t.name}">
          <div class="token-meta">
            <div class="token-name-row">
              <span class="token-name">${t.name}</span>
              <span class="token-symbol">$${t.symbol}</span>
            </div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; align-items: center;">
              ${badgeType}
              <span class="chain-badge-sm">${t.chain === 'Solana' ? '⚡ SOL' : '🔵 BASE'}</span>
              <span style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono);">💬 ${repliesCount}</span>
              <span style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); margin-left: auto;">${timeAgoStr}</span>
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
            <span class="stat-val ${isGraduated ? 'safe' : (isStack ? 'cyan' : 'up')}">${isGraduated ? '100% (DEX)' : (isStack ? '28.5% APY' : t.bondingCurveProgressPercent + '%')}</span>
          </div>
          <div class="card-stat-item">
            <span class="stat-label">DEV LOCK</span>
            <span class="stat-val safe">${t.devLockedPercent || 100}%</span>
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

  formatTimeAgo(timestamp) {
    const elapsedSec = Math.floor((Date.now() - timestamp) / 1000);
    if (elapsedSec < 60) return `${elapsedSec}s ago`;
    const elapsedMin = Math.floor(elapsedSec / 60);
    if (elapsedMin < 60) return `${elapsedMin}m ago`;
    const elapsedHours = Math.floor(elapsedMin / 60);
    return `${elapsedHours}h ago`;
  }

  /* =========================================================
     1-CLICK BUY BASKET (PROPORTIONAL AMM)
  ========================================================= */
  async buyBasket(collectionId) {
    if (!window.walletEngine || !window.walletEngine.isAuthenticated) {
      this.toast('Please Sign In or Connect Wallet first.', 'warning');
      if (window.walletEngine) window.walletEngine.openAuthModal();
      return;
    }

    const solAmtStr = prompt("Enter total SOL amount to invest in this Basket (e.g. 0.5, 1.0, 2.0):", "0.5");
    if (!solAmtStr) return;
    const totalSol = parseFloat(solAmtStr);
    if (isNaN(totalSol) || totalSol <= 0) {
      this.toast('Please enter a valid SOL amount.', 'error');
      return;
    }

    const userAddr = window.walletEngine.activeAddress;
    this.toast(`Executing 1-Click Proportional Buy for ${totalSol} SOL...`, 'info');

    try {
      const res = await fetch(`/api/tokens/collections/${collectionId}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalSolAmount: totalSol, buyerAddress: userAddr })
      });
      const data = await res.json();
      if (data.success) {
        this.playAudioSfx('buy');
        this.toast(`✓ Basket Buy Completed! Acquired tokens across ${data.results.length} coins.`, 'success');
        this.fetchTokens();
        this.fetchCollections();
        this.fetchGlobalTrades();
      } else {
        this.toast(data.error || 'Basket buy failed.', 'error');
      }
    } catch (e) {
      this.toast('Error executing basket transaction.', 'error');
    }
  }

  /* =========================================================
     CREATE CURATED BASKET / PLAYLIST
  ========================================================= */
  openCreateBasketModal() {
    if (this.createBasketModal) this.createBasketModal.classList.add('active');
  }

  closeCreateBasketModal() {
    if (this.createBasketModal) this.createBasketModal.classList.remove('active');
  }

  async handleCreateBasketSubmit(e) {
    e.preventDefault();
    if (!window.walletEngine || !window.walletEngine.isAuthenticated) {
      this.toast('Please Sign In or Connect Wallet first.', 'warning');
      if (window.walletEngine) window.walletEngine.openAuthModal();
      return;
    }

    const name = document.getElementById('newBasketName')?.value;
    const description = document.getElementById('newBasketDesc')?.value;
    const imageUrl = document.getElementById('newBasketImage')?.value;

    const symInputs = document.querySelectorAll('.basket-token-symbol');
    const weightInputs = document.querySelectorAll('.basket-token-weight');
    const tokens = [];

    symInputs.forEach((inp, idx) => {
      const s = inp.value.trim().toUpperCase();
      const w = parseFloat(weightInputs[idx]?.value || 0);
      if (s && w > 0) {
        tokens.push({ symbol: s, weight: w });
      }
    });

    if (tokens.length === 0) {
      this.toast('Please specify at least 1 token symbol and weight %.', 'error');
      return;
    }

    const userAddr = window.walletEngine.activeAddress;

    try {
      const res = await fetch('/api/tokens/collections/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, imageUrl, tokens, creator: userAddr })
      });
      const data = await res.json();
      if (data.success) {
        this.toast(`🧺 Curated Basket "${name}" Created Successfully!`, 'success');
        this.closeCreateBasketModal();
        this.switchMainView('collections');
        this.fetchCollections();
      } else {
        this.toast(data.error || 'Failed to create basket.', 'error');
      }
    } catch (e) {
      this.toast('Error creating curated basket.', 'error');
    }
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
      const res = await fetch(`/api/market/pro-feed?symbol=${symbol}&timeframe=${timeframe}`);
      const data = await res.json();
      if (data.success) {
        this.renderEmbeddedMarketHeader(data.market);
        this.renderEmbeddedOrderbook(data.orderbook);
        this.renderEmbeddedCandlesticks(data.candles);
        this.renderEmbeddedPriceFeeds(data.feeds);
      }
    } catch (err) {
      console.warn('Market feed fetch error:', err);
    }
  }

  renderEmbeddedMarketHeader(market) {
    const symEl = document.getElementById('marketSelectedSymbol');
    const nameEl = document.getElementById('marketSelectedName');
    const priceEl = document.getElementById('marketPriceTrue');
    const chgEl = document.getElementById('marketChange24h');
    const volEl = document.getElementById('marketVolume24h');
    const capEl = document.getElementById('marketCapDisplay');

    if (symEl) symEl.textContent = `$${market.symbol}`;
    if (nameEl) nameEl.textContent = market.name;
    if (priceEl) priceEl.textContent = `$${market.truePrice.toFixed(market.truePrice < 0.01 ? 8 : 4)}`;
    if (chgEl) {
      chgEl.textContent = `${market.change24h >= 0 ? '+' : ''}${market.change24h}%`;
      chgEl.className = `price-val ${market.change24h >= 0 ? 'up' : 'down'}`;
    }
    if (volEl) volEl.textContent = `$${Math.floor(market.volume24hUsd).toLocaleString()}`;
    if (capEl) capEl.textContent = `$${Math.floor(market.marketCapUsd).toLocaleString()}`;
  }

  renderEmbeddedOrderbook(orderbook) {
    const asksEl = document.getElementById('orderbookAsks');
    const bidsEl = document.getElementById('orderbookBids');
    if (!orderbook) return;

    if (asksEl && orderbook.asks) {
      asksEl.innerHTML = orderbook.asks.slice(-6).map(a => `
        <div class="orderbook-row ask">
          <span class="price">${a.price.toFixed(6)}</span>
          <span class="size">${a.size.toLocaleString()}</span>
          <span class="total">$${Math.floor(a.totalUsd).toLocaleString()}</span>
        </div>
      `).join('');
    }

    if (bidsEl && orderbook.bids) {
      bidsEl.innerHTML = orderbook.bids.slice(0, 6).map(b => `
        <div class="orderbook-row bid">
          <span class="price">${b.price.toFixed(6)}</span>
          <span class="size">${b.size.toLocaleString()}</span>
          <span class="total">$${Math.floor(b.totalUsd).toLocaleString()}</span>
        </div>
      `).join('');
    }
  }

  renderEmbeddedCandlesticks(candles) {
    const canvas = document.getElementById('embeddedMarketChartCanvas');
    if (!canvas || !candles || candles.length === 0) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth || 600;
    const height = 300;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#03050a';
    ctx.fillRect(0, 0, width, height);

    let minP = Math.min(...candles.map(c => c.low));
    let maxP = Math.max(...candles.map(c => c.high));
    if (minP === maxP) { minP *= 0.95; maxP *= 1.05; }
    const range = maxP - minP;

    // Grid lines
    ctx.strokeStyle = '#091224';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const candleWidth = Math.max(4, (width / candles.length) - 4);
    candles.forEach((c, idx) => {
      const x = (idx * (width / candles.length)) + 4;
      const openY = height - ((c.open - minP) / range) * (height - 40) - 20;
      const closeY = height - ((c.close - minP) / range) * (height - 40) - 20;
      const highY = height - ((c.high - minP) / range) * (height - 40) - 20;
      const lowY = height - ((c.low - minP) / range) * (height - 40) - 20;
      const isUp = c.close >= c.open;

      // Wick
      ctx.strokeStyle = isUp ? '#00f2fe' : '#ff0055';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = isUp ? '#00f2fe' : '#ff0055';
      const bodyY = Math.min(openY, closeY);
      const bodyH = Math.max(2, Math.abs(openY - closeY));
      ctx.fillRect(x, bodyY, candleWidth, bodyH);
    });
  }

  renderEmbeddedPriceFeeds(feeds) {
    const list = document.getElementById('oracleFeedsList');
    if (!list || !feeds) return;

    list.innerHTML = feeds.map(f => `
      <div class="feed-badge">
        <span class="source">${f.source}</span>
        <span class="price">$${f.price.toFixed(f.price < 0.01 ? 8 : 4)}</span>
        <span class="weight">${f.weight}% weight</span>
      </div>
    `).join('');
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
        this.fetchGlobalTrades();
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
        this.toast('Unable to load token details: ' + (data.error || 'Token not found'), 'error');
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
      this.fetchTokenHolders(data.token.symbol);
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
    const repliesBadge = document.getElementById('detailRepliesBadge');
    const antiDumpBadge = document.getElementById('detailAntiDumpBadge');
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

    const repliesCount = token.chatMessagesCount || (token.chatMessages ? token.chatMessages.length : 0);
    if (repliesBadge) repliesBadge.textContent = `💬 ${repliesCount} replies`;

    // Social Links
    const twitterLink = document.getElementById('detailTwitterLink');
    const telegramLink = document.getElementById('detailTelegramLink');
    const websiteLink = document.getElementById('detailWebsiteLink');

    if (twitterLink) {
      if (token.twitter) {
        twitterLink.href = token.twitter.startsWith('http') ? token.twitter : `https://x.com/${token.twitter}`;
        twitterLink.style.display = 'inline-flex';
      } else {
        twitterLink.style.display = 'none';
      }
    }

    if (telegramLink) {
      if (token.telegram) {
        telegramLink.href = token.telegram.startsWith('http') ? token.telegram : `https://t.me/${token.telegram}`;
        telegramLink.style.display = 'inline-flex';
      } else {
        telegramLink.style.display = 'none';
      }
    }

    if (websiteLink) {
      if (token.website) {
        websiteLink.href = token.website.startsWith('http') ? token.website : `https://${token.website}`;
        websiteLink.style.display = 'inline-flex';
      } else {
        websiteLink.style.display = 'none';
      }
    }

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

    this.setTradeMode('BUY');
    this.renderTradeTape(trades);
  }

  /* =========================================================
     TOP 10 HOLDERS DISTRIBUTION
  ========================================================= */
  async fetchTokenHolders(symbol) {
    try {
      const res = await fetch(`/api/tokens/${symbol}/holders`);
      const data = await res.json();
      const tbody = document.getElementById('tokenHoldersTableBody');
      if (!tbody) return;

      if (data.success && data.holders) {
        tbody.innerHTML = data.holders.map((h, i) => `
          <tr>
            <td style="color: var(--text-muted); font-family: var(--font-mono); font-weight: 800;">${i + 1}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-family: var(--font-mono); font-weight: 700; color: #fff;">${h.address}</span>
                <span class="badge-tag ${h.badgeClass || 'safe'}">${h.badge}</span>
              </div>
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="holder-bar-track">
                  <div class="holder-bar-fill" style="width: ${Math.min(100, h.percentage * 1.5)}%;"></div>
                </div>
                <span style="font-family: var(--font-mono); font-weight: 800; color: var(--cyber-blue); font-size: 11px;">${h.percentage}%</span>
              </div>
            </td>
            <td style="font-family: var(--font-mono); color: var(--text-muted); font-size: 11px;">
              ${h.balance.toLocaleString()}
            </td>
          </tr>
        `).join('');
      }
    } catch (e) {}
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
        this.fetchGlobalTrades();
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
    const url = `${window.location.origin}/coin/${this.activeToken.symbol}`;
    navigator.clipboard.writeText(url).then(() => {
      this.toast(`✓ Coin Share Link Copied: ${url}`, 'success');
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
        <td>${tr.amountSol ? `${tr.amountSol.toFixed(2)} SOL` : `${tr.amount} tokens`}</td>
      </tr>
    `).join('');
  }

  /* Trollbox with Meme Attachments */
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
          const imgHtml = m.imageUrl ? `<img src="${m.imageUrl}" class="trollbox-msg-img" alt="Meme" onerror="this.style.display='none'">` : '';
          div.innerHTML = `
            <div>
              <span style="color: var(--cyber-blue); font-weight: 800;">[${m.user}]</span>: <span>${m.text}</span>
            </div>
            ${imgHtml}
          `;
          feed.appendChild(div);
        });
        feed.scrollTop = feed.scrollHeight;
      }
    } catch (err) {}
  }

  attachMemePrompt() {
    const url = prompt("Paste image/GIF URL for meme attachment:", "");
    if (url && url.trim().startsWith('http')) {
      this.chatAttachmentUrl = url.trim();
      const prev = document.getElementById('trollboxAttachmentPreview');
      const text = document.getElementById('trollboxAttachmentUrlText');
      if (prev && text) {
        text.textContent = this.chatAttachmentUrl.substring(0, 30) + '...';
        prev.style.display = 'flex';
      }
    }
  }

  clearChatAttachment() {
    this.chatAttachmentUrl = null;
    const prev = document.getElementById('trollboxAttachmentPreview');
    if (prev) prev.style.display = 'none';
  }

  async sendTrollboxMessage() {
    if (!this.activeToken || !this.trollboxInput) return;
    const text = this.trollboxInput.value.trim();
    if (!text && !this.chatAttachmentUrl) return;

    const user = window.walletEngine && window.walletEngine.isAuthenticated
      ? (window.walletEngine.userProfile?.username || `Trader_${window.walletEngine.activeAddress.substring(2, 6)}`)
      : "AnonTrader";

    const payload = {
      user,
      text: text || "🔥 [meme attached]",
      badge: "DIAMOND",
      imageUrl: this.chatAttachmentUrl
    };

    try {
      const res = await fetch(`/api/tokens/${this.activeToken.symbol}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.trollboxInput.value = '';
        this.clearChatAttachment();
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
    const twitter = document.getElementById('newTokenTwitter')?.value?.trim();
    const telegram = document.getElementById('newTokenTelegram')?.value?.trim();
    const website = document.getElementById('newTokenWebsite')?.value?.trim();
    const initialBuySol = parseFloat(document.getElementById('newInitialBuySol')?.value || 0);
    
    const typeRadio = document.querySelector('input[name="tokenTypeSelect"]:checked');
    const tokenType = typeRadio ? typeRadio.value : 'sprint';

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
          twitter,
          telegram,
          website,
          initialBuySol,
          antiDumpEnabled: tokenType === 'stack'
        })
      });
      const data = await res.json();

      if (data.success) {
        this.toast(`$${data.token.symbol} Deployed Successfully!`, 'success');
        this.closeDeployModal();
        document.getElementById('deployTokenForm').reset();
        
        await this.fetchTokens();
        await this.fetchStacks();
        await this.fetchGlobalTrades();
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
window.CessionLaunchpadManager = CessionLaunchpadManager;
document.addEventListener('DOMContentLoaded', () => {
  window.launchpadManager = new CessionLaunchpadManager();
});
