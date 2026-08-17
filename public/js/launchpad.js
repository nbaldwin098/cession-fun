/**
 * Cession.fun — Pump.fun Exact Multi-Page & Sidebar Drawer Controller
 * Supports: Board/Coins, Livestreams, Live Theatre Studio, Leaderboard, Profile, and Token Detail Views
 */

class CessionLaunchpadManager {
  constructor() {
    this.tokenGrid = document.getElementById('tokenGrid');
    this.searchInput = document.getElementById('tokenSearchInput');
    this.sortSelect = document.getElementById('selectSortOrder');
    this.sortDirSelect = document.getElementById('selectSortDirection');
    this.toggleAnimations = document.getElementById('toggleLiveAnimations');
    this.toggleNsfw = document.getElementById('toggleIncludeNsfw');
    
    this.activeSort = 'bump';
    this.activeDir = 'desc';
    this.tokens = [];
    this.activeToken = null;
    this.activeTab = 'thread';
    this.currentView = 'board'; // 'board' | 'live' | 'liveTheatre' | 'leaderboard' | 'profile'
    this.theatreCanvasAnimId = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.bindSidebarAndNavigation();
    this.fetchTokens().then(() => {
      this.checkInitialRoute();
    });
    this.fetchGlobalTrades();

    // Periodic polling to keep prices and tickers hot
    setInterval(() => {
      this.fetchTokens(false);
      this.fetchGlobalTrades();
    }, 6000);
  }

  checkInitialRoute() {
    const path = window.location.pathname;
    if (path === '/live' || path === '/livestreams') {
      this.switchPage('live');
    } else if (path === '/leaderboard' || path === '/rankings') {
      this.switchPage('leaderboard');
    } else if (path === '/profile' || path === '/portfolio') {
      this.switchPage('profile');
    } else if (path.startsWith('/token/') || path.startsWith('/coin/')) {
      const sym = path.split('/')[2];
      if (sym) {
        this.openTokenDetail(sym);
      }
    } else if (path === '/how-it-works') {
      const modal = document.getElementById('howItWorksModal');
      if (modal) modal.style.display = 'flex';
    }
  }

