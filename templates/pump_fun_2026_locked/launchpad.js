/**
 * Cession.fun — 2026 Pump.fun Exact Controller
 * Full Grid & Table View Switcher, Category Filters, Sparklines, and Sidebar Routing
 */

class CessionLaunchpadManager {
  constructor() {
    this.exploreGrid = document.getElementById('exploreCoinsGrid');
    this.exploreTableBody = document.getElementById('exploreTableBody');
    this.exploreTableContainer = document.getElementById('exploreTableContainer');
    this.searchInput = document.getElementById('tokenSearchInput');
    this.activeCategory = 'movers';
    this.viewMode = 'grid'; // 'grid' | 'table'
    this.activeToken = null;
    this.tokens = [];

    this.defaultTokens = [];

    this.init();
  }

  init() {
    this.tokens = [...this.defaultTokens];
    this.bindEvents();
    this.bindSidebarRail();
    this.fetchBackendTokens().then(() => {
      this.filterAndRenderTokens();
    });
  }

  bindSidebarRail() {
    const navItems = [
      { id: 'railNavHome', view: 'board' },
      { id: 'railNavExplore', view: 'board' },
      { id: 'railNavProfile', view: 'profile' },
      { id: 'railNavChat', view: 'board', toast: 'Community chat channel open' },
      { id: 'railNavLeaderboard', view: 'leaderboard' },
      { id: 'railNavLive', view: 'live' },
      { id: 'railNavSupport', view: 'board', toast: 'Support Desk 24/7 online' },
      { id: 'railNavSwap', view: 'board', toast: 'Instant Swap Curve active' },
      { id: 'railNavTokens', view: 'board' },
    ];

    navItems.forEach(item => {
      const btn = document.getElementById(item.id);
      if (btn) {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.rail-icon-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (item.view) this.switchPage(item.view);
          if (item.toast) this.toast(item.toast, 'info');
        });
      }
    });

    const railBtnCreate = document.getElementById('railBtnCreate');
    const btnNavbarCreate = document.getElementById('btnNavbarCreate');
    const deployModal = document.getElementById('deployModal');
    const openCreate = () => {
      if (deployModal) deployModal.style.display = 'flex';
    };

    if (railBtnCreate) railBtnCreate.addEventListener('click', openCreate);
    if (btnNavbarCreate) btnNavbarCreate.addEventListener('click', openCreate);

    const btnCloseDeploy = document.getElementById('btnCloseDeployModal');
    if (btnCloseDeploy && deployModal) {
      btnCloseDeploy.addEventListener('click', () => deployModal.style.display = 'none');
    }

    const deployForm = document.getElementById('deployCoinForm');
    if (deployForm) {
      deployForm.addEventListener('submit', (e) => this.handleDeploySubmit(e));
    }
  }

  bindEvents() {
    // Search input
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.filterAndRenderTokens());
    }

    // Category Filter Pills
    const pills = document.querySelectorAll('.cat-pill-btn[data-cat]');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeCategory = pill.getAttribute('data-cat');
        this.filterAndRenderTokens();
      });
    });

    // Grid / Table View Switcher
    const btnGrid = document.getElementById('btnViewGrid');
    const btnTable = document.getElementById('btnViewTable');

    if (btnGrid && btnTable) {
      btnGrid.addEventListener('click', () => {
        btnGrid.classList.add('active');
        btnTable.classList.remove('active');
        this.viewMode = 'grid';
        if (this.exploreGrid) this.exploreGrid.style.display = 'grid';
        if (this.exploreTableContainer) this.exploreTableContainer.style.display = 'none';
      });

      btnTable.addEventListener('click', () => {
        btnTable.classList.add('active');
        btnGrid.classList.remove('active');
        this.viewMode = 'table';
        if (this.exploreGrid) this.exploreGrid.style.display = 'none';
        if (this.exploreTableContainer) this.exploreTableContainer.style.display = 'block';
        this.renderTableTokens();
      });
    }

    // Filter Funnel & Settings button
    const btnFilter = document.getElementById('btnFilterFunnel');
    if (btnFilter) {
      btnFilter.addEventListener('click', () => {
        this.toast('Filter criteria: Bonding Curve Progress, Volume, & Anti-Snipe Status', 'info');
      });
    }

    // Token Detail Modal Close
    const btnCloseDetail = document.getElementById('btnCloseDetailModal');
    const detailModal = document.getElementById('tokenDetailModal');
    if (btnCloseDetail && detailModal) {
      btnCloseDetail.addEventListener('click', () => {
        detailModal.style.display = 'none';
      });
    }

    // Detail Tabs
    const tabThread = document.getElementById('tabThread');
    const tabTrades = document.getElementById('tabTrades');
    const tabHolders = document.getElementById('tabHolders');

    if (tabThread && tabTrades && tabHolders) {
      tabThread.addEventListener('click', () => this.switchDetailTab('thread'));
      tabTrades.addEventListener('click', () => this.switchDetailTab('trades'));
      tabHolders.addEventListener('click', () => this.switchDetailTab('holders'));
    }

    // Reply Button
    const btnReply = document.getElementById('btnSubmitReply');
    if (btnReply) {
      btnReply.addEventListener('click', () => this.postComment());
    }
  }

  async fetchBackendTokens() {
    try {
      const res = await fetch('/api/tokens');
      const data = await res.json();
      if (data.tokens && data.tokens.length > 0) {
        // Merge backend tokens with demo showcase tokens
        const backendTokens = data.tokens.map(t => ({
          name: t.name,
          symbol: t.symbol,
          marketCapUsd: t.marketCapUsd || 58240,
          volume24hUsd: t.volume24hUsd || 12000,
          currentPriceSol: t.currentPriceSol || 0.000000025,
          creatorAddress: t.creatorAddress ? t.creatorAddress.substring(0, 6) : '0x88f',
          ageText: '5m',
          imageUrl: t.imageUrl || 'images/cession-logo.png',
          description: t.description || 'Sovereign fair launch on Cession.',
          category: 'new',
          bondingCurvePercent: t.bondingCurvePercent || 84
        }));

        const existingSymbols = new Set(this.defaultTokens.map(t => t.symbol));
        backendTokens.forEach(bt => {
          if (!existingSymbols.has(bt.symbol)) {
            this.tokens.unshift(bt);
          }
        });
      }
    } catch (e) {
      console.warn('Backend token fetch:', e);
    }
  }

  filterAndRenderTokens() {
    const query = (this.searchInput ? this.searchInput.value : '').toLowerCase().trim();

    let filtered = this.tokens.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(query) || t.symbol.toLowerCase().includes(query);
      return matchesSearch;
    });

    if (this.activeCategory !== 'movers') {
      const catFiltered = filtered.filter(t => t.category === this.activeCategory);
      if (catFiltered.length > 0) filtered = catFiltered;
    }

    this.renderGridTokens(filtered);
    this.renderTableTokens(filtered);
    this.renderLivestreams();
  }

  renderGridTokens(tokens) {
    if (!this.exploreGrid) return;

    this.exploreGrid.innerHTML = tokens.map(t => {
      const mcapStr = t.marketCapUsd >= 1000000
        ? `$${(t.marketCapUsd / 1000000).toFixed(2)}M MC`
        : `$${(t.marketCapUsd / 1000).toFixed(1)}K MC`;

      return `
        <div class="explore-coin-card" onclick="window.launchpadManager.openTokenDetail('${t.symbol}')">
          <div class="explore-coin-thumb-box">
            <img src="${t.imageUrl}" class="explore-coin-img" alt="${t.symbol}" onerror="this.src='images/cession-logo.png'">
            
            <!-- Dynamic Green Sparkline Overlay -->
            <svg class="sparkline-svg" viewBox="0 0 60 24" fill="none">
              <path d="M2 18 Q 15 22, 25 10 T 45 6 T 58 2" stroke="#86efac" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>

          <div class="explore-coin-details">
            <div class="explore-coin-title">${this.escapeHtml(t.name)}</div>
            <div class="explore-coin-ticker">$${t.symbol}</div>
            <div class="explore-coin-mcap">${mcapStr}</div>
            <div class="explore-coin-creator-row">
              <span>👤 ${t.creatorAddress}</span>
              <span>⏳ ${t.ageText}</span>
            </div>
            <div class="explore-coin-desc">${this.escapeHtml(t.description)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderTableTokens(tokens = this.tokens) {
    if (!this.exploreTableBody) return;

    this.exploreTableBody.innerHTML = tokens.map(t => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${t.imageUrl}" style="width: 24px; height: 24px; border-radius: 4px; object-fit: cover;" onerror="this.src='images/cession-logo.png'">
            <strong>${this.escapeHtml(t.name)}</strong>
          </div>
        </td>
        <td style="color: var(--pump-mint); font-weight: 700;">$${t.symbol}</td>
        <td>${(t.currentPriceSol * 145).toFixed(6)} USD</td>
        <td style="color: var(--pump-mint); font-weight: 700;">$${(t.marketCapUsd).toLocaleString()}</td>
        <td>$${(t.volume24hUsd || 15000).toLocaleString()}</td>
        <td>${t.creatorAddress}</td>
        <td>${t.ageText}</td>
        <td>
          <button class="cat-pill-btn" style="padding: 2px 8px; font-size: 11px;" onclick="window.launchpadManager.openTokenDetail('${t.symbol}')">
            trade &rarr;
          </button>
        </td>
      </tr>
    `).join('');
  }

  renderLivestreams() {
    const grid = document.getElementById('livestreamsGrid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="explore-coin-card" onclick="window.launchpadManager.openTokenDetail('Jimothy')">
        <div class="explore-coin-thumb-box">
          <img src="https://images.unsplash.com/photo-1590425712287-c37340263300?w=500" class="explore-coin-img">
          <div style="position: absolute; top: 8px; left: 8px; background: rgba(239, 68, 68, 0.9); color: #fff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
            🔴 LIVE • 1,420
          </div>
        </div>
        <div class="explore-coin-details">
          <div class="explore-coin-title">Jimothy Live Bonding Broadcast</div>
          <div class="explore-coin-mcap">$7.82M MC</div>
        </div>
      </div>
      <div class="explore-coin-card" onclick="window.launchpadManager.openTokenDetail('BILLY')">
        <div class="explore-coin-thumb-box">
          <img src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500" class="explore-coin-img">
          <div style="position: absolute; top: 8px; left: 8px; background: rgba(239, 68, 68, 0.9); color: #fff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
            🔴 LIVE • 840
          </div>
        </div>
        <div class="explore-coin-details">
          <div class="explore-coin-title">Billy Dev Q&A Stream</div>
          <div class="explore-coin-mcap">$3.75M MC</div>
        </div>
      </div>
    `;
  }

  switchPage(viewName) {
    const views = {
      board: document.getElementById('viewBoard'),
      live: document.getElementById('viewLive'),
      leaderboard: document.getElementById('viewLeaderboard'),
      profile: document.getElementById('viewProfile')
    };

    Object.keys(views).forEach(k => {
      if (views[k]) {
        if (k === viewName) views[k].classList.add('active');
        else views[k].classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openTokenDetail(symbol) {
    const token = this.tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase()) || this.defaultTokens[0];
    this.activeToken = token;

    if (window.tradingManager) {
      window.tradingManager.setActiveToken(token);
    }

    const modal = document.getElementById('tokenDetailModal');
    if (modal) modal.style.display = 'flex';

    const nameEl = document.getElementById('detailTokenName');
    const symEl = document.getElementById('detailTokenSymbol');
    const metaEl = document.getElementById('detailTokenMeta');
    const barEl = document.getElementById('detailProgressBar');
    const pctEl = document.getElementById('detailProgressPercent');
    const coinImg = document.getElementById('detailCoinImg');
    const coinTitle = document.getElementById('detailCoinTitle');
    const coinDesc = document.getElementById('detailCoinDescription');

    if (nameEl) nameEl.textContent = token.name;
    if (symEl) symEl.textContent = `$${token.symbol}`;
    if (metaEl) metaEl.textContent = `created by ${token.creatorAddress} • ${token.ageText} ago`;
    if (coinImg) coinImg.src = token.imageUrl;
    if (coinTitle) coinTitle.textContent = `${token.name} ($${token.symbol})`;
    if (coinDesc) coinDesc.textContent = token.description;

    const progress = token.bondingCurvePercent || 84;
    if (barEl) barEl.style.width = `${progress}%`;
    if (pctEl) pctEl.textContent = `${progress}%`;

    if (window.chartManager) {
      window.chartManager.loadTokenChart(token.symbol);
    }

    this.fetchComments(token.symbol);
    this.fetchTrades(token.symbol);
    this.fetchHolders(token.symbol);
  }

  switchDetailTab(tabName) {
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

    list.innerHTML = `
      <div style="background-color: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 10px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
          <span style="color: #fff; font-weight: 700;">👤 whale_trader</span>
          <span>2m ago</span>
        </div>
        <div style="font-size: 12px; color: var(--text-secondary);">Dev holds zero team allocation. Bonding curve is 84% filled!</div>
      </div>
    `;
  }

  async fetchTrades(symbol) {
    const tbody = document.getElementById('tradesTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td>76kXMM...</td>
        <td style="color: var(--pump-mint); font-weight: 700;">BUY</td>
        <td>1.50 SOL</td>
        <td>62,000</td>
        <td>1m ago</td>
      </tr>
      <tr>
        <td>topfl_b...</td>
        <td style="color: var(--pump-mint); font-weight: 700;">BUY</td>
        <td>0.80 SOL</td>
        <td>31,500</td>
        <td>4m ago</td>
      </tr>
    `;
  }

  async fetchHolders(symbol) {
    const tbody = document.getElementById('holdersTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr><td>#1</td><td style="color: var(--pump-mint);">Raydium Bonding Curve</td><td>780,000,000</td><td>78.0%</td></tr>
      <tr><td>#2</td><td>76kXMM (Creator)</td><td>120,000,000</td><td>12.0%</td></tr>
      <tr><td>#3</td><td>topfloor_b</td><td>50,000,000</td><td>5.0%</td></tr>
    `;
  }

  async postComment() {
    const textInput = document.getElementById('replyCommentText');
    const text = textInput ? textInput.value.trim() : '';
    if (!text) {
      this.toast('Please write a comment', 'error');
      return;
    }

    const list = document.getElementById('commentsList');
    if (list) {
      const div = document.createElement('div');
      div.style.cssText = 'background-color: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 10px;';
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
          <span style="color: #fff; font-weight: 700;">👤 you</span>
          <span>just now</span>
        </div>
        <div style="font-size: 12px; color: var(--text-secondary);">${this.escapeHtml(text)}</div>
      `;
      list.prepend(div);
      if (textInput) textInput.value = '';
      this.toast('Reply posted', 'success');
    }
  }

  async handleDeploySubmit(e) {
    e.preventDefault();
    const name = document.getElementById('deployName')?.value.trim();
    const symbol = document.getElementById('deploySymbol')?.value.trim().toUpperCase();
    const desc = document.getElementById('deployDesc')?.value.trim();
    const image = document.getElementById('deployImage')?.value.trim();
    const initialBuy = parseFloat(document.getElementById('deployInitialBuy')?.value) || 0;

    if (!name || !symbol || !desc) {
      this.toast('Please fill out all fields', 'error');
      return;
    }

    const newToken = {
      name,
      symbol,
      marketCapUsd: 58240 + initialBuy * 1450,
      volume24hUsd: initialBuy * 145,
      currentPriceSol: 0.000000058,
      creatorAddress: (window.walletEngine && window.walletEngine.activeAddress) ? (window.walletEngine.activeAddress.length > 8 ? `${window.walletEngine.activeAddress.substring(0, 4)}...${window.walletEngine.activeAddress.substring(window.walletEngine.activeAddress.length - 4)}` : window.walletEngine.activeAddress) : '0x000...000',
      ageText: 'just now',
      imageUrl: image || 'images/cession-logo.png',
      description: desc,
      category: 'new',
      bondingCurvePercent: Math.min(99, 10 + initialBuy * 5)
    };

    this.tokens.unshift(newToken);
    this.filterAndRenderTokens();

    const modal = document.getElementById('deployModal');
    if (modal) modal.style.display = 'none';

    this.toast(`$${symbol} successfully launched on bonding curve!`, 'success');
    this.openTokenDetail(symbol);
  }

  toast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'toast-msg';
    if (type === 'error') div.style.borderColor = 'var(--accent-red)';
    if (type === 'success') div.style.borderColor = 'var(--pump-mint)';
    div.textContent = msg;

    container.appendChild(div);
    setTimeout(() => {
      div.style.opacity = '0';
      setTimeout(() => div.remove(), 300);
    }, 3500);
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
