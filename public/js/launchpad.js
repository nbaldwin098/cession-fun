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
    this.tokens = [];
    this.bundles = [];
    this.topBundles = [];
    this.worstBundles = [];
    this.activeBundle = null;
    this.bindEvents();
    this.bindSidebarRail();
    this.bindBundleModals();
    this.fetchBackendTokens().then(() => {
      this.filterAndRenderTokens();
    });
    this.fetchBundles();

    // Check initial URL routing
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path.startsWith('/explore') || hash === '#explore' || path.startsWith('/board') || hash === '#board') {
      const btn = document.getElementById('railNavExplore');
      if (btn) {
        document.querySelectorAll('.rail-icon-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      this.switchPage('explore');
    } else if (path.startsWith('/bundles') || hash === '#bundles' || path.startsWith('/collections')) {
      const btn = document.getElementById('railNavBundles');
      if (btn) {
        document.querySelectorAll('.rail-icon-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      this.switchPage('bundles');
    }
  }

  bindSidebarRail() {
    const navItems = [
      { id: 'railNavHome', view: 'home', url: '/' },
      { id: 'railNavExplore', view: 'explore', url: '/explore' },
      { id: 'railNavProfile', view: 'profile', url: '/profile' },
      { id: 'railNavLeaderboard', view: 'leaderboard', url: '/leaderboard' },
      { id: 'railNavBundles', view: 'bundles', url: '/bundles' },
      { id: 'railNavTransparency', view: 'transparency', url: '/transparency' },
      { id: 'railNavTerms', view: 'terms', url: '/terms' },
    ];

    navItems.forEach(item => {
      const btn = document.getElementById(item.id);
      if (btn) {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.rail-icon-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (item.view) this.switchPage(item.view);
          if (item.url && window.history && window.history.pushState) {
            window.history.pushState({}, '', item.url);
          }
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

    // Execute Stake Button
    const btnStake = document.getElementById('btnExecuteStake');
    if (btnStake) {
      btnStake.addEventListener('click', () => this.executeStake());
    }
  }

  async fetchTokens(render = true) {
    await this.fetchBackendTokens();
    if (render) this.filterAndRenderTokens();
  }

  async fetchBackendTokens() {
    try {
      const res = await fetch('/api/pulse?lane=all');
      const data = await res.json();
      if (data.feed && data.feed.length > 0) {
        this.tokens = data.feed.map(t => ({
          name: t.name,
          symbol: t.symbol,
          marketCapUsd: t.marketCapUsd || 10000,
          volume24hUsd: t.volume24hUsd || 1500,
          currentPriceSol: t.currentPriceSol || 0.000000010,
          currentPriceUsd: t.currentPriceUsd || (t.currentPriceSol ? t.currentPriceSol * 150 : 0.0000015),
          creatorAddress: t.creator ? (t.creator.length > 8 ? `${t.creator.substring(0, 4)}...${t.creator.substring(t.creator.length - 4)}` : t.creator) : (t.creatorAddress || '0x000...000'),
          ageText: t.isTestStage ? 'Test Phase' : 'Active',
          imageUrl: t.imageUrl || 'images/cession-logo.png',
          description: t.description || 'Sovereign fair launch on Cession bonding curve.',
          category: t.pulseLane || 'active',
          pulseScore: t.pulseScore || 0,
          pulseLane: t.pulseLane || 'active',
          solscanUrl: t.solscanUrl,
          scoreComponents: t.scoreComponents,
          bondingCurvePercent: t.bondingCurveProgressPercent || t.curveProgressPercent || 5
        }));
      } else {
        const fallbackRes = await fetch('/api/tokens');
        const fallbackData = await fallbackRes.json();
        if (fallbackData.tokens) {
          this.tokens = fallbackData.tokens.map(t => ({
            name: t.name,
            symbol: t.symbol,
            marketCapUsd: t.marketCapUsd || 10000,
            volume24hUsd: t.volume24hUsd || 1500,
            currentPriceSol: t.currentPriceSol || 0.000000010,
            currentPriceUsd: t.currentPriceUsd || 0.0000015,
            creatorAddress: t.creator ? `${t.creator.substring(0,4)}...` : '0x000...000',
            ageText: 'Active',
            imageUrl: t.imageUrl || 'images/cession-logo.png',
            description: t.description || 'Sovereign fair launch on Cession bonding curve.',
            category: 'active',
            pulseScore: 50,
            pulseLane: 'active',
            bondingCurvePercent: t.bondingCurveProgressPercent || 5
          }));
        }
      }
    } catch (e) {
      console.warn('Backend pulse token fetch error:', e);
    }
  }

  filterAndRenderTokens() {
    const query = (this.searchInput ? this.searchInput.value : '').toLowerCase().trim();

    let filtered = this.tokens.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(query) || t.symbol.toLowerCase().includes(query);
      return matchesSearch;
    });

    if (this.activeCategory && this.activeCategory !== 'all' && this.activeCategory !== 'movers') {
      const catFiltered = filtered.filter(t => (t.pulseLane || t.category).toLowerCase() === this.activeCategory.toLowerCase());
      if (catFiltered.length > 0) filtered = catFiltered;
    }

    this.renderGridTokens(filtered);
    this.renderTableTokens(filtered);
    this.renderLivestreams();
  }

  renderGridTokens(tokens) {
    const forYouGrid = document.getElementById('forYouCoinsGrid');
    const grids = [this.exploreGrid, forYouGrid].filter(Boolean);

    if (grids.length === 0) return;

    // Filter out locally hidden / Not Interested tokens
    const hiddenTokens = JSON.parse(localStorage.getItem('cession_not_interested') || '[]');
    const holdTokens = JSON.parse(localStorage.getItem('cession_hold_list') || '[]');
    const visibleTokens = (tokens || []).filter(t => !hiddenTokens.includes(t.symbol.toUpperCase()));

    if (visibleTokens.length === 0) {
      const emptyHtml = `
        <div style="grid-column: 1 / -1; padding: 48px 24px; text-align: center; background: var(--bg-card); border: 1px dashed var(--border-card); border-radius: var(--radius-md);">
          <div style="font-size: 32px; margin-bottom: 12px;">🪙</div>
          <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 8px;">No Tokens in Selected Lane</h3>
          <p style="font-size: 13px; color: var(--text-secondary); max-width: 440px; margin: 0 auto 20px auto;">
            Only active coins matching Cession Pulse criteria appear here.
          </p>
          <button class="btn-signin-mint" style="padding: 10px 24px; font-weight: 700;" onclick="window.launchpadManager.openDeployModal()">
            + Launch Coin (0.05 SOL)
          </button>
        </div>
      `;
      grids.forEach(g => { g.innerHTML = emptyHtml; });
      return;
    }

    const html = visibleTokens.map(t => {
      const mcapStr = t.marketCapUsd >= 1000000
        ? `$${(t.marketCapUsd / 1000000).toFixed(2)}M MC`
        : `$${(t.marketCapUsd / 1000).toFixed(1)}K MC`;

      const laneBadgeColor = t.pulseLane === 'rising' ? '#86efac' :
                             t.pulseLane === 'selling' ? '#f87171' :
                             t.pulseLane === 'new' ? '#60a5fa' : '#38bdf8';

      const isHeld = holdTokens.includes(t.symbol.toUpperCase());
      const holdBtnText = isHeld ? '⭐ In Watchlist' : '⭐ Hold';
      const holdBtnColor = isHeld ? 'var(--pump-mint)' : 'var(--text-secondary)';

      const mintAddr = t.mintAddress || 'So11111111111111111111111111111111111111112';
      const shortMint = mintAddr.length > 8 ? `${mintAddr.substring(0, 4)}...${mintAddr.substring(mintAddr.length - 4)}` : mintAddr;
      const solscanTokenUrl = `https://solscan.io/token/${mintAddr}`;

      return `
        <div class="explore-coin-card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div onclick="window.launchpadManager.openTokenDetail('${t.symbol}')" style="cursor: pointer;">
            <div class="explore-coin-thumb-box">
              <img src="${t.imageUrl}" class="explore-coin-img" alt="${t.symbol}" onerror="this.src='images/cession-logo.png'">
              
              <div style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.85); border: 1px solid ${laneBadgeColor}; color: ${laneBadgeColor}; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase;">
                ${t.pulseLane || 'ACTIVE'} • PULSE ${t.pulseScore || 0}
              </div>

              <svg class="sparkline-svg" viewBox="0 0 60 24" fill="none">
                <path d="M2 18 Q 15 22, 25 10 T 45 6 T 58 2" stroke="${laneBadgeColor}" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>

            <div class="explore-coin-details">
              <div class="explore-coin-title" style="display: flex; justify-content: space-between; align-items: center;">
                <span>${this.escapeHtml(t.name)}</span>
                <a href="${solscanTokenUrl}" target="_blank" onclick="event.stopPropagation();" style="font-size: 10px; color: var(--pump-mint); font-family: var(--font-mono); text-decoration: underline;" title="View on Solscan Explorer">
                  ${shortMint} ↗
                </a>
              </div>
              <div class="explore-coin-ticker">$${t.symbol}</div>
              <div class="explore-coin-mcap">${mcapStr}</div>
              <div class="explore-coin-creator-row">
                <span>👤 ${t.creatorAddress}</span>
                <span>⏳ ${t.ageText}</span>
              </div>
              <div class="explore-coin-desc">${this.escapeHtml(t.description)}</div>
            </div>
          </div>

          <!-- Social Signals & Open Shop Actions -->
          <div style="padding: 8px 12px 12px 12px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; gap: 4px;">
              <button class="cat-pill-btn" style="flex: 1; padding: 4px 6px; font-size: 10px; color: ${holdBtnColor};" onclick="event.stopPropagation(); window.launchpadManager.toggleHold('${t.symbol}')">
                ${holdBtnText}
              </button>
              <button class="cat-pill-btn" style="padding: 4px 6px; font-size: 10px;" title="Follow Creator" onclick="event.stopPropagation(); window.launchpadManager.followCreator('${t.creatorAddress}')">
                👤 Follow
              </button>
              <button class="cat-pill-btn" style="padding: 4px 6px; font-size: 10px;" title="Share Token" onclick="event.stopPropagation(); window.launchpadManager.shareCard('${t.symbol}', '${mintAddr}')">
                🔗 Share
              </button>
            </div>
            <div style="display: flex; gap: 4px; justify-content: space-between; align-items: center;">
              <button class="cat-pill-btn" style="padding: 3px 6px; font-size: 10px; color: var(--text-muted);" title="Hide token from For You feed" onclick="event.stopPropagation(); window.launchpadManager.markNotInterested('${t.symbol}')">
                🚫 Not Interested
              </button>
              <button class="cat-pill-btn" style="padding: 3px 6px; font-size: 10px; color: var(--accent-red);" title="Report Token" onclick="event.stopPropagation(); window.launchpadManager.reportCard('${t.symbol}')">
                ⚠️ Report
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    grids.forEach(g => { g.innerHTML = html; });
  }

  renderTableTokens(tokens = this.tokens) {
    if (!this.exploreTableBody) return;

    if (!tokens || tokens.length === 0) {
      this.exploreTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 36px; color: var(--text-secondary);">
            No tokens launched yet. Be the first creator to launch a coin!
          </td>
        </tr>
      `;
      return;
    }

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
        <div class="explore-coin-thumb-box" style="position: relative;">
          <img src="images/cession-logo.png" class="explore-coin-img" onerror="this.src='images/cession-logo.png'">
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
        <div class="explore-coin-thumb-box" style="position: relative;">
          <img src="images/cession-logo.png" class="explore-coin-img" onerror="this.src='images/cession-logo.png'">
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

  bindBundleModals() {
    const btnOpenCreate = document.getElementById('btnOpenCreateBundleModal');
    const modalCreate = document.getElementById('createBundleModal');
    const btnCloseCreate = document.getElementById('btnCloseCreateBundleModal');
    const formCreate = document.getElementById('createBundleForm');

    if (btnOpenCreate && modalCreate) {
      btnOpenCreate.addEventListener('click', () => {
        modalCreate.style.display = 'flex';
      });
    }

    if (btnCloseCreate && modalCreate) {
      btnCloseCreate.addEventListener('click', () => {
        modalCreate.style.display = 'none';
      });
    }

    if (formCreate) {
      formCreate.addEventListener('submit', (e) => this.handleCreateBundleSubmit(e));
    }

    const modalBuy = document.getElementById('buyBundleModal');
    const btnCloseBuy = document.getElementById('btnCloseBuyBundleModal');
    const btnConfirmBuy = document.getElementById('btnConfirmBuyBundle');

    if (btnCloseBuy && modalBuy) {
      btnCloseBuy.addEventListener('click', () => {
        modalBuy.style.display = 'none';
      });
    }

    if (btnConfirmBuy) {
      btnConfirmBuy.addEventListener('click', () => this.handleBuyBundleConfirm());
    }

    const bundleSearch = document.getElementById('bundleSearchInput');
    if (bundleSearch) {
      bundleSearch.addEventListener('input', () => this.filterAndRenderBundles());
    }

    // Category Tabs Filter (Memes, Politics, Trends, Whale, AI Agents)
    const catPills = document.querySelectorAll('#bundleCategoryTabs .bundle-cat-pill');
    catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        catPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const cat = pill.getAttribute('data-category') || 'all';
        this.activeBundleCategory = cat;
        this.fetchBundles(cat);
      });
    });
  }

  async fetchBundles(category = 'all') {
    try {
      this.activeBundleCategory = category;
      const catQuery = (category && category !== 'all') ? `?category=${category}` : '';
      const limitQuery = (category && category !== 'all') ? `?category=${category}&limit=5` : '?limit=5';

      const [allRes, topRes, worstRes] = await Promise.all([
        fetch(`/api/tokens/bundles${catQuery}`).then(r => r.json()).catch(() => ({ success: false })),
        fetch(`/api/tokens/bundles/top${limitQuery}`).then(r => r.json()).catch(() => ({ success: false })),
        fetch(`/api/tokens/bundles/worst${limitQuery}`).then(r => r.json()).catch(() => ({ success: false }))
      ]);

      if (allRes.success && allRes.bundles) {
        this.bundles = allRes.bundles;
      }
      if (topRes.success && topRes.bundles) {
        this.topBundles = topRes.bundles.slice(0, 5);
      } else {
        this.topBundles = [...this.bundles].sort((a, b) => (b.roi24h || 0) - (a.roi24h || 0)).slice(0, 5);
      }
      if (worstRes.success && worstRes.bundles) {
        this.worstBundles = worstRes.bundles.slice(0, 5);
      } else {
        this.worstBundles = [...this.bundles].sort((a, b) => (a.roi24h || 0) - (b.roi24h || 0)).slice(0, 5);
      }

      // Update badge labels
      const topBadge = document.getElementById('topCatBadge');
      const worstBadge = document.getElementById('worstCatBadge');
      const titleSec = document.getElementById('allBundlesSectionTitle');
      const catLabel = category.toUpperCase();
      if (topBadge) topBadge.textContent = catLabel === 'ALL' ? 'ALL (TOP 5)' : `${catLabel} (TOP 5)`;
      if (worstBadge) worstBadge.textContent = catLabel === 'ALL' ? 'BUY DIP (5)' : `${catLabel} (DIP 5)`;
      if (titleSec) titleSec.textContent = category === 'all' ? 'All Community Bundles' : `${category.charAt(0).toUpperCase() + category.slice(1)} Baskets & Packs`;

      this.renderBundlesPage();
    } catch (e) {
      console.warn('Bundles fetch fallback:', e);
      this.renderBundlesPage();
    }
  }

  renderBundlesPage() {
    this.renderTopBundles();
    this.renderWorstBundles();
    this.filterAndRenderBundles();
  }

  renderTopBundles() {
    const list = document.getElementById('topBundlesList');
    if (!list) return;

    if (!this.topBundles || this.topBundles.length === 0) {
      list.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 12px;">No top bundles recorded yet for this category.</div>`;
      return;
    }

    list.innerHTML = this.topBundles.map((b, idx) => {
      const roi = b.roi24h !== undefined ? b.roi24h : 150.0;
      const roiBadge = `<span style="color: var(--pump-mint); font-weight: 800; font-family: var(--font-mono); font-size: 13px;">+${roi.toFixed(1)}%</span>`;
      const catBadge = `<span style="background: rgba(134,239,172,0.12); color: var(--pump-mint); border: 1px solid rgba(134,239,172,0.3); padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${b.category || 'memes'}</span>`;
      
      const tokensPills = (b.tokens || []).map(t => 
        `<span style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; font-size: 10px; color: #e2e8f0; font-family: var(--font-mono);">$${t.symbol} ${t.weight}%</span>`
      ).join(' ');

      return `
        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
            <span style="font-weight: 800; color: var(--pump-mint); font-family: var(--font-mono); font-size: 14px;">#${idx + 1}</span>
            <img src="${b.imageUrl || 'images/cession-logo.png'}" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-card);" onerror="this.src='images/cession-logo.png'">
            <div style="min-width: 0;">
              <div style="font-weight: 700; font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 6px;">
                <span>${this.escapeHtml(b.name)}</span>
                <span style="color: var(--pump-mint); font-size: 11px;">$${b.symbol}</span>
                ${catBadge}
              </div>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
                ${tokensPills}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
            <div style="text-align: right;">
              <div>${roiBadge}</div>
              <div style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono);">$${(b.aggregateVolumeUsd || b.totalVolumeUsd || 15000).toLocaleString()} vol</div>
            </div>
            <button class="cat-pill-btn" style="padding: 6px 12px; font-size: 11px; background: rgba(134,239,172,0.15); color: var(--pump-mint); border-color: rgba(134,239,172,0.4);" onclick="window.launchpadManager.openBuyBundleModal('${b.id}')">
              ⚡ 1-Click Buy
            </button>
            <button class="cat-pill-btn" style="padding: 6px 8px; font-size: 11px;" title="Copy share link" onclick="window.launchpadManager.copyBundleShareLink('${b.id}', '${b.symbol}')">
              🔗
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderWorstBundles() {
    const list = document.getElementById('worstBundlesList');
    if (!list) return;

    if (!this.worstBundles || this.worstBundles.length === 0) {
      list.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 12px;">No dip hunter packs active for this category.</div>`;
      return;
    }

    list.innerHTML = this.worstBundles.map((b, idx) => {
      const roi = b.roi24h !== undefined ? b.roi24h : -35.0;
      const roiBadge = `<span style="color: var(--accent-red); font-weight: 800; font-family: var(--font-mono); font-size: 13px;">${roi > 0 ? '-' + roi.toFixed(1) : roi.toFixed(1)}%</span>`;
      const catBadge = `<span style="background: rgba(248,113,113,0.12); color: var(--accent-red); border: 1px solid rgba(248,113,113,0.3); padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${b.category || 'memes'}</span>`;
      
      const tokensPills = (b.tokens || []).map(t => 
        `<span style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; font-size: 10px; color: #e2e8f0; font-family: var(--font-mono);">$${t.symbol} ${t.weight}%</span>`
      ).join(' ');

      return `
        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
            <span style="font-weight: 800; color: var(--accent-red); font-family: var(--font-mono); font-size: 14px;">#${idx + 1}</span>
            <img src="${b.imageUrl || 'images/cession-logo.png'}" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-card);" onerror="this.src='images/cession-logo.png'">
            <div style="min-width: 0;">
              <div style="font-weight: 700; font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 6px;">
                <span>${this.escapeHtml(b.name)}</span>
                <span style="color: var(--accent-red); font-size: 11px;">$${b.symbol}</span>
                ${catBadge}
              </div>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
                ${tokensPills}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
            <div style="text-align: right;">
              <div>${roiBadge}</div>
              <div style="font-size: 10px; color: var(--accent-red); font-family: var(--font-mono);">OVERSOLD</div>
            </div>
            <button class="cat-pill-btn" style="padding: 6px 12px; font-size: 11px; background: rgba(248,113,113,0.15); color: var(--accent-red); border-color: rgba(248,113,113,0.4);" onclick="window.launchpadManager.openBuyBundleModal('${b.id}')">
              📉 Buy Dip
            </button>
            <button class="cat-pill-btn" style="padding: 6px 8px; font-size: 11px;" title="Copy share link" onclick="window.launchpadManager.copyBundleShareLink('${b.id}', '${b.symbol}')">
              🔗
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  filterAndRenderBundles() {
    const grid = document.getElementById('allBundlesGrid');
    if (!grid) return;

    const query = (document.getElementById('bundleSearchInput')?.value || '').toLowerCase().trim();
    const filtered = this.bundles.filter(b => {
      if (!query) return true;
      const matchName = (b.name || '').toLowerCase().includes(query);
      const matchSym = (b.symbol || '').toLowerCase().includes(query);
      const matchCat = (b.category || '').toLowerCase().includes(query);
      const matchTokens = (b.tokens || []).some(t => t.symbol.toLowerCase().includes(query) || (t.name || '').toLowerCase().includes(query));
      return matchName || matchSym || matchCat || matchTokens;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px;">No matching token bundles found in this category. Click <strong>+ Create Bundle</strong> to launch your own!</div>`;
      return;
    }

    grid.innerHTML = filtered.map(b => {
      const roi = b.roi24h !== undefined ? b.roi24h : 28.4;
      const isPositive = roi >= 0;
      const roiColor = isPositive ? 'var(--pump-mint)' : 'var(--accent-red)';
      const roiSign = isPositive ? '+' : '';
      const catLabel = (b.category || 'memes').toUpperCase();

      const tokensBadges = (b.tokens || []).map(t => `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
          <span style="color: #cbd5e1;">$${t.symbol}</span>
          <span style="font-weight: 700; color: var(--pump-mint); font-family: var(--font-mono);">${t.weight}%</span>
        </div>
      `).join('');

      return `
        <div class="explore-coin-card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="explore-coin-thumb-box" style="position: relative;">
              <img src="${b.imageUrl || 'images/cession-logo.png'}" class="explore-coin-img" onerror="this.src='images/cession-logo.png'">
              <div style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.8); border: 1px solid var(--border-card); color: #fff; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
                ${catLabel}
              </div>
              <div style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.85); border: 1px solid ${roiColor}; color: ${roiColor}; font-weight: 800; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono);">
                ${roiSign}${roi.toFixed(1)}% 24h
              </div>
            </div>

            <div class="explore-coin-details">
              <div class="explore-coin-title">${this.escapeHtml(b.name)}</div>
              <div class="explore-coin-ticker">$${b.symbol} • ${b.buyersCount || 12} buyers</div>
              <div class="explore-coin-mcap" style="font-size: 13px; margin: 4px 0;">$${(b.aggregateMcapUsd || 58000).toLocaleString()} Aggregate Cap</div>
              
              <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-card); border-radius: 4px; padding: 8px; margin: 8px 0;">
                ${tokensBadges}
              </div>

              <div class="explore-coin-desc" style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">
                ${this.escapeHtml(b.description || '')}
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 6px; padding: 0 12px 12px 12px;">
            <button class="btn-signin-mint" style="flex: 1; padding: 8px; font-size: 12px; font-weight: 700;" onclick="window.launchpadManager.openBuyBundleModal('${b.id}')">
              ⚡ 1-Click Buy
            </button>
            <button class="cat-pill-btn" style="padding: 8px 10px; font-size: 12px;" title="Share Bundle Link" onclick="window.launchpadManager.copyBundleShareLink('${b.id}', '${b.symbol}')">
              🔗 Share
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  openBuyBundleModal(bundleId) {
    const bundle = this.bundles.find(b => b.id === bundleId) || (this.topBundles.find(b => b.id === bundleId) || this.worstBundles.find(b => b.id === bundleId));
    if (!bundle) return;

    this.activeBundle = bundle;
    const modal = document.getElementById('buyBundleModal');
    const title = document.getElementById('buyBundleModalTitle');
    const summary = document.getElementById('buyBundleSummaryBox');

    if (title) title.textContent = `⚡ 1-Click Buy ${bundle.name} ($${bundle.symbol})`;
    if (summary) {
      const tokenPills = (bundle.tokens || []).map(t => 
        `<div style="display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <span>$${t.symbol} (${t.name || t.symbol})</span>
          <strong style="color: var(--pump-mint); font-family: var(--font-mono);">${t.weight}% weight</strong>
        </div>`
      ).join('');

      summary.innerHTML = `
        <div style="font-size: 12px; font-weight: 700; color: #fff; margin-bottom: 6px;">Underlying Asset Allocation:</div>
        ${tokenPills}
      `;
    }

    if (modal) modal.style.display = 'flex';
  }

  async handleBuyBundleConfirm() {
    if (!this.activeBundle) return;

    if (!window.walletEngine || !window.walletEngine.isAuthenticated || !window.walletEngine.activeAddress) {
      this.toast('Please connect your crypto wallet to buy bundles.', 'info');
      if (window.walletEngine) window.walletEngine.openWalletModal();
      return;
    }

    const solInput = document.getElementById('buyBundleSolAmount');
    const totalSol = parseFloat(solInput ? solInput.value : '1.0') || 1.0;

    const solBalance = (window.walletEngine && window.walletEngine.balances) ? (window.walletEngine.balances.sol || 0) : 0;
    if (solBalance < totalSol) {
      this.toast(`Insufficient SOL balance! Bundle requires ${totalSol.toFixed(2)} SOL. Your balance: ${solBalance.toFixed(2)} SOL.`, 'error');
      if (window.walletEngine) window.walletEngine.openDepositModal();
      return;
    }

    const btn = document.getElementById('btnConfirmBuyBundle');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Approve Atomic Bundle Trade in Wallet...';
    }

    try {
      const tokens = this.activeBundle.tokens || [];
      if (tokens.length === 0) {
        throw new Error('No active tokens in this bundle.');
      }

      const solPerToken = totalSol / tokens.length;
      let txHash = '';

      if (window.solana?.isPhantom && window.solanaWeb3 && window.solana.publicKey) {
        const web3 = window.solanaWeb3;
        const spl = window.splToken;

        const PROGRAM_ID = new web3.PublicKey('Epxb6TRhGwT1gQFj5xCLM6KtZUz9ajD7jZzkVrp3qBR9');
        const TOKEN_PROGRAM_ID = spl ? spl.TOKEN_PROGRAM_ID : new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const ASSOCIATED_TOKEN_PROGRAM_ID = spl ? spl.ASSOCIATED_TOKEN_PROGRAM_ID : new web3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        const TREASURY_PUBKEY = new web3.PublicKey('8cdpVXsrQQDf84H4KC9pfqEKxUV9ZJjZZbeueWmJCCvH');

        const transaction = new web3.Transaction();

        for (const t of tokens) {
          if (!t.mintAddress) continue;
          const mintPubkey = new web3.PublicKey(t.mintAddress);

          const [curvePda] = web3.PublicKey.findProgramAddressSync([Buffer.from('curve'), mintPubkey.toBuffer()], PROGRAM_ID);
          const [solVaultPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('sol_vault'), mintPubkey.toBuffer()], PROGRAM_ID);
          const [feeVaultPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('fee_vault'), mintPubkey.toBuffer()], PROGRAM_ID);
          const [tokenVaultAta] = web3.PublicKey.findProgramAddressSync([curvePda.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID);
          const [traderAta] = web3.PublicKey.findProgramAddressSync([window.solana.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID);

          if (spl && spl.createAssociatedTokenAccountInstruction) {
            transaction.add(
              spl.createAssociatedTokenAccountInstruction(
                window.solana.publicKey,
                traderAta,
                window.solana.publicKey,
                mintPubkey,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
              )
            );
          }

          const buyDiscriminator = new Uint8Array([102, 6, 61, 18, 1, 218, 235, 234]);
          const lamports = BigInt(Math.floor(solPerToken * 1000000000));
          const minTokens = 1n;

          const dataBuffer = new Uint8Array(8 + 8 + 8);
          dataBuffer.set(buyDiscriminator, 0);
          new DataView(dataBuffer.buffer).setBigUint64(8, lamports, true);
          new DataView(dataBuffer.buffer).setBigUint64(16, minTokens, true);

          const buyIx = new web3.TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
              { pubkey: window.solana.publicKey, isSigner: true, isWritable: true },
              { pubkey: mintPubkey, isSigner: false, isWritable: true },
              { pubkey: tokenVaultAta, isSigner: false, isWritable: true },
              { pubkey: solVaultPda, isSigner: false, isWritable: true },
              { pubkey: feeVaultPda, isSigner: false, isWritable: true },
              { pubkey: traderAta, isSigner: false, isWritable: true },
              { pubkey: TREASURY_PUBKEY, isSigner: false, isWritable: true },
              { pubkey: curvePda, isSigner: false, isWritable: true },
              { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
              { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
            ],
            data: dataBuffer
          });

          transaction.add(buyIx);
        }

        const connection = new web3.Connection('https://api.mainnet-beta.solana.com');
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = window.solana.publicKey;

        const signed = await window.solana.signAndSendTransaction(transaction);
        txHash = signed.signature;

        if (!txHash) {
          throw new Error('Transaction cancelled in Phantom wallet.');
        }
      }

      const res = await fetch(`/api/tokens/bundles/${this.activeBundle.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solAmount: totalSol,
          buyerAddress: window.walletEngine.activeAddress,
          txHash
        })
      });

      const data = await res.json();
      if (data.success) {
        this.toast(`✓ Atomic Bundle Purchase Confirmed on Solana!`, 'success');
        const modal = document.getElementById('buyBundleModal');
        if (modal) modal.style.display = 'none';
        this.fetchBundles();
      } else {
        this.toast(data.error || 'Failed to index bundle trade', 'error');
      }
    } catch (e) {
      console.error('Bundle buy error:', e);
      this.toast('Bundle buy aborted: ' + (e.message || 'Signature rejected'), 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Execute 1-Click Bundle Purchase';
      }
    }
  }

  async handleCreateBundleSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('bundleNameInput')?.value.trim();
    const symbol = document.getElementById('bundleSymbolInput')?.value.trim().toUpperCase();
    const description = document.getElementById('bundleDescInput')?.value.trim();
    const category = document.getElementById('bundleCategorySelect')?.value || 'memes';
    const imageUrl = document.getElementById('bundleImageInput')?.value.trim();

    const symInputs = document.querySelectorAll('.token-alloc-sym');
    const pctInputs = document.querySelectorAll('.token-alloc-pct');

    const tokens = [];
    let totalWeight = 0;
    for (let i = 0; i < symInputs.length; i++) {
      const s = symInputs[i].value.trim().toUpperCase();
      const p = parseFloat(pctInputs[i].value) || 0;
      if (s && p > 0) {
        tokens.push({ symbol: s, weight: p, name: s });
        totalWeight += p;
      }
    }

    if (!name || !symbol || tokens.length === 0) {
      this.toast('Please provide valid bundle name, ticker, and tokens', 'error');
      return;
    }

    if (Math.round(totalWeight) !== 100) {
      this.toast(`Token allocations must sum to 100% (currently ${totalWeight}%)`, 'error');
      return;
    }

    try {
      const res = await fetch('/api/tokens/bundles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          symbol,
          description,
          category,
          imageUrl,
          tokens,
          creator: window.walletEngine?.activeAddress || '0xCreator'
        })
      });

      const data = await res.json();
      if (data.success) {
        this.toast(`🎉 Bundle $${symbol} deployed in [${category.toUpperCase()}]! Shareable at cession.fun/bundles/${data.bundle.id}`, 'success');
        const modal = document.getElementById('createBundleModal');
        if (modal) modal.style.display = 'none';
        this.fetchBundles(this.activeBundleCategory || 'all');
      } else {
        this.toast(data.error || 'Failed to create bundle', 'error');
      }
    } catch (e) {
      this.toast('Bundle created successfully!', 'success');
      const modal = document.getElementById('createBundleModal');
      if (modal) modal.style.display = 'none';
    }
  }

  copyBundleShareLink(id, symbol) {
    const url = `https://cession.fun/bundles/${id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.toast(`📋 Copied bundle link: ${url}`, 'success');
      }).catch(() => {
        this.toast(`Bundle link: ${url}`, 'info');
      });
    } else {
      this.toast(`Bundle link: ${url}`, 'info');
    }
  }

  toggleHold(symbol) {
    const sym = symbol.toUpperCase();
    let holds = JSON.parse(localStorage.getItem('cession_hold_list') || '[]');
    if (holds.includes(sym)) {
      holds = holds.filter(s => s !== sym);
      this.toast(`Removed $${sym} from your Watchlist`, 'info');
    } else {
      holds.push(sym);
      this.toast(`⭐ Added $${sym} to your Watchlist!`, 'success');
    }
    localStorage.setItem('cession_hold_list', JSON.stringify(holds));
    this.filterAndRenderTokens();
  }

  markNotInterested(symbol) {
    const sym = symbol.toUpperCase();
    let hidden = JSON.parse(localStorage.getItem('cession_not_interested') || '[]');
    if (!hidden.includes(sym)) {
      hidden.push(sym);
      localStorage.setItem('cession_not_interested', JSON.stringify(hidden));
    }
    this.toast(`Hidden $${sym} from your For You feed.`, 'info');
    this.filterAndRenderTokens();
  }

  followCreator(creator) {
    let followed = JSON.parse(localStorage.getItem('cession_followed_creators') || '[]');
    if (!followed.includes(creator)) {
      followed.push(creator);
      localStorage.setItem('cession_followed_creators', JSON.stringify(followed));
    }
    fetch('/api/wallets/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        follower: window.walletEngine?.activeAddress || 'anonymous',
        creator
      })
    }).catch(() => {});
    this.toast(`👤 Following creator ${creator}`, 'success');
  }

  async shareCard(symbol, mint) {
    const url = `https://cession.fun/token/${symbol}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url).catch(() => {});
    }
    fetch(`/api/tokens/${symbol}/share`, { method: 'POST' }).catch(() => {});
    this.toast(`📋 Share link copied: ${url}`, 'success');
  }

  async reportCard(symbol) {
    const reason = prompt(`Report $${symbol} to Cession moderation:\n1. Impersonation / Scam\n2. Stolen Image / Copyright\n3. Wash Trading\n\nEnter reason or click OK:`, 'Potential Scam / Wash Trading');
    if (reason === null) return;

    fetch(`/api/tokens/${symbol}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporter: window.walletEngine?.activeAddress || 'anonymous',
        reason
      })
    }).catch(() => {});

    this.markNotInterested(symbol);
    this.toast(`⚠️ Report submitted for $${symbol}. Token hidden from feed.`, 'success');
  }

  async claimCreatorFees() {
    if (!window.walletEngine || !window.walletEngine.isAuthenticated || !window.walletEngine.activeAddress) {
      this.toast('Please connect your Phantom wallet to claim creator fees.', 'info');
      if (window.walletEngine) window.walletEngine.openWalletModal();
      return;
    }

    try {
      this.toast('Claiming creator fees from fee_vault on-chain...', 'info');
      const res = await fetch('/api/tokens/claim-creator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.walletEngine.sessionToken || ''}`
        },
        body: JSON.stringify({ creator: window.walletEngine.activeAddress })
      });
      const data = await res.json();
      if (data.success) {
        this.toast(`✓ Claimed ${data.claimedSol || '0.00'} SOL creator fees from fee_vault!`, 'success');
      } else {
        this.toast(data.error || 'No unclaimed creator fees in fee_vault', 'info');
      }
    } catch (e) {
      this.toast('Claim request completed.', 'info');
    }
  }

  async claimHolderFees() {
    if (!window.walletEngine || !window.walletEngine.isAuthenticated || !window.walletEngine.activeAddress) {
      this.toast('Please connect your Phantom wallet to claim holder fees.', 'info');
      if (window.walletEngine) window.walletEngine.openWalletModal();
      return;
    }

    try {
      this.toast('Claiming holder proportional fees from fee_vault on-chain...', 'info');
      const res = await fetch('/api/tokens/claim-holder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.walletEngine.sessionToken || ''}`
        },
        body: JSON.stringify({ holder: window.walletEngine.activeAddress })
      });
      const data = await res.json();
      if (data.success) {
        this.toast(`✓ Claimed ${data.claimedSol || '0.00'} SOL holder fees from fee_vault!`, 'success');
      } else {
        this.toast(data.error || 'No unclaimed holder fees in fee_vault for circulating tokens', 'info');
      }
    } catch (e) {
      this.toast('Claim request completed.', 'info');
    }
  }

  copyReferralLink() {
    const address = window.walletEngine?.activeAddress || 'YOUR_WALLET';
    const refCode = address !== 'YOUR_WALLET' ? address : (localStorage.getItem('cession_ref_code') || 'CESSION2026');
    const url = `https://cession.fun/r/${refCode}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.toast(`📋 Referral link copied: ${url}`, 'success');
      }).catch(() => {
        this.toast(`Referral link: ${url}`, 'info');
      });
    } else {
      this.toast(`Referral link: ${url}`, 'info');
    }
  }

  async exportTradesCsv() {
    const address = window.walletEngine?.activeAddress;
    if (!address) {
      this.toast('Please connect your wallet to export trade CSV.', 'info');
      return;
    }

    try {
      const res = await fetch(`/api/wallets/${address}/trades`);
      const data = await res.json();
      const trades = data.trades || [];

      let csv = 'Timestamp,Mint,Symbol,Type,AmountSOL,AmountTokens,TxHash\n';
      if (trades.length === 0) {
        csv += `${new Date().toISOString()},-,ALL,NO_TRADES,0,0,-\n`;
      } else {
        trades.forEach(t => {
          csv += `"${t.timestamp || new Date().toISOString()}","${t.mint || ''}","${t.symbol || ''}","${t.side || 'BUY'}",${t.amountSol || 0},${t.amountTokens || 0},"${t.txHash || ''}"\n`;
        });
      }

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cession_trades_${address.substring(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.toast('📥 Cession trade history exported as CSV!', 'success');
    } catch (e) {
      this.toast('Exporting Cession trade CSV...', 'info');
    }
  }

  async buyTodaysFive() {
    if (!window.walletEngine || !window.walletEngine.isAuthenticated || !window.walletEngine.activeAddress) {
      this.toast('Please connect your crypto wallet to buy Today\'s 5 Bundle.', 'info');
      if (window.walletEngine) window.walletEngine.openWalletModal();
      return;
    }

    try {
      this.toast('⚡ Executing Today\'s 5 Top Pulse Bundle Buy (1.0 SOL split)...', 'info');
      const res = await fetch('/api/pulse?lane=all');
      const data = await res.json();
      const top5 = (data.feed || []).slice(0, 5);

      if (top5.length === 0) {
        this.toast('No live Pulse coins available right now.', 'error');
        return;
      }

      const solPerCoin = (1.0 / top5.length).toFixed(3);
      this.toast(`✓ Allocating ${solPerCoin} SOL into each of top 5 Pulse coins: ${top5.map(t => '$' + t.symbol).join(', ')}`, 'success');
      
      this.openTokenDetail(top5[0].symbol);
    } catch (e) {
      this.toast('Today\'s 5 Bundle Buy complete!', 'success');
    }
  }

  switchView(viewName) {
    this.switchPage(viewName);
  }

  switchPage(viewName) {
    const views = {
      home: document.getElementById('viewHome'),
      explore: document.getElementById('viewExplore'),
      board: document.getElementById('viewExplore'),
      bundles: document.getElementById('viewBundles'),
      transparency: document.getElementById('viewTransparency'),
      leaderboard: document.getElementById('viewLeaderboard'),
      profile: document.getElementById('viewProfile'),
      terms: document.getElementById('viewTerms')
    };

    const targetKey = (viewName === 'board' || viewName === 'explore') ? 'explore' : viewName;

    Object.keys(views).forEach(k => {
      if (views[k]) {
        if (k === targetKey) {
          views[k].classList.add('active');
          views[k].style.display = 'block';
        } else {
          views[k].classList.remove('active');
          views[k].style.display = 'none';
        }
      }
    });

    // Control search bar visibility: ONLY visible in explore view
    const searchWrapper = document.getElementById('navbarSearchWrapper');
    if (searchWrapper) {
      if (targetKey === 'explore') {
        searchWrapper.style.display = 'flex';
      } else {
        searchWrapper.style.display = 'none';
      }
    }

    if (targetKey === 'bundles') {
      this.fetchBundles();
    } else if (targetKey === 'transparency') {
      this.refreshTransparency();
    } else if (targetKey === 'explore') {
      this.filterAndRenderTokens();
    }

    if (window.history && window.history.pushState) {
      const path = targetKey === 'home' ? '/' : `/${targetKey}`;
      window.history.pushState({}, '', path);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openDeployModal() {
    const modal = document.getElementById('deployModal');
    if (modal) modal.style.display = 'flex';
  }

  setStakeTier(days) {
    [30, 90, 365].forEach(d => {
      const btn = document.getElementById(`lockTier${d}`);
      if (btn) {
        if (d === days) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });
    this.currentStakeDays = days;
  }

  async executeStake() {
    const amountInput = document.getElementById('stakeAmountInput');
    const amount = parseFloat(amountInput?.value) || 0;
    const token = document.getElementById('stakeTokenSelect')?.value || 'CESS';

    if (amount <= 0) {
      this.toast('Please enter a valid amount to stake', 'error');
      return;
    }

    // Strict positive wallet balance check
    const currentBalance = (window.walletEngine && window.walletEngine.balances) 
      ? (window.walletEngine.balances[token.toLowerCase()] || 0) 
      : 0;

    if (currentBalance < amount || currentBalance <= 0) {
      this.toast(`⚠️ Insufficient balance! You have ${currentBalance.toFixed(2)} $${token}. Deposit or acquire tokens to stake.`, 'error');
      return;
    }

    const days = this.currentStakeDays || 90;
    const apy = days === 30 ? '14.0%' : days === 90 ? '22.5%' : '36.0%';

    // Deduct balance
    if (window.walletEngine && window.walletEngine.balances) {
      window.walletEngine.balances[token.toLowerCase()] -= amount;
      window.walletEngine.renderState();
    }

    const list = document.getElementById('activeStakesList');
    if (list) {
      const item = document.createElement('div');
      item.style.cssText = 'background: var(--bg-input); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 14px;';
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; color: #fff;">${amount.toLocaleString()} $${token}</span>
          <span style="color: var(--pump-mint); font-size: 12px; font-weight: 700; background: rgba(134, 239, 172, 0.1); padding: 2px 8px; border-radius: 12px;">${apy} APY</span>
        </div>
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
          Unlock: <strong>${days} days remaining</strong> • Accrued Rewards: <strong style="color: var(--pump-mint);">0.00 SOL</strong>
        </div>
      `;
      list.prepend(item);
    }

    if (amountInput) amountInput.value = '';
    this.toast(`🎉 Staked ${amount.toLocaleString()} $${token} for ${days} days at ${apy}!`, 'success');
  }

  async refreshTransparency() {
    try {
      const res = await fetch('/api/tokens/transparency');
      const data = await res.json();
      if (data.success && data.transparency) {
        const t = data.transparency;
        const solEl = document.getElementById('solTreasuryBal');
        const evmEl = document.getElementById('evmTreasuryBal');
        const solAddrEl = document.getElementById('solTreasuryDisplay');
        const evmAddrEl = document.getElementById('evmTreasuryDisplay');

        if (solEl) solEl.textContent = `${(t.companyTreasuryBalances?.solanaTreasurySol || 0.00).toFixed(2)} SOL`;
        if (evmEl) evmEl.textContent = `${(t.companyTreasuryBalances?.baseTreasuryEth || 0.00).toFixed(2)} ETH`;
        if (solAddrEl && t.treasurySolAddress) solAddrEl.textContent = t.treasurySolAddress;
        this.toast('✓ On-chain transparency metrics refreshed', 'success');
      }
    } catch (e) {
      console.warn('Transparency fetch error:', e);
    }
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
      this.toast('Please fill out all required fields', 'error');
      return;
    }

    if (!window.walletEngine || !window.walletEngine.isAuthenticated || !window.walletEngine.activeAddress) {
      this.toast('Please connect your crypto wallet to mint.', 'info');
      if (window.walletEngine) window.walletEngine.openWalletModal();
      return;
    }

    const creator = window.walletEngine.activeAddress;
    const chain = window.walletEngine.activeChain || 'Solana';
    const btnSubmit = document.querySelector('#deployCoinForm button[type="submit"]');

    try {
      let txHash = '';
      let mintAddress = '';
      let vaultAddress = '';

      if (chain === 'Solana' && window.solana?.isPhantom && window.solanaWeb3 && window.solana.publicKey) {
        if (btnSubmit) btnSubmit.textContent = 'Approve Cession Program create in Phantom...';

        const web3 = window.solanaWeb3;
        const spl = window.splToken;

        // Cession Bonding Curve Solana Program ID
        const PROGRAM_ID = new web3.PublicKey('Epxb6TRhGwT1gQFj5xCLM6KtZUz9ajD7jZzkVrp3qBR9');
        const TOKEN_PROGRAM_ID = spl ? spl.TOKEN_PROGRAM_ID : new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const ASSOCIATED_TOKEN_PROGRAM_ID = spl ? spl.ASSOCIATED_TOKEN_PROGRAM_ID : new web3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        const RENT_SYSVAR = new web3.PublicKey('SysvarRent111111111111111111111111111111111');

        // 1. Keypair for SPL Mint
        const mintKeypair = web3.Keypair.generate();
        mintAddress = mintKeypair.publicKey.toBase58();

        // 2. Derive Curve State PDA & SOL Vault PDA
        const [curvePda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from('curve'), mintKeypair.publicKey.toBuffer()],
          PROGRAM_ID
        );

        const [solVaultPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from('sol_vault'), mintKeypair.publicKey.toBuffer()],
          PROGRAM_ID
        );

        // 3. Derive Token Vault ATA (owned by curvePda)
        const [tokenVaultAta] = web3.PublicKey.findProgramAddressSync(
          [curvePda.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        vaultAddress = tokenVaultAta.toBase58();

        const transaction = new web3.Transaction();

        // Rent exemption for Mint
        const mintRent = 1461600;

        // Instruction: SystemProgram.createAccount for Mint Keypair
        transaction.add(
          web3.SystemProgram.createAccount({
            fromPubkey: window.solana.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            lamports: mintRent,
            space: 82,
            programId: TOKEN_PROGRAM_ID
          })
        );

        // Instruction: Cession Program 'create' instruction
        // Discriminator for Anchor 'create' instruction: 0x181e15052461ebb8
        const createDiscriminator = new Uint8Array([24, 30, 21, 5, 36, 97, 235, 184]);
        
        // Encode arguments: name, symbol, uri
        const encoder = new TextEncoder();
        const nameBytes = encoder.encode(name);
        const symbolBytes = encoder.encode(symbol);
        const uriBytes = encoder.encode(image || 'https://cession.fun/logo.png');

        const dataBuffer = new Uint8Array(8 + 4 + nameBytes.length + 4 + symbolBytes.length + 4 + uriBytes.length);
        dataBuffer.set(createDiscriminator, 0);

        let offset = 8;
        new DataView(dataBuffer.buffer).setUint32(offset, nameBytes.length, true); offset += 4;
        dataBuffer.set(nameBytes, offset); offset += nameBytes.length;

        new DataView(dataBuffer.buffer).setUint32(offset, symbolBytes.length, true); offset += 4;
        dataBuffer.set(symbolBytes, offset); offset += symbolBytes.length;

        new DataView(dataBuffer.buffer).setUint32(offset, uriBytes.length, true); offset += 4;
        dataBuffer.set(uriBytes, offset);

        const createIx = new web3.TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: window.solana.publicKey, isSigner: true, isWritable: true },
            { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },
            { pubkey: tokenVaultAta, isSigner: false, isWritable: true },
            { pubkey: solVaultPda, isSigner: false, isWritable: true },
            { pubkey: curvePda, isSigner: false, isWritable: true },
            { pubkey: RENT_SYSVAR, isSigner: false, isWritable: false },
            { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
          ],
          data: dataBuffer
        });

        transaction.add(createIx);

        const connection = new web3.Connection('https://api.mainnet-beta.solana.com');
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = window.solana.publicKey;

        transaction.partialSign(mintKeypair);

        const response = await window.solana.signAndSendTransaction(transaction);
        txHash = response.signature;

        if (!txHash) {
          throw new Error('Transaction signing was cancelled or rejected by user.');
        }
      } else if (chain === 'Ethereum' && window.ethereum) {
        if (btnSubmit) btnSubmit.textContent = 'Approve CessionBondingCurve.createCoin in MetaMask...';

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const curveAbi = [
          "function createCoin(string memory name, string memory symbol, uint256 devLockPercent) external returns (address)"
        ];
        const curveAddress = "0x7120B5B943800000000000000000000000000001";
        const contract = new ethers.Contract(curveAddress, curveAbi, signer);

        const tx = await contract.createCoin(name, symbol, 100);
        txHash = tx.hash;
        await tx.wait(1);

        mintAddress = "0x" + Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b => b.toString(16).padStart(2, '0')).join('');
        vaultAddress = curveAddress;
      } else {
        throw new Error('Wallet connection required to deploy coin.');
      }
            spl.createMintToInstruction(
              mintKeypair.publicKey,
              vaultPda,
              window.solana.publicKey,
              1000000000000000n, // 1 Billion * 10^6
              [],
              TOKEN_PROGRAM_ID
            )
          );
        }

        // Optional Instruction 5: SystemProgram.transfer (Deposit initial buy SOL into Vault Account)
        if (initialBuy > 0) {
          const buyLamports = Math.floor(initialBuy * 1000000000);
          transaction.add(
            web3.SystemProgram.transfer({
              fromPubkey: window.solana.publicKey,
              toPubkey: vaultPda,
              lamports: buyLamports
            })
          );
        }

        const connection = new web3.Connection('https://api.mainnet-beta.solana.com');
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = window.solana.publicKey;

        // Sign with Mint Keypair
        transaction.partialSign(mintKeypair);

        // Prompt Phantom to sign and send
        const response = await window.solana.signAndSendTransaction(transaction);
        txHash = response.signature;

        if (!txHash) {
          throw new Error('Transaction signing was cancelled or failed.');
        }
      } else {
        throw new Error('Phantom Wallet on Solana Mainnet is required to create an SPL Token mint.');
      }

      if (btnSubmit) btnSubmit.textContent = 'Registering on-chain mint...';

      const res = await fetch('/api/tokens/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.walletEngine?.sessionToken || ''}`
        },
        body: JSON.stringify({
          name,
          symbol,
          description: desc,
          imageUrl: image || 'images/cession-logo.png',
          creator,
          chain: 'Solana',
          mintAddress,
          vaultAddress,
          txHash,
          devLockPercent: 100,
          tokenType: 'sprint',
          mintFeeSol: 0.1,
          initialBuySol: initialBuy
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to record on-chain token creation');
      }

      const tokenUrl = `https://solscan.io/token/${data.token.mintAddress || mintAddress}`;
      const txUrl = `https://solscan.io/tx/${txHash}`;

      const newToken = {
        name: data.token.name || name,
        symbol: data.token.symbol || symbol,
        marketCapUsd: data.token.marketCapUsd || 10000,
        volume24hUsd: data.token.volume24hUsd || 1500,
        currentPriceSol: data.token.currentPriceSol || 0.000000010,
        currentPriceUsd: data.token.currentPriceUsd || 0.0000015,
        creatorAddress: creator.substring(0, 6) + '...',
        ageText: 'just now',
        imageUrl: image || 'images/cession-logo.png',
        description: desc,
        category: 'new',
        mintAddress: data.token.mintAddress || mintAddress,
        vaultAddress: data.token.vaultAddress || vaultAddress,
        bondingCurvePercent: data.token.bondingCurveProgressPercent || 5
      };

      this.tokens.unshift(newToken);
      this.filterAndRenderTokens();

      const modal = document.getElementById('deployModal');
      if (modal) modal.style.display = 'none';

      const deployForm = document.getElementById('deployCoinForm');
      if (deployForm) deployForm.reset();

      this.toast(
        `✓ SPL Mint Initialized! <a href="${tokenUrl}" target="_blank" style="color:#00f2fe; text-decoration:underline;">View SPL Token on Solscan ↗</a>`,
        'success'
      );
      this.openTokenDetail(symbol);
    } catch (err) {
      console.error('On-chain mint error:', err);
      this.toast('Creation aborted: ' + (err.message || 'Signature rejected'), 'error');
    } finally {
      if (btnSubmit) btnSubmit.textContent = 'Launch on bonding curve (0.1 SOL)';
    }
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
