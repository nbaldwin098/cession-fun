/**
 * Calabi Master Launchpad, Leaderboard, Treasury & Terminal Controller
 * 
 * Includes:
 * 1. Fair Launchpad bonding curves with Proof-of-Skin dev locks
 * 2. Trader Leaderboard (24h Daily PnL, Win Rate, Volume)
 * 3. Coin 24h Daily Gainers/Losers, New Listings, and Popular Feeds
 * 4. Transparent Kraken-Grade Proof-of-Reserves Treasury
 * 5. Web Audio API synthesized sound FX (Buy chirp, Sell chime, Graduation fanfare)
 * 6. XSS-sanitized Trollbox & Multi-Wallet Support
 */

class CalabiLaunchpadManager {
  constructor() {
    this.tokenGrid = document.getElementById('tokenGrid');
    this.searchInput = document.getElementById('tokenSearchInput');
    this.filterButtons = document.querySelectorAll('.filter-btn');
    this.chainButtons = document.querySelectorAll('.chain-pill');
    
    this.activeFilter = 'trending';
    this.activeChain = 'all';
    this.tokens = [];
    this.activeToken = null;
    this.tradeMode = 'BUY'; // 'BUY' or 'SELL'
    this.currentView = 'launchpad';

    // View Tabs
    this.tabViewLaunchpad = document.getElementById('tabViewLaunchpad');
    this.tabViewLeaderboard = document.getElementById('tabViewLeaderboard');
    this.tabViewNewCoins = document.getElementById('tabViewNewCoins');
    this.tabViewTreasury = document.getElementById('tabViewTreasury');
    this.tabViewPro = document.getElementById('tabViewPro');

    this.sectionLaunchpad = document.getElementById('sectionLaunchpad');
    this.sectionLeaderboard = document.getElementById('sectionLeaderboard');
    this.sectionNewCoins = document.getElementById('sectionNewCoins');
    this.sectionTreasury = document.getElementById('sectionTreasury');
    this.sectionProTrading = document.getElementById('sectionProTrading');

    // Modals
    this.detailModal = document.getElementById('tokenDetailModal');
    this.deployModal = document.getElementById('deployTokenModal');
    this.walletModal = document.getElementById('walletModal');
    this.sendModal = document.getElementById('sendModal');
    this.receiveModal = document.getElementById('receiveModal');
    this.profileModal = document.getElementById('profileModal');
    this.cexDossierModal = document.getElementById('cexDossierModal');

    // Detail Modal Elements
    this.btnCloseDetail = document.getElementById('btnCloseDetailModal');
    this.detailTabBuy = document.getElementById('detailTabBuy');
    this.detailTabSell = document.getElementById('detailTabSell');
    this.detailSwapAmount = document.getElementById('detailSwapAmount');
    this.btnExecuteSwap = document.getElementById('btnExecuteDetailSwap');
    this.trollboxInput = document.getElementById('trollboxInput');
    this.btnSendTrollbox = document.getElementById('btnSendTrollbox');

    this.init();
  }

  init() {
    this.fetchTokens();
    this.fetchKing();
    this.fetchLeaderboard();
    this.fetchDailyGainers();
    this.fetchTreasuryReserves();
    this.bindEvents();
    this.handleInitialRoute();
  }