  bindSidebarAndNavigation() {
    const btnOpenSidebar = document.getElementById('btnOpenSidebar');
    const btnCloseSidebar = document.getElementById('btnCloseSidebar');
    const sidebarDrawer = document.getElementById('sidebarDrawer');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    const openDrawer = () => {
      if (sidebarDrawer) sidebarDrawer.classList.add('active');
      if (sidebarOverlay) sidebarOverlay.classList.add('active');
    };

    const closeDrawer = () => {
      if (sidebarDrawer) sidebarDrawer.classList.remove('active');
      if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    };

    if (btnOpenSidebar) btnOpenSidebar.addEventListener('click', openDrawer);
    if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeDrawer);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeDrawer);

    // Sidebar navigation links
    const menuBoard = document.getElementById('menuNavBoard');
    const menuLive = document.getElementById('menuNavLive');
    const menuLeaderboard = document.getElementById('menuNavLeaderboard');
    const menuFollowing = document.getElementById('menuNavFollowing');
    const menuProfile = document.getElementById('menuNavProfile');
    const menuHowItWorks = document.getElementById('menuNavHowItWorks');

    if (menuBoard) menuBoard.addEventListener('click', () => { this.switchPage('board'); closeDrawer(); });
    if (menuLive) menuLive.addEventListener('click', () => { this.switchPage('live'); closeDrawer(); });
    if (menuLeaderboard) menuLeaderboard.addEventListener('click', () => { this.switchPage('leaderboard'); closeDrawer(); });
    if (menuFollowing) menuFollowing.addEventListener('click', () => { this.switchPage('board'); closeDrawer(); this.toast('Showing followed coins', 'info'); });
    if (menuProfile) menuProfile.addEventListener('click', () => { this.switchPage('profile'); closeDrawer(); });
    if (menuHowItWorks) menuHowItWorks.addEventListener('click', () => {
      closeDrawer();
      const modal = document.getElementById('howItWorksModal');
      if (modal) modal.style.display = 'flex';
    });

    // Top Header links
    const brandLink = document.getElementById('brandHomeLink');
    const btnHeaderLive = document.getElementById('btnHeaderLive');
    const btnHeaderLeaderboard = document.getElementById('btnHeaderLeaderboard');
    const btnOpenHowItWorks = document.getElementById('btnOpenHowItWorks');
    const btnReadyToPump = document.getElementById('btnReadyToPump');
    const btnCloseHowItWorks = document.getElementById('btnCloseHowItWorks');

    if (brandLink) brandLink.addEventListener('click', (e) => { e.preventDefault(); this.switchPage('board'); });
    if (btnHeaderLive) btnHeaderLive.addEventListener('click', (e) => { e.preventDefault(); this.switchPage('live'); });
    if (btnHeaderLeaderboard) btnHeaderLeaderboard.addEventListener('click', (e) => { e.preventDefault(); this.switchPage('leaderboard'); });
    
    if (btnOpenHowItWorks) {
      btnOpenHowItWorks.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = document.getElementById('howItWorksModal');
        if (modal) modal.style.display = 'flex';
      });
    }

    if (btnCloseHowItWorks) {
      btnCloseHowItWorks.addEventListener('click', () => {
        const modal = document.getElementById('howItWorksModal');
        if (modal) modal.style.display = 'none';
      });
    }

    if (btnReadyToPump) {
      btnReadyToPump.addEventListener('click', () => {
        const modal = document.getElementById('howItWorksModal');
        if (modal) modal.style.display = 'none';
        this.switchPage('board');
      });
    }

    // Go Live Modal Trigger
    const btnOpenStreamStudio = document.getElementById('btnOpenStreamStudio');
    if (btnOpenStreamStudio) {
      btnOpenStreamStudio.addEventListener('click', () => {
        this.toast('Stream Studio Initialized! Live broadcasting enabled for verified creators.', 'success');
        this.openLiveTheatre('CESS', '🔥 PUMPING $CESS TO RAYDIUM GRADUATION TODAY!', '0x88f...1a2', 1420);
      });
    }

    // Live Theatre Chat submission
    const formTheatreChat = document.getElementById('formTheatreChat');
    const theatreChatInput = document.getElementById('theatreChatInput');
    const theatreChatStream = document.getElementById('theatreChatStream');
    if (formTheatreChat && theatreChatInput && theatreChatStream) {
      formTheatreChat.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = theatreChatInput.value.trim();
        if (!msg) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = 'stream-chat-msg';
        const user = window.walletEngine && window.walletEngine.activeAddress 
          ? window.walletEngine.activeAddress.substring(0, 6) 
          : 'anon_trader';
        msgDiv.innerHTML = `<span class="stream-chat-author">${user}:</span><span>${this.escapeHtml(msg)}</span>`;
        theatreChatStream.appendChild(msgDiv);
        theatreChatStream.scrollTop = theatreChatStream.scrollHeight;
        theatreChatInput.value = '';
      });
    }

    // Wallet pill click
    const walletPill = document.getElementById('walletConnectedPill');
    if (walletPill) {
      walletPill.addEventListener('click', (e) => {
        if (e.target.id === 'btnDisconnectWallet') return;
        this.switchPage('profile');
      });
    }

    // Leaderboard Sub-Tabs
    const tabTraders = document.getElementById('tabTopTraders');
    const tabCreators = document.getElementById('tabTopCreators');
    const tabGrad = document.getElementById('tabGraduatedCoins');
    if (tabTraders && tabCreators && tabGrad) {
      tabTraders.addEventListener('click', () => {
        tabTraders.classList.add('active');
        tabCreators.classList.remove('active');
        tabGrad.classList.remove('active');
        this.renderLeaderboardTraders();
      });
      tabCreators.addEventListener('click', () => {
        tabCreators.classList.add('active');
        tabTraders.classList.remove('active');
        tabGrad.classList.remove('active');
        this.renderLeaderboardCreators();
      });
      tabGrad.addEventListener('click', () => {
        tabGrad.classList.add('active');
        tabTraders.classList.remove('active');
        tabCreators.classList.remove('active');
        this.renderLeaderboardGraduated();
      });
    }

    // Profile Sub-Tabs
    const tabProfHeld = document.getElementById('tabProfileHeld');
    const tabProfCreated = document.getElementById('tabProfileCreated');
    const tabProfHist = document.getElementById('tabProfileHistory');
    if (tabProfHeld && tabProfCreated && tabProfHist) {
      tabProfHeld.addEventListener('click', () => {
        tabProfHeld.classList.add('active');
        tabProfCreated.classList.remove('active');
        tabProfHist.classList.remove('active');
        this.renderProfileHoldings();
      });
      tabProfCreated.addEventListener('click', () => {
        tabProfCreated.classList.add('active');
        tabProfHeld.classList.remove('active');
        tabProfHist.classList.remove('active');
        this.renderProfileCreated();
      });
      tabProfHist.addEventListener('click', () => {
        tabProfHist.classList.add('active');
        tabProfHeld.classList.remove('active');
        tabProfCreated.classList.remove('active');
        this.renderProfileHistory();
      });
    }

    // Browser back/forward navigation
    window.addEventListener('popstate', () => {
      this.checkInitialRoute();
    });
  }

  switchPage(viewName) {
    this.currentView = viewName;
    const views = {
      board: document.getElementById('viewBoard'),
      live: document.getElementById('viewLive'),
      liveTheatre: document.getElementById('viewLiveTheatre'),
      leaderboard: document.getElementById('viewLeaderboard'),
      profile: document.getElementById('viewProfile')
    };

    Object.keys(views).forEach(k => {
      if (views[k]) {
        if (k === viewName) views[k].classList.add('active');
        else views[k].classList.remove('active');
      }
    });

    // Update active state in sidebar
    const menuItems = {
      board: document.getElementById('menuNavBoard'),
      live: document.getElementById('menuNavLive'),
      leaderboard: document.getElementById('menuNavLeaderboard'),
      profile: document.getElementById('menuNavProfile')
    };
    Object.keys(menuItems).forEach(k => {
      if (menuItems[k]) {
        if (k === viewName) menuItems[k].classList.add('active');
        else menuItems[k].classList.remove('active');
      }
    });

    // Close detail modal if open
    const detailModal = document.getElementById('tokenDetailModal');
    if (detailModal) detailModal.style.display = 'none';

    // Stop canvas animation if navigating away from theatre
    if (viewName !== 'liveTheatre' && this.theatreCanvasAnimId) {
      cancelAnimationFrame(this.theatreCanvasAnimId);
      this.theatreCanvasAnimId = null;
    }

    // Update browser URL
    const route = viewName === 'board' ? '/' : `/${viewName}`;
    window.history.pushState({}, '', route);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Populate data based on view
    if (viewName === 'leaderboard') {
      this.renderLeaderboardTraders();
    } else if (viewName === 'profile') {
      this.updateProfileView();
    }
  }

  openLiveTheatre(symbol, title, host, viewers) {
    this.switchPage('liveTheatre');
    
    const titleEl = document.getElementById('theatreStreamTitle');
    const hostEl = document.getElementById('theatreStreamHost');
    const coinEl = document.getElementById('theatreStreamCoin');
    const viewerBadge = document.getElementById('theatreViewerBadge');
    const btnDetail = document.getElementById('btnTheatreOpenDetail');

    if (titleEl) titleEl.textContent = title;
    if (hostEl) hostEl.textContent = host;
    if (coinEl) coinEl.textContent = `$${symbol}`;
    if (viewerBadge) viewerBadge.textContent = `👥 ${viewers.toLocaleString()} viewers`;
    if (btnDetail) {
      btnDetail.onclick = () => this.openTokenDetail(symbol);
    }

    // Start animated visualizer on canvas
    this.startCanvasVisualizer();
  }

  startCanvasVisualizer() {
    const canvas = document.getElementById('streamVisualizerCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let tick = 0;

    const render = () => {
      tick++;
      ctx.fillStyle = '#06090e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid background effect
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Animated Sound Wave / Stream waveform
      const barCount = 48;
      const barWidth = canvas.width / barCount;
      for (let i = 0; i < barCount; i++) {
        const height = 40 + Math.sin(tick * 0.05 + i * 0.3) * 35 + Math.cos(tick * 0.08 + i * 0.2) * 25;
        const x = i * barWidth;
        const y = canvas.height / 2 - height / 2;
        
        ctx.fillStyle = i % 2 === 0 ? '#86efac' : '#22c55e';
        ctx.shadowColor = 'rgba(134, 239, 172, 0.5)';
        ctx.shadowBlur = 8;
        ctx.fillRect(x + 2, y, barWidth - 4, height);
      }
      ctx.shadowBlur = 0;

      // Center Stream Watermark
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LIVE STREAM FEED • BROADCASTING', canvas.width / 2, 70);

      if (this.currentView === 'liveTheatre') {
        this.theatreCanvasAnimId = requestAnimationFrame(render);
      }
    };
    render();
  }

  updateProfileView() {
    const addr = window.walletEngine && window.walletEngine.activeAddress 
      ? window.walletEngine.activeAddress 
      : '0x88f4b23a910cd99e1a2f0093ba4210e76a011a2';
    
    const addrEl = document.getElementById('profileAddressFull');
    const solEl = document.getElementById('profileSolBalance');
    const cessEl = document.getElementById('profileCessBalance');
    const avatarEl = document.getElementById('profileAvatar');

    if (addrEl) addrEl.textContent = addr;
    if (avatarEl) avatarEl.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${addr}`;
    if (solEl && window.walletEngine) solEl.textContent = `${(window.walletEngine.balances.sol || 6.2).toFixed(2)} SOL`;
    if (cessEl && window.walletEngine) cessEl.textContent = `${(window.walletEngine.balances.cess || 250000).toLocaleString()} $CESS`;

    this.renderProfileHoldings();
  }

  renderProfileHoldings() {
    const thead = document.getElementById('profileThead');
    const tbody = document.getElementById('profileHoldingsBody');
    if (!tbody || !thead) return;

    thead.innerHTML = `
      <tr>
        <th>Coin</th>
        <th>Amount Held</th>
        <th>Value (SOL)</th>
        <th>PnL</th>
        <th>Action</th>
      </tr>
    `;

    tbody.innerHTML = `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="images/cession-logo.png" style="width: 20px; height: 20px; border-radius: 4px;" alt="CESS">
            <strong>$CESS (Cession)</strong>
          </div>
        </td>
        <td>250,000 $CESS</td>
        <td style="color: var(--pump-green); font-weight: 700;">6.25 SOL</td>
        <td style="color: var(--pump-green); font-weight: 700;">+248.5%</td>
        <td><button class="preset-pill" onclick="window.launchpadManager.openTokenDetail('CESS')">trade &rarr;</button></td>
      </tr>
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=100" style="width: 20px; height: 20px; border-radius: 4px;" alt="BFT">
            <strong>$BFT (Base Frog)</strong>
          </div>
        </td>
        <td>120,000 $BFT</td>
        <td style="color: var(--pump-green); font-weight: 700;">1.80 SOL</td>
        <td style="color: var(--pump-green); font-weight: 700;">+42.1%</td>
        <td><button class="preset-pill" onclick="window.launchpadManager.openTokenDetail('BFT')">trade &rarr;</button></td>
      </tr>
    `;
  }

  renderProfileCreated() {
    const thead = document.getElementById('profileThead');
    const tbody = document.getElementById('profileHoldingsBody');
    if (!tbody || !thead) return;

    thead.innerHTML = `
      <tr>
        <th>Coin</th>
        <th>Market Cap</th>
        <th>Bonding Curve</th>
        <th>Raydium Status</th>
        <th>Action</th>
      </tr>
    `;

    tbody.innerHTML = `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="images/cession-logo.png" style="width: 20px; height: 20px; border-radius: 4px;" alt="CESS">
            <strong>$CESS (Cession)</strong>
          </div>
        </td>
        <td style="color: var(--pump-green); font-weight: 700;">$58,240</td>
        <td>
          <div style="width: 100px; height: 6px; background: var(--bg-input); border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle; margin-right: 6px;">
            <div style="width: 84%; height: 100%; background: var(--pump-green);"></div>
          </div>
          <span>84%</span>
        </td>
        <td><span style="color: #fbbf24; font-weight: 700;">Approaching $69k Target</span></td>
        <td><button class="preset-pill" onclick="window.launchpadManager.openTokenDetail('CESS')">manage &rarr;</button></td>
      </tr>
    `;
  }

  renderProfileHistory() {
    const thead = document.getElementById('profileThead');
    const tbody = document.getElementById('profileHoldingsBody');
    if (!tbody || !thead) return;

    thead.innerHTML = `
      <tr>
        <th>Type</th>
        <th>Coin</th>
        <th>SOL Amount</th>
        <th>Tokens</th>
        <th>Time</th>
        <th>Tx Hash</th>
      </tr>
    `;

    tbody.innerHTML = `
      <tr>
        <td><span style="color: var(--pump-green); font-weight: 700;">BUY</span></td>
        <td><strong>$CESS</strong></td>
        <td>1.50 SOL</td>
        <td>60,000</td>
        <td>4m ago</td>
        <td><a href="#" style="color: var(--text-muted);">5x8...9b1</a></td>
      </tr>
      <tr>
        <td><span style="color: var(--pump-green); font-weight: 700;">BUY</span></td>
        <td><strong>$BFT</strong></td>
        <td>0.80 SOL</td>
        <td>32,000</td>
        <td>18m ago</td>
        <td><a href="#" style="color: var(--text-muted);">9k2...1fa</a></td>
      </tr>
    `;
  }

  renderLeaderboardTraders() {
    const thead = document.getElementById('leaderboardThead');
    const tbody = document.getElementById('leaderboardTableBody');
    if (!tbody || !thead) return;

    thead.innerHTML = `
      <tr>
        <th>Rank</th>
        <th>Trader</th>
        <th>24h Profit (SOL)</th>
        <th>24h Profit (USD)</th>
        <th>Win Rate</th>
        <th>Total Trades</th>
      </tr>
    `;

    tbody.innerHTML = `
      <tr>
        <td><span class="rank-badge rank-1">1</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="https://api.dicebear.com/7.x/identicon/svg?seed=top1" class="koth-creator-avatar" alt="Dev">
            <span style="font-weight: 700; color: #fff;">0x88f...1a2</span>
            <span style="background: var(--pump-green-dark); color: var(--pump-green); font-size: 10px; padding: 2px 6px; border-radius: 4px;">WHALE</span>
          </div>
        </td>
        <td style="color: var(--pump-green); font-weight: 700;">+148.50 SOL</td>
        <td style="color: var(--pump-green); font-weight: 700;">+$21,532.50</td>
        <td>84.2%</td>
        <td>142</td>
      </tr>
      <tr>
        <td><span class="rank-badge rank-2">2</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="https://api.dicebear.com/7.x/identicon/svg?seed=top2" class="koth-creator-avatar" alt="Dev">
            <span style="font-weight: 700; color: #fff;">0x42b...c91</span>
          </div>
        </td>
        <td style="color: var(--pump-green); font-weight: 700;">+92.10 SOL</td>
        <td style="color: var(--pump-green); font-weight: 700;">+$13,354.50</td>
        <td>78.0%</td>
        <td>98</td>
      </tr>
      <tr>
        <td><span class="rank-badge rank-3">3</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="https://api.dicebear.com/7.x/identicon/svg?seed=top3" class="koth-creator-avatar" alt="Dev">
            <span style="font-weight: 700; color: #fff;">0x91a...c01</span>
          </div>
        </td>
        <td style="color: var(--pump-green); font-weight: 700;">+64.30 SOL</td>
        <td style="color: var(--pump-green); font-weight: 700;">+$9,323.50</td>
        <td>71.5%</td>
        <td>64</td>
      </tr>
    `;
  }

  renderLeaderboardCreators() {
    const thead = document.getElementById('leaderboardThead');
    const tbody = document.getElementById('leaderboardTableBody');
    if (!tbody || !thead) return;

    thead.innerHTML = `
      <tr>
        <th>Rank</th>
        <th>Creator</th>
        <th>Total Raised (SOL)</th>
        <th>Graduated Coins</th>
        <th>Coins Created</th>
        <th>Total Volume</th>
      </tr>
    `;

    tbody.innerHTML = `
      <tr>
        <td><span class="rank-badge rank-1">1</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="https://api.dicebear.com/7.x/identicon/svg?seed=creator1" class="koth-creator-avatar" alt="Creator">
            <span style="font-weight: 700; color: #fff;">0x71a...e89</span>
            <span style="background: var(--pump-green-dark); color: var(--pump-green); font-size: 10px; padding: 2px 6px; border-radius: 4px;">TOP DEV</span>
          </div>
        </td>
        <td style="color: var(--pump-green); font-weight: 700;">412.00 SOL</td>
        <td>6</td>
        <td>8</td>
        <td>$540,200</td>
      </tr>
      <tr>
        <td><span class="rank-badge rank-2">2</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="https://api.dicebear.com/7.x/identicon/svg?seed=creator2" class="koth-creator-avatar" alt="Creator">
            <span style="font-weight: 700; color: #fff;">0x99a...01f</span>
          </div>
        </td>
        <td style="color: var(--pump-green); font-weight: 700;">280.50 SOL</td>
        <td>4</td>
        <td>5</td>
        <td>$320,100</td>
      </tr>
    `;
  }

  renderLeaderboardGraduated() {
    const thead = document.getElementById('leaderboardThead');
    const tbody = document.getElementById('leaderboardTableBody');
    if (!tbody || !thead) return;

    thead.innerHTML = `
      <tr>
        <th>Rank</th>
        <th>Coin</th>
        <th>Market Cap</th>
        <th>Raydium LP Burnt</th>
        <th>Time to Graduate</th>
        <th>Action</th>
      </tr>
    `;

    tbody.innerHTML = `
      <tr>
        <td><span class="rank-badge rank-1">1</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="images/cession-logo.png" style="width: 20px; height: 20px; border-radius: 4px;" alt="CESS">
            <strong>$CESS (Cession)</strong>
          </div>
        </td>
        <td style="color: var(--pump-green); font-weight: 700;">$69,420</td>
        <td><span style="color: var(--pump-green); font-weight: 700;">✓ $12,000 Burnt</span></td>
        <td>18 minutes</td>
        <td><button class="preset-pill" onclick="window.launchpadManager.openTokenDetail('CESS')">view coin &rarr;</button></td>
      </tr>
    `;
  }

  bindEvents() {
    // Search input
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.filterAndRenderTokens());
    }

    // Sort order dropdown
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', (e) => {
        this.activeSort = e.target.value;
        this.filterAndRenderTokens();
      });
    }

    // Sort direction dropdown
    if (this.sortDirSelect) {
      this.sortDirSelect.addEventListener('change', (e) => {
        this.activeDir = e.target.value;
        this.filterAndRenderTokens();
      });
    }

    // Start a new coin modal triggers
    const btnHeroDeploy = document.getElementById('btnOpenDeployHero');
    const btnCloseDeploy = document.getElementById('btnCloseDeployModal');
    const deployModal = document.getElementById('deployModal');
    const btnToggleMore = document.getElementById('btnToggleMoreDeployOptions');
    const deployMoreSection = document.getElementById('deployMoreOptionsSection');
    const deployForm = document.getElementById('deployCoinForm');

    if (btnHeroDeploy && deployModal) {
      btnHeroDeploy.addEventListener('click', (e) => {
        e.preventDefault();
        deployModal.style.display = 'flex';
      });
    }

    if (btnCloseDeploy && deployModal) {
      btnCloseDeploy.addEventListener('click', () => {
        deployModal.style.display = 'none';
      });
    }

    if (btnToggleMore && deployMoreSection) {
      btnToggleMore.addEventListener('click', () => {
        const isHidden = deployMoreSection.style.display === 'none';
        deployMoreSection.style.display = isHidden ? 'block' : 'none';
        btnToggleMore.textContent = isHidden ? '[hide extra options ▲]' : '[show more options ▼]';
      });
    }

    if (deployForm) {
      deployForm.addEventListener('submit', (e) => this.handleDeploySubmit(e));
    }

    // Token Detail Modal Close & Go Back
    const btnCloseDetail = document.getElementById('btnCloseDetailModal');
    const detailModal = document.getElementById('tokenDetailModal');
    if (btnCloseDetail && detailModal) {
      btnCloseDetail.addEventListener('click', () => {
        detailModal.style.display = 'none';
        window.history.pushState({}, '', '/');
      });
    }

    // Detail Tabs (Thread, Trades, Holders)
    const tabThread = document.getElementById('tabThread');
    const tabTrades = document.getElementById('tabTrades');
    const tabHolders = document.getElementById('tabHolders');

    if (tabThread && tabTrades && tabHolders) {
      tabThread.addEventListener('click', () => this.switchDetailTab('thread'));
      tabTrades.addEventListener('click', () => this.switchDetailTab('trades'));
      tabHolders.addEventListener('click', () => this.switchDetailTab('holders'));
    }

    // Post Reply Comment button
    const btnReply = document.getElementById('btnSubmitReply');
    if (btnReply) {
      btnReply.addEventListener('click', () => this.postComment());
    }

    // King of the Hill click to open token
    const kingCard = document.getElementById('kingHeroCard');
    if (kingCard) {
      kingCard.addEventListener('click', () => {
        if (this.tokens.length > 0) {
          const king = this.getKingOfTheHill();
          if (king) this.openTokenDetail(king.symbol);
        }
      });
    }
  }

  async fetchTokens(render = true) {
    try {
      const res = await fetch('/api/tokens');
      const data = await res.json();
      if (data.tokens) {
        this.tokens = data.tokens;
        if (render) {
          this.filterAndRenderTokens();
          this.renderKingOfTheHill();
        }
      }
    } catch (e) {
      console.warn('[CessionLaunchpad] Failed to fetch tokens:', e);
    }
  }

  async fetchGlobalTrades() {
    try {
      const res = await fetch('/api/trades/global');
      const data = await res.json();
      if (data.trades && data.trades.length > 0) {
        this.renderGlobalMarquee(data.trades);
      }
    } catch (e) {
      console.warn('[CessionLaunchpad] Failed to fetch marquee trades:', e);
    }
  }

  renderGlobalMarquee(trades) {
    const track = document.getElementById('globalTradeMarquee');
    if (!track) return;
    track.innerHTML = trades.slice(0, 15).map(t => `
      <div class="marquee-pill ${t.type.toLowerCase()}">
        ${t.account ? t.account.substring(0, 6) + '...' : '0x88f...'} ${t.type.toLowerCase()} ${t.solAmount || '0.5'} SOL of <strong>$${t.symbol}</strong>
      </div>
    `).join('');
  }

  filterAndRenderTokens() {
    if (!this.tokenGrid) return;
    const query = (this.searchInput ? this.searchInput.value : '').toLowerCase().trim();

    let filtered = this.tokens.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(query) || t.symbol.toLowerCase().includes(query);
      return matchesSearch;
    });

    // Sorting
    filtered.sort((a, b) => {
      let valA = 0, valB = 0;
      switch (this.activeSort) {
        case 'bump':
        case 'creation':
          valA = a.createdAt || 0;
          valB = b.createdAt || 0;
          break;
        case 'market_cap':
          valA = a.marketCapUsd || 0;
          valB = b.marketCapUsd || 0;
          break;
        case 'replies':
          valA = a.replyCount || 0;
          valB = b.replyCount || 0;
          break;
        case 'last_reply':
          valA = a.lastReplyAt || a.createdAt || 0;
          valB = b.lastReplyAt || b.createdAt || 0;
          break;
        default:
          valA = a.createdAt || 0;
          valB = b.createdAt || 0;
      }
      return this.activeDir === 'desc' ? valB - valA : valA - valB;
    });

    this.tokenGrid.innerHTML = filtered.map(t => this.renderTokenCardHtml(t)).join('');
  }

  renderTokenCardHtml(token) {
    const mcapFormatted = (token.marketCapUsd || 58240).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });

    const creatorShort = token.creatorAddress 
      ? token.creatorAddress.substring(0, 6) + '...' + token.creatorAddress.slice(-4)
      : '0x88f...1a2';

    const avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${token.creatorAddress || token.symbol}`;
    const tokenImg = token.imageUrl || 'images/cession-logo.png';

    return `
      <div class="token-card-pump" onclick="window.launchpadManager.openTokenDetail('${token.symbol}')">
        <img src="${tokenImg}" class="token-card-thumb" alt="${token.symbol}" onerror="this.src='images/cession-logo.png'">
        <div class="token-card-body">
          <div class="token-card-creator">
            <span>created by</span>
            <img src="${avatarUrl}" class="token-card-creator-avatar" alt="Avatar">
            <span>${creatorShort}</span>
          </div>
          <div class="token-card-mcap">market cap: ${mcapFormatted}</div>
          <div class="token-card-replies">replies: ${token.replyCount || 0}</div>
          <div class="token-card-title-desc">
            <strong>${this.escapeHtml(token.name)} [ticker: $${token.symbol}]</strong>: ${this.escapeHtml(token.description || '')}
          </div>
        </div>
      </div>
    `;
  }

  getKingOfTheHill() {
    if (this.tokens.length === 0) return null;
    return [...this.tokens].sort((a, b) => (b.marketCapUsd || 0) - (a.marketCapUsd || 0))[0];
  }

  renderKingOfTheHill() {
    const king = this.getKingOfTheHill();
    if (!king) return;

    const kingImg = document.getElementById('kingImg');
    const kingCreator = document.getElementById('kingCreator');
    const kingMcap = document.getElementById('kingMcap');
    const kingReplies = document.getElementById('kingReplies');
    const kingNameTicker = document.getElementById('kingNameTicker');
    const kingDesc = document.getElementById('kingDesc');

    if (kingImg) kingImg.src = king.imageUrl || 'images/cession-logo.png';
    if (kingCreator) kingCreator.textContent = king.creatorAddress ? king.creatorAddress.substring(0, 6) + '...' : '0x88f...1a2';
    if (kingMcap) kingMcap.textContent = `$${((king.marketCapUsd || 58240) / 1000).toFixed(1)}k`;
    if (kingReplies) kingReplies.textContent = king.replyCount || 42;
    if (kingNameTicker) kingNameTicker.textContent = `$${king.symbol} (${king.name})`;
    if (kingDesc) kingDesc.textContent = king.description || 'The sovereign fair launch liquidity engine.';
  }

  async openTokenDetail(symbol) {
    const token = this.tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase()) || {
      symbol: symbol,
      name: symbol,
      description: 'Sovereign bonding curve fair launch token.',
      marketCapUsd: 58240,
      currentPriceSol: 0.000000025,
      bondingCurvePercent: 84.0,
      replyCount: 18,
      creatorAddress: '0x88f4b23a910cd99e1a2f0093ba4210e76a011a2'
    };

    this.activeToken = token;
    if (window.tradingManager) {
      window.tradingManager.setActiveToken(token);
    }

    const modal = document.getElementById('tokenDetailModal');
    if (modal) modal.style.display = 'block';

    // Update Token Detail Headline
    const nameEl = document.getElementById('detailTokenName');
    const symEl = document.getElementById('detailTokenSymbol');
    const metaEl = document.getElementById('detailTokenMeta');
    const barEl = document.getElementById('detailProgressBar');
    const pctEl = document.getElementById('detailProgressPercent');
    const subtextEl = document.getElementById('detailProgressText');
    const coinImg = document.getElementById('detailCoinImg');
    const coinTitle = document.getElementById('detailCoinTitle');
    const coinDesc = document.getElementById('detailCoinDescription');

    if (nameEl) nameEl.textContent = token.name;
    if (symEl) symEl.textContent = `$${token.symbol}`;
    if (metaEl) metaEl.textContent = `created by ${token.creatorAddress ? token.creatorAddress.substring(0, 6) + '...' : '0x88f...1a2'} • 5m ago`;
    
    const progress = token.bondingCurvePercent || 84;
    if (barEl) barEl.style.width = `${progress}%`;
    if (pctEl) pctEl.textContent = `${progress.toFixed(0)}%`;
    if (subtextEl) {
      subtextEl.textContent = `graduate this coin to Raydium at $69,420 market cap. there is ${(progress * 0.25).toFixed(1)} SOL in the bonding curve.`;
    }

    if (coinImg) coinImg.src = token.imageUrl || 'images/cession-logo.png';
    if (coinTitle) coinTitle.textContent = `${token.name} ($${token.symbol})`;
    if (coinDesc) coinDesc.textContent = token.description || 'Sovereign fair launch on Cession.';

    // Initialize/Render TradingView Chart
    if (window.chartManager) {
      window.chartManager.loadTokenChart(token.symbol);
    }

    // Fetch comments and trades
    this.fetchComments(token.symbol);
    this.fetchTrades(token.symbol);
    this.fetchHolders(token.symbol);

    window.history.pushState({}, '', `/token/${token.symbol}`);
  }

  switchDetailTab(tabName) {
    this.activeTab = tabName;
    const tabThread = document.getElementById('tabThread');
    const tabTrades = document.getElementById('tabTrades');
    const tabHolders = document.getElementById('tabHolders');

    const paneThread = document.getElementById('paneThread');
    const paneTrades = document.getElementById('paneTrades');
    const paneHolders = document.getElementById('paneHolders');

    [tabThread, tabTrades, tabHolders].forEach(t => t && t.classList.remove('active'));
    [paneThread, paneTrades, paneHolders].forEach(p => p && (p.style.display = 'none'));

    if (tabName === 'thread') {
      if (tabThread) tabThread.classList.add('active');
      if (paneThread) paneThread.style.display = 'flex';
    } else if (tabName === 'trades') {
      if (tabTrades) tabTrades.classList.add('active');
      if (paneTrades) paneTrades.style.display = 'block';
    } else if (tabName === 'holders') {
      if (tabHolders) tabHolders.classList.add('active');
      if (paneHolders) paneHolders.style.display = 'block';
    }
  }

  async fetchComments(symbol) {
    const list = document.getElementById('commentsList');
    if (!list) return;

    try {
      const res = await fetch(`/api/tokens/${symbol}/comments`);
      const data = await res.json();
      const comments = data.comments || [
        { author: '0x88f...1a2', text: 'Dev locked 100% of supply in sovereign vault! PUMP!', createdAt: Date.now() - 300000 },
        { author: '0x42b...c91', text: 'Raydium graduation incoming today! 🚀', createdAt: Date.now() - 600000 }
      ];

      list.innerHTML = comments.map(c => `
        <div class="comment-card">
          <div class="comment-header">
            <img src="https://api.dicebear.com/7.x/identicon/svg?seed=${c.author}" class="comment-avatar" alt="Avatar">
            <span>${c.author}</span>
            <span style="color: var(--text-muted); margin-left: auto;">${this.timeAgo(c.createdAt)}</span>
          </div>
          <div class="comment-text">${this.escapeHtml(c.text)}</div>
          ${c.imageUrl ? `<img src="${c.imageUrl}" class="comment-meme-img" alt="Meme">` : ''}
        </div>
      `).join('');
    } catch (e) {
      console.warn('Failed to fetch comments', e);
    }
  }

  async postComment() {
    if (!this.activeToken) return;
    const textInput = document.getElementById('replyCommentText');
    const imgInput = document.getElementById('replyImageUrl');
    const text = textInput ? textInput.value.trim() : '';
    const imageUrl = imgInput ? imgInput.value.trim() : '';

    if (!text) {
      this.toast('Please write a comment', 'error');
      return;
    }

    const author = window.walletEngine && window.walletEngine.activeAddress 
      ? window.walletEngine.activeAddress.substring(0, 6) + '...'
      : '0x' + Array.from({length: 4}, () => Math.floor(Math.random()*16).toString(16)).join('') + '...';

    try {
      await fetch(`/api/tokens/${this.activeToken.symbol}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, text, imageUrl })
      });

      if (textInput) textInput.value = '';
      if (imgInput) imgInput.value = '';
      this.toast('Reply posted to thread!', 'success');
      this.fetchComments(this.activeToken.symbol);
    } catch (e) {
      this.toast('Failed to post reply', 'error');
    }
  }

  async fetchTrades(symbol) {
    const tbody = document.getElementById('tradesTableBody');
    if (!tbody) return;

    try {
      const res = await fetch(`/api/tokens/${symbol}/trades`);
      const data = await res.json();
      const trades = data.trades || [];

      if (trades.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No trades yet. Be the first to buy on the curve!</td></tr>`;
        return;
      }

      tbody.innerHTML = trades.map(t => `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <img src="https://api.dicebear.com/7.x/identicon/svg?seed=${t.account}" class="koth-creator-avatar" alt="Avatar">
              <span>${t.account ? t.account.substring(0, 6) + '...' : '0x88f...'}</span>
            </div>
          </td>
          <td><span style="color: ${t.type.toLowerCase() === 'buy' ? 'var(--pump-green)' : 'var(--market-red)'}; font-weight: 700;">${t.type.toUpperCase()}</span></td>
          <td style="font-weight: 700; color: #fff;">${t.solAmount || '0.50'} SOL</td>
          <td>${(t.tokenAmount || 20000).toLocaleString()}</td>
          <td style="color: var(--text-muted);">${this.timeAgo(t.timestamp || Date.now())}</td>
          <td><a href="#" style="color: var(--text-muted);">txn &rarr;</a></td>
        </tr>
      `).join('');
    } catch (e) {
      console.warn('Failed to fetch trades', e);
    }
  }

  async fetchHolders(symbol) {
    const tbody = document.getElementById('holdersTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td>#1</td>
        <td><strong style="color: var(--pump-green);">Raydium Bonding Curve Pool</strong></td>
        <td>750,000,000 $${symbol}</td>
        <td>75.0%</td>
      </tr>
      <tr>
        <td>#2</td>
        <td>0x88f...1a2 (Creator)</td>
        <td>150,000,000 $${symbol}</td>
        <td>15.0%</td>
      </tr>
      <tr>
        <td>#3</td>
        <td>0x42b...c91</td>
        <td>50,000,000 $${symbol}</td>
        <td>5.0%</td>
      </tr>
      <tr>
        <td>#4</td>
        <td>0x91a...c01</td>
        <td>30,000,000 $${symbol}</td>
        <td>3.0%</td>
      </tr>
      <tr>
        <td>#5</td>
        <td>0x71a...e89</td>
        <td>20,000,000 $${symbol}</td>
        <td>2.0%</td>
      </tr>
    `;
  }

  async handleDeploySubmit(e) {
    e.preventDefault();
    const name = document.getElementById('deployName')?.value.trim();
    const symbol = document.getElementById('deploySymbol')?.value.trim().toUpperCase();
    const desc = document.getElementById('deployDesc')?.value.trim();
    const image = document.getElementById('deployImage')?.value.trim();
    const twitter = document.getElementById('deployTwitter')?.value.trim();
    const telegram = document.getElementById('deployTelegram')?.value.trim();
    const website = document.getElementById('deployWebsite')?.value.trim();
    const initialBuy = parseFloat(document.getElementById('deployInitialBuy')?.value) || 0;

    if (!name || !symbol || !desc) {
      this.toast('Please fill out all required fields', 'error');
      return;
    }

    const payload = {
      name,
      symbol,
      description: desc,
      imageUrl: image || 'images/cession-logo.png',
      socialLinks: { twitter, telegram, website },
      initialBuySol: initialBuy,
      creatorAddress: window.walletEngine && window.walletEngine.activeAddress 
        ? window.walletEngine.activeAddress 
        : '0x88f4b23a910cd99e1a2f0093ba4210e76a011a2'
    };

    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        this.toast(`$${symbol} successfully launched on bonding curve!`, 'success');
        const modal = document.getElementById('deployModal');
        if (modal) modal.style.display = 'none';
        
        await this.fetchTokens(true);
        this.openTokenDetail(symbol);
      } else {
        this.toast(data.error || 'Failed to deploy token', 'error');
      }
    } catch (err) {
      this.toast('Network error deploying token', 'error');
    }
  }

  toast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'toast-msg';
    if (type === 'error') div.style.borderColor = 'var(--market-red)';
    if (type === 'success') div.style.borderColor = 'var(--pump-green)';
    div.textContent = msg;

    container.appendChild(div);
    setTimeout(() => {
      div.style.opacity = '0';
      setTimeout(() => div.remove(), 300);
    }, 3500);
  }

  timeAgo(timestamp) {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.launchpadManager = null;
window.CessionLaunchpadManager = CessionLaunchpadManager;
document.addEventListener('DOMContentLoaded', () => {
  window.launchpadManager = new CessionLaunchpadManager();
});
