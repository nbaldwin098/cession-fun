/**
 * Cession.fun — Multi-Page & Sidebar Drawer Controller
 * Exact Pump.fun UI for Board, Livestreams, Leaderboard, and Profile
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
    this.currentView = 'board'; // 'board' | 'live' | 'leaderboard' | 'profile'

    this.init();
  }

  init() {
    this.bindEvents();
    this.bindSidebarAndNavigation();
    this.fetchTokens();
    this.fetchGlobalTrades();
    this.checkInitialRoute();

    // Auto refresh every 6 seconds
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
        setTimeout(() => this.openTokenDetail(sym), 300);
      }
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

    // Sidebar navigation menu items
    const menuBoard = document.getElementById('menuNavBoard');
    const menuLive = document.getElementById('menuNavLive');
    const menuLeaderboard = document.getElementById('menuNavLeaderboard');
    const menuFollowing = document.getElementById('menuNavFollowing');
    const menuProfile = document.getElementById('menuNavProfile');
    const menuHowItWorks = document.getElementById('menuNavHowItWorks');

    if (menuBoard) menuBoard.addEventListener('click', () => { this.switchPage('board'); closeDrawer(); });
    if (menuLive) menuLive.addEventListener('click', () => { this.switchPage('live'); closeDrawer(); });
    if (menuLeaderboard) menuLeaderboard.addEventListener('click', () => { this.switchPage('leaderboard'); closeDrawer(); });
    if (menuFollowing) menuFollowing.addEventListener('click', () => { this.switchPage('board'); closeDrawer(); this.toast('Showing followed tokens', 'info'); });
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

    if (brandLink) brandLink.addEventListener('click', (e) => { e.preventDefault(); this.switchPage('board'); });
    if (btnHeaderLive) btnHeaderLive.addEventListener('click', (e) => { e.preventDefault(); this.switchPage('live'); });
    if (btnHeaderLeaderboard) btnHeaderLeaderboard.addEventListener('click', (e) => { e.preventDefault(); this.switchPage('leaderboard'); });

    // Wallet pill click to open profile
    const walletPill = document.getElementById('walletConnectedPill');
    if (walletPill) {
      walletPill.addEventListener('click', (e) => {
        if (e.target.id === 'btnDisconnectWallet') return;
        this.switchPage('profile');
      });
    }

    // Leaderboard sub-tabs
    const tabTraders = document.getElementById('tabTopTraders');
    const tabCreators = document.getElementById('tabTopCreators');
    if (tabTraders && tabCreators) {
      tabTraders.addEventListener('click', () => {
        tabTraders.classList.add('active');
        tabCreators.classList.remove('active');
        this.renderLeaderboardTraders();
      });
      tabCreators.addEventListener('click', () => {
        tabCreators.classList.add('active');
        tabTraders.classList.remove('active');
        this.renderLeaderboardCreators();
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
      leaderboard: document.getElementById('viewLeaderboard'),
      profile: document.getElementById('viewProfile')
    };

    Object.keys(views).forEach(k => {
      if (views[k]) {
        if (k === viewName) {
          views[k].classList.add('active');
        } else {
          views[k].classList.remove('active');
        }
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

    // Close any active detail modal if switching pages
    const detailModal = document.getElementById('tokenDetailModal');
    if (detailModal) detailModal.style.display = 'none';

    // Update browser URL history
    const route = viewName === 'board' ? '/' : `/${viewName}`;
    window.history.pushState({}, '', route);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Populate profile if navigating to profile
    if (viewName === 'profile') {
      this.updateProfileView();
    }
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
  }

  renderLeaderboardTraders() {
    const tbody = document.getElementById('leaderboardTableBody');
    if (!tbody) return;
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
    const tbody = document.getElementById('leaderboardTableBody');
    if (!tbody) return;
    tbody.innerHTML = `
      <tr>
        <td><span class="rank-badge rank-1">1</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="https://api.dicebear.com/7.x/identicon/svg?seed=creator1" class="koth-creator-avatar" alt="Dev">
            <span style="font-weight: 700; color: #fff;">0x33a...99f</span>
            <span style="background: #fbbf24; color: #000; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">TOP CREATOR</span>
          </div>
        </td>
        <td style="color: var(--pump-green); font-weight: 700;">+210.00 SOL</td>
        <td style="color: var(--pump-green); font-weight: 700;">+$30,450.00</td>
        <td>6 Graduated</td>
        <td>12 Coins</td>
      </tr>
      <tr>
        <td><span class="rank-badge rank-2">2</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="https://api.dicebear.com/7.x/identicon/svg?seed=creator2" class="koth-creator-avatar" alt="Dev">
            <span style="font-weight: 700; color: #fff;">0x77b...11d</span>
          </div>
        </td>
        <td style="color: var(--pump-green); font-weight: 700;">+115.40 SOL</td>
        <td style="color: var(--pump-green); font-weight: 700;">+$16,733.00</td>
        <td>4 Graduated</td>
        <td>8 Coins</td>
      </tr>
    `;
  }

  bindEvents() {
    // Search filter
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.filterAndRenderTokens());
    }

    // Sort order
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', (e) => {
        this.activeSort = e.target.value;
        this.fetchTokens();
      });
    }

    // Sort direction
    if (this.sortDirSelect) {
      this.sortDirSelect.addEventListener('change', (e) => {
        this.activeDir = e.target.value;
        this.fetchTokens();
      });
    }

    // Modal Triggers
    const btnDeployHero = document.getElementById('btnOpenDeployHero');
    const deployModal = document.getElementById('deployModal');
    const btnCloseDeploy = document.getElementById('btnCloseDeployModal');

    if (btnDeployHero && deployModal) {
      btnDeployHero.addEventListener('click', (e) => {
        e.preventDefault();
        deployModal.style.display = 'flex';
      });
    }
    if (btnCloseDeploy && deployModal) {
      btnCloseDeploy.addEventListener('click', () => {
        deployModal.style.display = 'none';
      });
    }

    // More options toggle in deploy modal
    const btnMoreOptions = document.getElementById('btnToggleMoreDeployOptions');
    const moreOptionsSection = document.getElementById('deployMoreOptionsSection');
    if (btnMoreOptions && moreOptionsSection) {
      btnMoreOptions.addEventListener('click', () => {
        const isHidden = moreOptionsSection.style.display === 'none';
        moreOptionsSection.style.display = isHidden ? 'block' : 'none';
        btnMoreOptions.textContent = isHidden ? '[hide extra options ▲]' : '[show more options ▼]';
      });
    }

    // How It Works Modal
    const btnHowItWorks = document.getElementById('btnOpenHowItWorks');
    const howItWorksModal = document.getElementById('howItWorksModal');
    const btnCloseHow = document.getElementById('btnCloseHowItWorks');
    const btnReadyToPump = document.getElementById('btnReadyToPump');

    if (btnHowItWorks && howItWorksModal) {
      btnHowItWorks.addEventListener('click', (e) => {
        e.preventDefault();
        howItWorksModal.style.display = 'flex';
      });
    }
    if (btnCloseHow && howItWorksModal) {
      btnCloseHow.addEventListener('click', () => {
        howItWorksModal.style.display = 'none';
      });
    }
    if (btnReadyToPump && howItWorksModal) {
      btnReadyToPump.addEventListener('click', () => {
        howItWorksModal.style.display = 'none';
      });
    }

    // Wallet Modal
    const btnConnect = document.getElementById('btnConnectWallet');
    const walletModal = document.getElementById('walletModal');
    const btnCloseWallet = document.getElementById('btnCloseWalletModal');
    if (btnConnect && walletModal) {
      btnConnect.addEventListener('click', (e) => {
        e.preventDefault();
        walletModal.style.display = 'flex';
      });
    }
    if (btnCloseWallet && walletModal) {
      btnCloseWallet.addEventListener('click', () => {
        walletModal.style.display = 'none';
      });
    }

    // Disconnect Wallet
    const btnDisconnect = document.getElementById('btnDisconnectWallet');
    if (btnDisconnect) {
      btnDisconnect.addEventListener('click', () => {
        if (window.walletEngine) window.walletEngine.disconnect();
      });
    }

    // Token Detail Modal Close
    const detailModal = document.getElementById('tokenDetailModal');
    const btnCloseDetail = document.getElementById('btnCloseDetailModal');
    if (btnCloseDetail && detailModal) {
      btnCloseDetail.addEventListener('click', () => {
        detailModal.style.display = 'none';
        this.activeToken = null;
        window.history.pushState({}, '', '/');
      });
    }

    // Deploy Coin Form Submit
    const deployForm = document.getElementById('deployCoinForm');
    if (deployForm) {
      deployForm.addEventListener('submit', (e) => this.handleDeploySubmit(e));
    }

    // Token Detail Tabs
    const tabThread = document.getElementById('tabThread');
    const tabTrades = document.getElementById('tabTrades');
    const tabHolders = document.getElementById('tabHolders');
    const paneThread = document.getElementById('paneThread');
    const paneTrades = document.getElementById('paneTrades');
    const paneHolders = document.getElementById('paneHolders');

    if (tabThread && tabTrades && tabHolders) {
      tabThread.addEventListener('click', () => {
        tabThread.classList.add('active');
        tabTrades.classList.remove('active');
        tabHolders.classList.remove('active');
        if (paneThread) paneThread.style.display = 'flex';
        if (paneTrades) paneTrades.style.display = 'none';
        if (paneHolders) paneHolders.style.display = 'none';
      });

      tabTrades.addEventListener('click', () => {
        tabTrades.classList.add('active');
        tabThread.classList.remove('active');
        tabHolders.classList.remove('active');
        if (paneThread) paneThread.style.display = 'none';
        if (paneTrades) paneTrades.style.display = 'block';
        if (paneHolders) paneHolders.style.display = 'none';
        if (this.activeToken) this.fetchTokenTrades(this.activeToken.symbol);
      });

      tabHolders.addEventListener('click', () => {
        tabHolders.classList.add('active');
        tabThread.classList.remove('active');
        tabTrades.classList.remove('active');
        if (paneThread) paneThread.style.display = 'none';
        if (paneTrades) paneTrades.style.display = 'none';
        if (paneHolders) paneHolders.style.display = 'block';
        if (this.activeToken) this.fetchTokenHolders(this.activeToken.symbol);
      });
    }

    // Comment Reply Submit
    const btnSubmitReply = document.getElementById('btnSubmitReply');
    if (btnSubmitReply) {
      btnSubmitReply.addEventListener('click', () => this.handleCommentSubmit());
    }
  }

  async fetchTokens(showSpinner = true) {
    try {
      const res = await fetch(`/api/tokens?sort=${this.activeSort}`);
      const data = await res.json();
      if (data.success && data.tokens) {
        this.tokens = data.tokens;
        this.updateKingOfTheHill(this.tokens);
        this.filterAndRenderTokens();
      }
    } catch (e) {
      console.warn('Error fetching tokens:', e);
    }
  }

  updateKingOfTheHill(tokens) {
    if (!tokens || tokens.length === 0) return;
    const sorted = [...tokens].sort((a, b) => (b.marketCapUsd || 0) - (a.marketCapUsd || 0));
    const king = sorted[0];
    if (!king) return;

    const img = document.getElementById('kingImg');
    const creator = document.getElementById('kingCreator');
    const mcap = document.getElementById('kingMcap');
    const replies = document.getElementById('kingReplies');
    const nameTicker = document.getElementById('kingNameTicker');
    const desc = document.getElementById('kingDesc');

    if (img) img.src = king.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200';
    if (creator) creator.textContent = this.formatAddress(king.creator || '0xAnon');
    if (mcap) mcap.textContent = `$${((king.marketCapUsd || 10000) / 1000).toFixed(1)}k`;
    if (replies) replies.textContent = king.chatMessagesCount || 12;
    if (nameTicker) nameTicker.textContent = `$${king.symbol} (${king.name})`;
    if (desc) desc.textContent = king.description || 'Fair launch coin on the bonding curve.';
  }

  filterAndRenderTokens() {
    if (!this.tokenGrid) return;
    const query = (this.searchInput ? this.searchInput.value : '').toLowerCase().trim();

    let list = this.tokens.filter(t => {
      if (!query) return true;
      return (
        t.name.toLowerCase().includes(query) ||
        t.symbol.toLowerCase().includes(query) ||
        (t.creator && t.creator.toLowerCase().includes(query))
      );
    });

    if (this.activeDir === 'asc') {
      list.reverse();
    }

    if (list.length === 0) {
      this.tokenGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted); font-family: var(--font-mono);">
          no coins found matching your search.
        </div>
      `;
      return;
    }

    this.tokenGrid.innerHTML = list.map(t => this.renderCardHtml(t)).join('');
  }

  renderCardHtml(token) {
    const timeAgo = this.formatTimeAgo(token.createdAt);
    const mcapK = ((token.marketCapUsd || 10000) / 1000).toFixed(1);
    const progress = Math.min(100, Math.round(token.curveProgressPercent || 15));
    const replies = token.chatMessagesCount || Math.floor(Math.random() * 20 + 2);

    return `
      <div class="token-card-pump" onclick="window.launchpadManager.openTokenDetail('${token.symbol}')">
        <img src="${token.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'}" alt="${token.name}" class="token-card-thumb" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'">
        <div class="token-card-body">
          <div class="token-card-creator">
            <span>created by</span>
            <img src="https://api.dicebear.com/7.x/identicon/svg?seed=${token.creator || token.symbol}" class="token-card-creator-avatar" alt="Dev">
            <span>${this.formatAddress(token.creator || '0xAnon')}</span>
            <span>${timeAgo}</span>
          </div>

          <div class="token-card-mcap">
            market cap: $${mcapK}k (bonding curve: ${progress}%)
          </div>

          <div class="token-card-replies">
            replies: ${replies}
          </div>

          <div class="token-card-title-desc">
            <strong>$${token.symbol} (${token.name})</strong>: ${this.escapeHtml(token.description || '')}
          </div>
        </div>
      </div>
    `;
  }

  async openTokenDetail(symbol) {
    const token = this.tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
    if (!token) {
      this.toast(`Coin $${symbol} not found.`, 'error');
      return;
    }

    this.activeToken = token;
    const modal = document.getElementById('tokenDetailModal');
    if (!modal) return;

    // Update browser URL
    window.history.pushState({}, '', `/token/${token.symbol}`);

    // Populate metadata
    document.getElementById('detailTokenName').textContent = token.name;
    document.getElementById('detailTokenSymbol').textContent = `$${token.symbol}`;
    document.getElementById('detailTokenMeta').textContent = `created by ${this.formatAddress(token.creator || '0xAnon')} • ${this.formatTimeAgo(token.createdAt)}`;

    const progress = Math.min(100, Math.round(token.curveProgressPercent || 20));
    document.getElementById('detailProgressPercent').textContent = `${progress}%`;
    document.getElementById('detailProgressBar').style.width = `${progress}%`;
    document.getElementById('detailProgressText').textContent = `graduate this coin to Raydium at $69,420 market cap. there is ${(token.realSolRaised || 2.4).toFixed(2)} SOL in the bonding curve.`;

    // Coin info right card
    document.getElementById('detailCoinImg').src = token.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200';
    document.getElementById('detailCoinTitle').textContent = `${token.name} ($${token.symbol})`;
    document.getElementById('detailCoinDescription').textContent = token.description || 'Fair launch coin on the bonding curve.';

    // Socials
    const twitterLink = document.getElementById('detailSocialTwitter');
    const telegramLink = document.getElementById('detailSocialTelegram');
    const websiteLink = document.getElementById('detailSocialWebsite');

    if (twitterLink) {
      if (token.twitter) {
        twitterLink.href = token.twitter;
        twitterLink.style.display = 'inline-flex';
      } else {
        twitterLink.style.display = 'none';
      }
    }

    if (telegramLink) {
      if (token.telegram) {
        telegramLink.href = token.telegram;
        telegramLink.style.display = 'inline-flex';
      } else {
        telegramLink.style.display = 'none';
      }
    }

    if (websiteLink) {
      if (token.website) {
        websiteLink.href = token.website;
        websiteLink.style.display = 'inline-flex';
      } else {
        websiteLink.style.display = 'none';
      }
    }

    // Set active token in trading manager
    if (window.tradingManager) {
      window.tradingManager.setActiveToken(token);
    }

    // Load chart
    if (window.chartController) {
      window.chartController.loadCandles(token.symbol);
    }

    // Load comments thread
    this.fetchTokenComments(token.symbol);

    modal.style.display = 'block';
  }

  async fetchTokenComments(symbol) {
    const list = document.getElementById('commentsList');
    if (!list) return;

    try {
      const res = await fetch(`/api/tokens/${symbol}/chat`);
      const data = await res.json();
      if (data.success && data.messages) {
        list.innerHTML = data.messages.map(m => `
          <div class="comment-card">
            <div class="comment-header">
              <img src="https://api.dicebear.com/7.x/identicon/svg?seed=${m.user}" class="comment-avatar" alt="User">
              <span style="color: #fff; font-weight: 700;">${m.user}</span>
              <span>${m.time || 'just now'}</span>
            </div>
            <div class="comment-text">${this.escapeHtml(m.text || '')}</div>
            ${m.image ? `<img src="${m.image}" class="comment-meme-img" alt="Meme">` : ''}
          </div>
        `).join('');
      }
    } catch (e) {
      console.warn('Error fetching comments:', e);
    }
  }

  async handleCommentSubmit() {
    if (!this.activeToken) return;
    const textInput = document.getElementById('replyCommentText');
    const imageInput = document.getElementById('replyImageUrl');
    const text = textInput ? textInput.value.trim() : '';
    const image = imageInput ? imageInput.value.trim() : '';

    if (!text && !image) {
      this.toast('Please enter a comment or image URL.', 'error');
      return;
    }

    const user = window.walletEngine && window.walletEngine.activeAddress 
      ? this.formatAddress(window.walletEngine.activeAddress)
      : 'anon_' + Math.floor(Math.random() * 8999 + 1000);

    try {
      const res = await fetch(`/api/tokens/${this.activeToken.symbol}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, text, image })
      });
      const data = await res.json();
      if (data.success) {
        if (textInput) textInput.value = '';
        if (imageInput) imageInput.value = '';
        this.fetchTokenComments(this.activeToken.symbol);
        this.toast('Reply posted!', 'success');
      }
    } catch (e) {
      this.toast('Failed to post reply.', 'error');
    }
  }

  async fetchTokenTrades(symbol) {
    const tbody = document.getElementById('tradesTableBody');
    if (!tbody) return;
    try {
      const res = await fetch(`/api/tokens/${symbol}/trades`);
      const data = await res.json();
      if (data.success && data.trades) {
        tbody.innerHTML = data.trades.map(tr => `
          <tr>
            <td style="color: var(--pump-green);">${this.formatAddress(tr.account || tr.trader || '0xAnon')}</td>
            <td style="color: ${tr.type === 'buy' ? 'var(--pump-green)' : 'var(--market-red)'}; font-weight: 700;">${tr.type}</td>
            <td>${(tr.solAmount || 0.1).toFixed(2)}</td>
            <td>${Math.floor(tr.tokenAmount || 100000).toLocaleString()}</td>
            <td>${this.formatTimeAgo(tr.timestamp || Date.now())}</td>
            <td><a href="#" style="color: var(--text-muted);">view</a></td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.warn('Error fetching trades:', e);
    }
  }

  async fetchTokenHolders(symbol) {
    const tbody = document.getElementById('holdersTableBody');
    if (!tbody) return;
    try {
      const res = await fetch(`/api/tokens/${symbol}/holders`);
      const data = await res.json();
      if (data.success && data.holders) {
        tbody.innerHTML = data.holders.map((h, i) => `
          <tr>
            <td>#${i + 1}</td>
            <td style="color: ${h.isDev ? 'var(--pump-green)' : '#fff'};">${h.address}</td>
            <td>${Math.floor(h.balance || 0).toLocaleString()}</td>
            <td>${(h.percentage || 0).toFixed(2)}%</td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.warn('Error fetching holders:', e);
    }
  }

  async fetchGlobalTrades() {
    const marquee = document.getElementById('globalTradeMarquee');
    if (!marquee) return;
    try {
      const res = await fetch('/api/tokens/global-trades');
      const data = await res.json();
      if (data.success && data.trades && data.trades.length > 0) {
        marquee.innerHTML = data.trades.map(t => `
          <div class="marquee-pill ${t.type}">
            ${this.formatAddress(t.trader || '0xAnon')} ${t.type === 'buy' ? 'bought' : 'sold'} ${(t.solAmount || 0.5).toFixed(2)} SOL of <strong>$${t.symbol}</strong>
          </div>
        `).join('');
      }
    } catch (e) {
      // Keep static marquee if offline
    }
  }

  async handleDeploySubmit(e) {
    e.preventDefault();
    const name = document.getElementById('deployName').value.trim();
    const symbol = document.getElementById('deploySymbol').value.trim().toUpperCase();
    const description = document.getElementById('deployDesc').value.trim();
    const imageUrl = document.getElementById('deployImage').value.trim();
    const twitter = document.getElementById('deployTwitter').value.trim();
    const telegram = document.getElementById('deployTelegram').value.trim();
    const website = document.getElementById('deployWebsite').value.trim();
    const initialBuy = parseFloat(document.getElementById('deployInitialBuy').value) || 0;

    const creator = window.walletEngine && window.walletEngine.activeAddress
      ? window.walletEngine.activeAddress
      : '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');

    try {
      const res = await fetch('/api/tokens/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          symbol,
          description,
          imageUrl,
          twitter,
          telegram,
          website,
          initialBuySol: initialBuy,
          creator
        })
      });

      const data = await res.json();
      if (data.success) {
        document.getElementById('deployModal').style.display = 'none';
        document.getElementById('deployCoinForm').reset();
        this.toast(`Coin $${symbol} created successfully!`, 'success');
        await this.fetchTokens();
        this.openTokenDetail(symbol);
      } else {
        this.toast(data.error || 'Failed to create coin', 'error');
      }
    } catch (err) {
      this.toast('Network error creating coin', 'error');
    }
  }

  toast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = msg;
    if (type === 'error') {
      toast.style.borderColor = 'var(--market-red)';
    }
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  formatAddress(addr) {
    if (!addr) return '0x000...000';
    if (addr.length <= 10) return addr;
    return `${addr.substring(0, 5)}...${addr.substring(addr.length - 4)}`;
  }

  formatTimeAgo(ts) {
    if (!ts) return 'just now';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.launchpadManager = null;
window.CessionLaunchpadManager = CessionLaunchpadManager;
document.addEventListener('DOMContentLoaded', () => {
  window.launchpadManager = new CessionLaunchpadManager();
});