  handleInitialRoute() {
    const path = window.location.pathname.toLowerCase();
    if (path === '/leaderboard' || path === '/rankings') {
      this.switchMainView('leaderboard', false);
    } else if (path === '/new-coins' || path === '/newcoins') {
      this.switchMainView('newcoins', false);
    } else if (path === '/treasury' || path === '/reserves') {
      this.switchMainView('treasury', false);
    } else if (path === '/pro' || path === '/terminal' || path === '/trade') {
      this.switchMainView('pro', false);
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
      } else if (curPath === '/leaderboard') {
        this.switchMainView('leaderboard', false);
      } else if (curPath === '/new-coins') {
        this.switchMainView('newcoins', false);
      } else if (curPath === '/treasury') {
        this.switchMainView('treasury', false);
      } else if (curPath === '/pro') {
        this.switchMainView('pro', false);
      } else if (curPath.startsWith('/coin/')) {
        const s = curPath.split('/')[2];
        if (s) this.openTokenDetail(s.toUpperCase(), false);
      }
    });
  }

  bindEvents() {
    // Navigation view tabs
    if (this.tabViewLaunchpad) this.tabViewLaunchpad.addEventListener('click', () => this.switchMainView('launchpad'));
    if (this.tabViewLeaderboard) this.tabViewLeaderboard.addEventListener('click', () => this.switchMainView('leaderboard'));
    if (this.tabViewNewCoins) this.tabViewNewCoins.addEventListener('click', () => this.switchMainView('newcoins'));
    if (this.tabViewTreasury) this.tabViewTreasury.addEventListener('click', () => this.switchMainView('treasury'));
    if (this.tabViewPro) this.tabViewPro.addEventListener('click', () => this.switchMainView('pro'));

    // Mobile Bottom Nav items
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = item.getAttribute('data-view');
        if (view === 'launch') {
          this.openDeployModal();
        } else if (view === 'wallet') {
          this.openWalletModal();
        } else if (view) {
          this.switchMainView(view);
          document.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
        }
      });
    });

    // Discovery Controls
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.renderTokenGrid());
    }

    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.getAttribute('data-filter');
        this.fetchTokens();
      });
    });

    this.chainButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.chainButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeChain = btn.getAttribute('data-chain');
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

    // Vault & Profile Modal Handlers
    const btnVault = document.getElementById('btnOpenVaultModal');
    const btnCloseVault = document.getElementById('btnCloseVaultModal');
    if (btnVault) btnVault.addEventListener('click', () => this.openWalletModal());
    if (btnCloseVault) btnCloseVault.addEventListener('click', () => this.closeWalletModal());

    const btnProfile = document.getElementById('btnOpenProfileModal');
    if (btnProfile) btnProfile.addEventListener('click', () => this.openProfileModal());

    // Detail Modal Handlers
    if (this.btnCloseDetail) this.btnCloseDetail.addEventListener('click', () => this.closeDetailModal());
    if (this.detailTabBuy && this.detailTabSell) {
      this.detailTabBuy.addEventListener('click', () => this.setTradeMode('BUY'));
      this.detailTabSell.addEventListener('click', () => this.setTradeMode('SELL'));
    }

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

    // Trollbox
    if (this.btnSendTrollbox && this.trollboxInput) {
      this.btnSendTrollbox.addEventListener('click', () => this.sendTrollboxMessage());
      this.trollboxInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendTrollboxMessage();
      });
    }

    // Send Form
    const sendForm = document.getElementById('sendFundsForm');
    if (sendForm) {
      sendForm.addEventListener('submit', (e) => this.handleSendSubmit(e));
    }
  }

  switchMainView(viewName, pushUrl = true) {
    this.currentView = viewName;
    const views = [
      { name: 'launchpad', tab: this.tabViewLaunchpad, sec: this.sectionLaunchpad, path: '/' },
      { name: 'leaderboard', tab: this.tabViewLeaderboard, sec: this.sectionLeaderboard, path: '/leaderboard' },
      { name: 'newcoins', tab: this.tabViewNewCoins, sec: this.sectionNewCoins, path: '/new-coins' },
      { name: 'treasury', tab: this.tabViewTreasury, sec: this.sectionTreasury, path: '/treasury' },
      { name: 'pro', tab: this.tabViewPro, sec: this.sectionProTrading, path: '/pro' }
    ];

    views.forEach(v => {
      if (v.tab) v.tab.classList.toggle('active', v.name === viewName);
      if (v.sec) v.sec.style.display = v.name === viewName ? 'block' : 'none';
      if (pushUrl && v.name === viewName && window.location.pathname !== v.path) {
        history.pushState(null, '', v.path);
      }
    });

    if (viewName === 'leaderboard') {
      this.fetchLeaderboard();
      this.fetchDailyGainers();
    } else if (viewName === 'newcoins') {
      this.fetchNewListings();
    } else if (viewName === 'treasury') {
      this.fetchTreasuryReserves();
    } else if (viewName === 'pro' && window.chartController) {
      window.chartController.loadCandles('BTC-USD');
    }
  }

  /* Audio Synthesizer via Web Audio API */
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
      } else if (type === 'graduation') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {}
  }

  /* =========================================================
     LEADERBOARD & DAILY GAINERS
  ========================================================= */
  async fetchLeaderboard() {
    try {
      const res = await fetch('/api/market/leaderboard');
      const data = await res.json();
      if (data.success && data.leaderboard) {
        this.renderLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.warn('Leaderboard fetch error:', err);
    }
  }

  renderLeaderboard(traders) {
    const tbody = document.getElementById('leaderboardTableBody');
    if (!tbody) return;

    tbody.innerHTML = traders.map(t => {
      const pnlClass = t.dailyPnlPercent >= 0 ? 'up' : 'down';
      const pnlPrefix = t.dailyPnlPercent >= 0 ? '+' : '';
      return `
        <tr>
          <td style="font-weight: 800; font-family: var(--font-mono); color: ${t.rank <= 3 ? 'var(--brand-yellow)' : 'var(--text-muted)'};">
            #${t.rank}
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${t.avatar}" class="table-avatar" alt="${t.username}">
              <div>
                <div style="font-weight: 700; color: #fff;">${t.username}</div>
                <div style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">${t.address}</div>
              </div>
            </div>
          </td>
          <td><span class="badge-tag safe">${t.badge}</span></td>
          <td style="font-family: var(--font-mono); font-weight: 800;" class="${pnlClass}">
            ${pnlPrefix}${t.dailyPnlPercent.toFixed(1)}% ($${t.dailyProfitUsd.toLocaleString()})
          </td>
          <td style="font-family: var(--font-mono); color: #fff;">$${t.totalVolumeUsd.toLocaleString()}</td>
          <td style="font-family: var(--font-mono); color: var(--accent-emerald); font-weight: 700;">${t.winRate}%</td>
          <td style="font-family: var(--font-mono); color: var(--text-muted);">${t.tradesCount}</td>
        </tr>
      `;
    }).join('');
  }

  async fetchDailyGainers() {
    try {
      const res = await fetch('/api/market/daily-gainers');
      const data = await res.json();
      if (data.success && data.gainers) {
        this.renderDailyGainers(data.gainers);
      }
    } catch (err) {
      console.warn('Daily gainers fetch error:', err);
    }
  }

  renderDailyGainers(coins) {
    const grid = document.getElementById('coinPnlGrid');
    if (!grid) return;

    grid.innerHTML = coins.map(c => {
      const pnlClass = c.change24hPercent >= 0 ? 'up' : 'down';
      const pnlPrefix = c.change24hPercent >= 0 ? '+' : '';
      return `
        <div class="stat-card" onclick="window.launchpadManager.openTokenDetail('${c.symbol}')" style="cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${c.imageUrl}" class="token-avatar-sm" alt="${c.symbol}">
              <div>
                <div style="font-weight: 700; font-size: 14px; color: #fff;">${c.name}</div>
                <div style="font-size: 11px; color: var(--text-muted);">$${c.symbol} • ${c.chain}</div>
              </div>
            </div>
            <div class="stat-val ${pnlClass}" style="font-size: 16px;">
              ${pnlPrefix}${c.change24hPercent.toFixed(1)}%
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-family: var(--font-mono); color: var(--text-secondary); border-top: 1px dashed var(--border-color); padding-top: 8px;">
            <span>Price: $${c.currentPriceUsd.toFixed(8)}</span>
            <span>Vol: $${Math.floor(c.volume24hUsd).toLocaleString()}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /* =========================================================
     NEW COINS FEED
  ========================================================= */
  async fetchNewListings() {
    try {
      const res = await fetch('/api/market/new-listings');
      const data = await res.json();
      if (data.success && data.newListings) {
        this.renderNewListings(data.newListings);
      }
    } catch (err) {
      console.warn('New listings fetch error:', err);
    }
  }

  renderNewListings(coins) {
    const grid = document.getElementById('newListingsGrid');
    if (!grid) return;

    grid.innerHTML = coins.map(c => `
      <div class="token-card" onclick="window.launchpadManager.openTokenDetail('${c.symbol}')">
        <div class="card-header-row">
          <img src="${c.imageUrl}" class="token-avatar" alt="${c.name}">
          <div class="card-title-meta">
            <div class="token-title">${c.name}</div>
            <div class="token-symbol">$${c.symbol}</div>
          </div>
          <div class="chain-tag ${c.chain === 'Solana' ? 'sol' : 'base'}">
            ${c.chain === 'Solana' ? '⚡ SOL' : '🔵 BASE'}
          </div>
        </div>
        <p class="token-snippet">${c.description}</p>
        <div class="card-stats-grid">
          <div class="stat-cell">
            <span class="cell-label">MARKET CAP</span>
            <span class="cell-val highlight">$${Math.floor(c.marketCapUsd).toLocaleString()}</span>
          </div>
          <div class="stat-cell">
            <span class="cell-label">DEV LOCK</span>
            <span class="cell-val safe">${c.devLockedPercent}%</span>
          </div>
        </div>
        <div class="card-progress-bar-bg">
          <div class="card-progress-bar-fill" style="width: ${c.bondingCurveProgressPercent}%;"></div>
        </div>
      </div>
    `).join('');
  }

  /* =========================================================
     TRANSPARENT PROOF OF RESERVES TREASURY
  ========================================================= */
  async fetchTreasuryReserves() {
    try {
      const res = await fetch('/api/treasury/public-reserves');
      const data = await res.json();
      if (data.success) {
        this.renderTreasuryReserves(data);
      }
    } catch (err) {
      console.warn('Treasury reserves fetch error:', err);
    }
  }

  renderTreasuryReserves(data) {
    const totalEl = document.getElementById('treasuryTotalReservesUsd');
    const burnTokensEl = document.getElementById('treasuryTotalBurnedTokens');
    const burnUsdEl = document.getElementById('treasuryTotalBurnedUsd');
    const tableBody = document.getElementById('treasuryHoldingsTableBody');
    const baseAddrEl = document.getElementById('treasuryBaseAddr');
    const solAddrEl = document.getElementById('treasurySolAddr');

    if (totalEl) totalEl.textContent = `$${data.totalReservesUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (burnTokensEl) burnTokensEl.textContent = `${data.burnStats.totalTokensBurned.toLocaleString()} TOKENS`;
    if (burnUsdEl) burnUsdEl.textContent = `$${data.burnStats.totalUsdValueBurned.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    if (baseAddrEl) {
      baseAddrEl.textContent = data.publicWallets.baseL2.address;
      baseAddrEl.onclick = () => window.open(data.publicWallets.baseL2.explorerUrl, '_blank');
    }
    if (solAddrEl) {
      solAddrEl.textContent = data.publicWallets.solana.address;
      solAddrEl.onclick = () => window.open(data.publicWallets.solana.explorerUrl, '_blank');
    }

    if (tableBody && data.tokenHoldings) {
      tableBody.innerHTML = data.tokenHoldings.map(h => `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${h.icon}" class="token-avatar-sm" alt="${h.symbol}">
              <div>
                <span style="font-weight: 700; color: #fff;">${h.name}</span>
                <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">($${h.symbol})</span>
              </div>
            </div>
          </td>
          <td style="font-family: var(--font-mono); color: #fff;">${h.amount.toLocaleString()} ${h.symbol}</td>
          <td style="font-family: var(--font-mono); color: var(--brand-blue-light);">$${h.priceUsd >= 1 ? h.priceUsd.toFixed(2) : h.priceUsd.toFixed(8)}</td>
          <td style="font-family: var(--font-mono); font-weight: 800; color: #fff;">$${h.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td style="font-family: var(--font-mono); color: ${h.change24h >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}; font-weight: 700;">
            ${h.change24h >= 0 ? '+' : ''}${h.change24h}%
          </td>
        </tr>
      `).join('');
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

    if (kingName) kingName.innerHTML = `${king.name} (<span id="kingSymbol">$${king.symbol}</span>)`;
    if (kingDesc) kingDesc.textContent = king.description;
    if (kingImg) kingImg.src = king.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200';
    if (kingMcap) kingMcap.textContent = `$${king.marketCapUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (kingProgress) kingProgress.textContent = `${king.bondingCurveProgressPercent}% ($69,420 Target)`;
    if (kingProgressBar) kingProgressBar.style.width = `${Math.min(100, king.bondingCurveProgressPercent)}%`;
    if (kingFeePool) kingFeePool.textContent = `$${king.totalFeePoolDistributedUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (kingChain) kingChain.textContent = king.chain === 'Solana' ? '⚡ Solana' : '🔵 Base L2';

    const btnKing = document.getElementById('btnKingQuickBuy');
    if (btnKing) {
      btnKing.textContent = `⚡ Quick Trade $${king.symbol}`;
      btnKing.onclick = () => this.openTokenDetail(king.symbol);
    }
  }

  /* =========================================================
     DISCOVERY FEED
  ========================================================= */
  async fetchTokens() {
    try {
      const res = await fetch(`/api/tokens/feed?filter=${this.activeFilter}&chain=${this.activeChain}`);
      const data = await res.json();
      if (data.success) {
        this.tokens = data.tokens;
        this.renderTokenGrid();
      }
    } catch (err) {
      console.warn('Tokens feed fetch error:', err);
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
        <div class="empty-state-box" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="font-size: 32px; margin-bottom: 12px;">🔍</div>
          <h3 style="font-size: 16px; margin-bottom: 6px;">No sovereign coins match your criteria</h3>
          <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 18px;">Be the first to launch an un-ruggable coin on Solana or Base L2.</p>
          <button class="btn btn-launch" onclick="window.launchpadManager.openDeployModal()">🚀 Launch a New Coin</button>
        </div>
      `;
      return;
    }

    this.tokenGrid.innerHTML = filtered.map(t => {
      const isSol = t.chain === 'Solana';
      const isGraduated = t.status === 'GRADUATED';
      const devBadge = t.devLockedPercent >= 80
        ? `<span class="badge-tag safe">🛡️ ${t.devLockedPercent}% DEV LOCKED</span>`
        : `<span class="badge-tag warn">⚠️ ${t.devLockedPercent}% DEV LOCKED</span>`;

      return `
        <div class="token-card ${t.isKing ? 'king-card-glow' : ''}" onclick="window.launchpadManager.openTokenDetail('${t.symbol}')">
          <div class="card-header-row">
            <img src="${t.imageUrl}" alt="${t.name}" class="token-avatar">
            <div class="card-title-meta">
              <div class="token-title">${t.name}</div>
              <div class="token-symbol">$${t.symbol}</div>
            </div>
            <div class="chain-tag ${isSol ? 'sol' : 'base'}">${isSol ? '⚡ SOL' : '🔵 BASE'}</div>
          </div>

          <p class="token-snippet">${t.description}</p>

          <div class="card-stats-grid">
            <div class="stat-cell">
              <span class="cell-label">MARKET CAP</span>
              <span class="cell-val highlight">$${Math.floor(t.marketCapUsd).toLocaleString()}</span>
            </div>
            <div class="stat-cell">
              <span class="cell-label">PROGRESS</span>
              <span class="cell-val ${isGraduated ? 'up' : ''}">${isGraduated ? '🚀 GRADUATED' : t.bondingCurveProgressPercent + '%'}</span>
            </div>
            <div class="stat-cell">
              <span class="cell-label">30% HOLDER DIVS</span>
              <span class="cell-val up">$${t.totalFeePoolDistributedUsd.toFixed(2)}</span>
            </div>
            <div class="stat-cell">
              <span class="cell-label">SAFETY SCORE</span>
              <span class="cell-val safe">${t.safetyScore}/100</span>
            </div>
          </div>

          <div class="card-progress-bar-bg">
            <div class="card-progress-bar-fill" style="width: ${Math.min(100, t.bondingCurveProgressPercent)}%;"></div>
          </div>

          <div class="card-footer-row">
            ${devBadge}
            <span class="trade-count-tag">${t.tradeCount || 0} trades</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /* =========================================================
     DETAIL & SWAP MODAL
  ========================================================= */
  async openTokenDetail(symbol, pushUrl = true) {
    try {
      const res = await fetch(`/api/tokens/${symbol}`);
      const data = await res.json();
      if (!data.success) {
        if (window.showToast) window.showToast('Failed to load token details', 'error');
        return;
      }

      this.activeToken = data.token;
      this.renderDetailModal(data.token, data.trades);
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
    const name = document.getElementById('detailTokenName');
    const symbol = document.getElementById('detailTokenSymbol');
    const chain = document.getElementById('detailTokenChain');
    const dev = document.getElementById('detailTokenDev');
    const price = document.getElementById('detailTokenPrice');
    const mcap = document.getElementById('detailTokenMcap');
    const fees = document.getElementById('detailTokenFees');
    const curveBar = document.getElementById('detailCurveBar');
    const curvePct = document.getElementById('detailCurvePercent');
    const safety = document.getElementById('detailSafetyScore');
    const currTag = document.getElementById('detailInputCurrencyTag');

    if (img) img.src = token.imageUrl;
    if (name) name.textContent = token.name;
    if (symbol) symbol.textContent = `$${token.symbol}`;
    if (chain) chain.textContent = token.chain === 'Solana' ? '⚡ Solana' : '🔵 Base L2';
    if (dev) dev.textContent = `Created by ${token.creator.substring(0, 8)}... (${token.devLockedPercent}% Dev Vesting Locked)`;
    if (price) price.textContent = `$${token.currentPriceUsd.toFixed(8)}`;
    if (mcap) mcap.textContent = `$${Math.floor(token.marketCapUsd).toLocaleString()}`;
    if (fees) fees.textContent = `$${token.totalFeePoolDistributedUsd.toFixed(2)}`;
    if (curveBar) curveBar.style.width = `${Math.min(100, token.bondingCurveProgressPercent)}%`;
    if (curvePct) curvePct.textContent = `${token.bondingCurveProgressPercent}%`;
    if (safety) safety.textContent = `SCORE: ${token.safetyScore}/100 (A+)`;
    if (currTag) currTag.textContent = token.chain === 'Solana' ? 'SOL' : 'ETH';

    this.setTradeMode('BUY');
    this.renderTradeTape(trades || []);
  }

  setTradeMode(mode) {
    this.tradeMode = mode;
    if (!this.activeToken) return;

    const sym = this.activeToken.symbol;
    const curr = this.activeToken.chain === 'Solana' ? 'SOL' : 'ETH';
    const inputLabel = document.getElementById('detailSwapInputLabel');
    const currTag = document.getElementById('detailInputCurrencyTag');

    if (mode === 'BUY') {
      if (this.detailTabBuy) this.detailTabBuy.classList.add('active');
      if (this.detailTabSell) this.detailTabSell.classList.remove('active');
      if (this.btnExecuteSwap) {
        this.btnExecuteSwap.className = 'btn btn-action-buy';
        this.btnExecuteSwap.textContent = `Buy $${sym}`;
      }
      if (inputLabel) inputLabel.textContent = `Amount in ${curr}`;
      if (currTag) currTag.textContent = curr;
    } else {
      if (this.detailTabBuy) this.detailTabBuy.classList.remove('active');
      if (this.detailTabSell) this.detailTabSell.classList.add('active');
      if (this.btnExecuteSwap) {
        this.btnExecuteSwap.className = 'btn btn-action-sell';
        this.btnExecuteSwap.textContent = `Sell $${sym}`;
      }
      if (inputLabel) inputLabel.textContent = `Amount in $${sym}`;
      if (currTag) currTag.textContent = sym;
    }
    this.updateSwapEstimate();
  }

  updateSwapEstimate() {
    if (!this.activeToken || !this.detailSwapAmount) return;
    const amt = parseFloat(this.detailSwapAmount.value) || 0;
    const estBox = document.getElementById('detailSwapEstimate');
    if (!estBox) return;

    if (amt <= 0) {
      estBox.innerHTML = `You will receive approx: <strong>0 $${this.activeToken.symbol}</strong>`;
      return;
    }

    const price = this.activeToken.currentPriceUsd;
    const solPrice = 150.00;

    if (this.tradeMode === 'BUY') {
      const usdIn = amt * solPrice;
      const tokensOut = usdIn / (price * 1.005);
      estBox.innerHTML = `You will receive approx: <strong>${Math.floor(tokensOut).toLocaleString()} $${this.activeToken.symbol}</strong> (0.25% Treasury, 0.25% Burn)`;
    } else {
      const usdOut = amt * price * 0.995;
      const solOut = usdOut / solPrice;
      estBox.innerHTML = `You will receive approx: <strong>${solOut.toFixed(4)} SOL / ETH</strong>`;
    }
  }

  async executeSwap() {
    if (!this.activeToken) return;
    const amt = parseFloat(this.detailSwapAmount.value);
    if (!amt || amt <= 0) {
      if (window.showToast) window.showToast('Please enter an amount to trade.', 'error');
      return;
    }

    const userAddr = window.walletEngine ? window.walletEngine.activeAddress : "0xCalabiTrader";

    if (window.walletEngine) {
      const ofacCheck = window.walletEngine.screenAddressLocally(userAddr);
      if (!ofacCheck.allowed) {
        if (window.showToast) window.showToast(`Transaction rejected: ${ofacCheck.detail}`, 'error');
        return;
      }
    }

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
        if (window.showToast) window.showToast(data.message, 'success');
        this.openTokenDetail(this.activeToken.symbol);
        this.fetchTokens();
        this.fetchKing();
        this.detailSwapAmount.value = '';

        if (data.graduated) {
          this.playAudioSfx('graduation');
          if (window.showToast) window.showToast(`🎉 $${this.activeToken.symbol} REACHED $69,420 AND GRADUATED TO DEX!`, 'success');
        }
      } else {
        if (window.showToast) window.showToast(data.error, 'error');
      }
    } catch (err) {
      if (window.showToast) window.showToast('Swap execution failed.', 'error');
    }
  }

  renderTradeTape(trades) {
    const tbody = document.getElementById('detailTradeTape');
    if (!tbody) return;

    if (trades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 12px;">No trades yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = trades.map(tr => `
      <tr>
        <td style="color: var(--text-muted);">${tr.time}</td>
        <td style="color: ${tr.type === 'BUY' ? 'var(--market-green)' : 'var(--market-red)'}; font-weight: 700;">${tr.type}</td>
        <td>${tr.amountSol}</td>
        <td>${Math.floor(tr.amountTokens).toLocaleString()}</td>
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

          const badge = document.createElement('span');
          badge.className = 'trollbox-badge';
          badge.textContent = m.badge;

          const author = document.createElement('span');
          author.className = 'trollbox-author';
          author.textContent = m.user + ':';

          const text = document.createElement('span');
          text.className = 'trollbox-text';
          text.textContent = m.text; // Text content prevents XSS

          div.appendChild(badge);
          div.appendChild(author);
          div.appendChild(text);
          feed.appendChild(div);
        });
        feed.scrollTop = feed.scrollHeight;
      }
    } catch (err) {
      console.warn('Trollbox load error:', err);
    }
  }

  async sendTrollboxMessage() {
    if (!this.activeToken || !this.trollboxInput) return;
    const text = this.trollboxInput.value.trim();
    if (!text) return;

    const user = window.walletEngine && window.walletEngine.activeAddress
      ? `Trader_${window.walletEngine.activeAddress.substring(2, 6)}`
      : "AnonWhale";

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
     MODAL CONTROLS & WALLET
  ========================================================= */
  openDeployModal() {
    if (this.deployModal) this.deployModal.classList.add('active');
  }

  closeDeployModal() {
    if (this.deployModal) this.deployModal.classList.remove('active');
  }

  async handleDeploySubmit(e) {
    e.preventDefault();
    const name = document.getElementById('newTokenName').value;
    const symbol = document.getElementById('newTokenSymbol').value;
    const description = document.getElementById('newTokenDesc').value;
    const imageUrl = document.getElementById('newTokenImage').value;
    const devLockPercent = document.getElementById('newDevLockPercent').value;
    const chainRadio = document.querySelector('input[name="deployChain"]:checked');
    const chain = chainRadio ? chainRadio.value : "Solana";

    const userAddr = window.walletEngine ? window.walletEngine.activeAddress : "0xCalabiCreator";

    try {
      const res = await fetch('/api/tokens/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, symbol, description, imageUrl, creator: userAddr, chain, devLockPercent })
      });
      const data = await res.json();

      if (data.success) {
        if (window.showToast) window.showToast(`$${data.token.symbol} Deployed with Proof-of-Skin!`, 'success');
        this.closeDeployModal();
        document.getElementById('deployTokenForm').reset();
        this.fetchTokens();
        this.openTokenDetail(data.token.symbol);
      } else {
        if (window.showToast) window.showToast(data.error, 'error');
      }
    } catch (err) {
      if (window.showToast) window.showToast('Error deploying coin.', 'error');
    }
  }

  openWalletModal() {
    if (this.walletModal) this.walletModal.classList.add('active');
  }

  closeWalletModal() {
    if (this.walletModal) this.walletModal.classList.remove('active');
  }

  openProfileModal() {
    if (this.profileModal) this.profileModal.classList.add('active');
  }

  closeProfileModal() {
    if (this.profileModal) this.profileModal.classList.remove('active');
  }

  openSendModal() {
    if (this.sendModal) this.sendModal.classList.add('active');
  }

  closeSendModal() {
    if (this.sendModal) this.sendModal.classList.remove('active');
  }

  openReceiveModal() {
    if (this.receiveModal) this.receiveModal.classList.add('active');
  }

  closeReceiveModal() {
    if (this.receiveModal) this.receiveModal.classList.remove('active');
  }

  async handleSendSubmit(e) {
    e.preventDefault();
    const recipient = document.getElementById('sendRecipientInput').value;
    const token = document.getElementById('sendTokenSelect').value;
    const amount = document.getElementById('sendAmountInput').value;

    try {
      if (window.walletEngine) {
        await window.walletEngine.executeSend(recipient, token, amount);
        this.closeSendModal();
        document.getElementById('sendFundsForm').reset();
      }
    } catch (err) {
      if (window.showToast) window.showToast(err.message, 'error');
    }
  }
}

window.launchpadManager = null;
document.addEventListener('DOMContentLoaded', () => {
  window.launchpadManager = new CalabiLaunchpadManager();
});
