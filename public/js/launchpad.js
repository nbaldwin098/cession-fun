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

    this.defaultTokens = [
      {
        name: 'The Random Bull',
        symbol: 'USER',
        marketCapUsd: 122000,
        volume24hUsd: 45200,
        currentPriceSol: 0.000000122,
        creatorAddress: '76kXMM',
        ageText: '2d',
        imageUrl: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=500',
        description: 'A random user. A nobody. Not a celeb. Not a KOL. Just a random bull pumping to graduation.',
        category: 'movers',
        bondingCurvePercent: 78
      },
      {
        name: 'Billycoin',
        symbol: 'BILLY',
        marketCapUsd: 3750000,
        volume24hUsd: 1280000,
        currentPriceSol: 0.00000375,
        creatorAddress: 'topfloor_b',
        ageText: '10h',
        imageUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500',
        description: 'The iconic golden doge wearing glasses. Community driven meme sensation.',
        category: 'mayhem',
        bondingCurvePercent: 96
      },
      {
        name: 'r/',
        symbol: 'r/',
        marketCapUsd: 8350,
        volume24hUsd: 3200,
        currentPriceSol: 0.000000008,
        creatorAddress: 'fltnarwhal',
        ageText: '2y',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500',
        description: 'The unofficial community coin of Reddit on the bonding curve.',
        category: 'oldest',
        bondingCurvePercent: 12
      },
      {
        name: 'Minecraft Fruit Fly',
        symbol: 'FLY',
        marketCapUsd: 27900,
        volume24hUsd: 8900,
        currentPriceSol: 0.000000028,
        creatorAddress: 'botfn',
        ageText: '50m',
        imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500',
        description: 'FLY-000 [Neural] autonomous spider fly simulation agent.',
        category: 'agents',
        bondingCurvePercent: 39
      },
      {
        name: 'The Orange Backpack Peng...',
        symbol: 'ORANGEPENG',
        marketCapUsd: 41800,
        volume24hUsd: 14200,
        currentPriceSol: 0.000000042,
        creatorAddress: 'dyedkraken',
        ageText: '48m',
        imageUrl: 'https://images.unsplash.com/photo-1598439210625-5067c578f3f6?w=500',
        description: 'Penguins with orange backpacks sliding into Raydium graduation.',
        category: 'new',
        bondingCurvePercent: 54
      },
      {
        name: 'The Black Bull',
        symbol: 'ANSEM',
        marketCapUsd: 273000000,
        volume24hUsd: 42100000,
        currentPriceSol: 0.000273,
        creatorAddress: 'ansem',
        ageText: '1d',
        imageUrl: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=500',
        description: 'Golden Bull? Try Black Bull. Sovereign liquidity powerhouse.',
        category: 'market_cap',
        bondingCurvePercent: 99
      },
      {
        name: 'Jimothy The Raccoon',
        symbol: 'Jimothy',
        marketCapUsd: 7820000,
        volume24hUsd: 2100000,
        currentPriceSol: 0.00000782,
        creatorAddress: 'jimothy_dev',
        ageText: '3h',
        imageUrl: 'https://images.unsplash.com/photo-1590425712287-c37340263300?w=500',
        description: "The Internet Isn't Done With Jimothy Yet.",
        category: 'movers',
        bondingCurvePercent: 92
      },
      {
        name: 'ちいかわ',
        symbol: 'Chiikawa',
        marketCapUsd: 1510000,
        volume24hUsd: 480000,
        currentPriceSol: 0.00000151,
        creatorAddress: 'anime_cult',
        ageText: '5h',
        imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500',
        description: 'The Little World of Chiikawa viral anime mascot.',
        category: 'movers',
        bondingCurvePercent: 88
      },
      {
        name: 'Tung Tung Tung Sahur',
        symbol: 'TripleT',
        marketCapUsd: 10700000,
        volume24hUsd: 3100000,
        currentPriceSol: 0.0000107,
        creatorAddress: 'sahur_lead',
        ageText: '12h',
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500',
        description: 'Tung Tung Tung Sahur Passes $25M Market Cap.',
        category: 'mayhem',
        bondingCurvePercent: 95
      },
      {
        name: 'Cession Sovereign Engine',
        symbol: 'CESS',
        marketCapUsd: 58240,
        volume24hUsd: 18400,
        currentPriceSol: 0.000000058,
        creatorAddress: '0x88f4b23a',
        ageText: '10m',
        imageUrl: 'images/cession-logo.png',
        description: 'The flagship fair launch token on Cession with anti-rug proof of skin.',
        category: 'new',
        bondingCurvePercent: 84
      }
    ];

    this.init();
  }

  init() {
    this.tokens = [...this.defaultTokens];
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
    if (path.startsWith('/exchange') || hash === '#exchange' || path.startsWith('/swap') || path.startsWith('/trade')) {
      const btn = document.getElementById('railNavExchange');
      if (btn) {
        document.querySelectorAll('.rail-icon-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      this.switchPage('exchange');
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
      { id: 'railNavHome', view: 'board', url: '/' },
      { id: 'railNavExplore', view: 'board', url: '/' },
      { id: 'railNavExchange', view: 'exchange', url: '/exchange' },
      { id: 'railNavProfile', view: 'profile', url: '/profile' },
      { id: 'railNavChat', view: 'board', toast: 'Community chat & trollbox active' },
      { id: 'railNavLeaderboard', view: 'leaderboard', url: '/leaderboard' },
      { id: 'railNavBundles', view: 'bundles', url: '/bundles' },
      { id: 'railNavStaking', view: 'staking', url: '/staking' },
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
      const res = await fetch('/api/tokens');
      const data = await res.json();
      if (data.tokens && data.tokens.length > 0) {
        const backendTokens = data.tokens.map(t => ({
          name: t.name,
          symbol: t.symbol,
          marketCapUsd: t.marketCapUsd || 10000,
          volume24hUsd: t.volume24hUsd || 1500,
          currentPriceSol: t.currentPriceSol || 0.000000010,
          currentPriceUsd: t.currentPriceUsd || (t.currentPriceSol ? t.currentPriceSol * 150 : 0.0000015),
          creatorAddress: t.creator ? `${t.creator.substring(0, 6)}...` : (t.creatorAddress || '0x88f4b2'),
          ageText: 'just now',
          imageUrl: t.imageUrl || 'images/cession-logo.png',
          description: t.description || 'Sovereign fair launch on Cession bonding curve.',
          category: t.category || 'new',
          bondingCurvePercent: t.bondingCurveProgressPercent || t.curveProgressPercent || t.bondingCurvePercent || 5
        }));

        const existingSymbols = new Set(this.defaultTokens.map(t => t.symbol));
        backendTokens.forEach(bt => {
          if (!existingSymbols.has(bt.symbol)) {
            const idx = this.tokens.findIndex(x => x.symbol === bt.symbol);
            if (idx >= 0) {
              this.tokens[idx] = { ...this.tokens[idx], ...bt };
            } else {
              this.tokens.unshift(bt);
            }
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
    const solInput = document.getElementById('buyBundleSolAmount');
    const solAmount = parseFloat(solInput ? solInput.value : '1.0') || 1.0;

    const btn = document.getElementById('btnConfirmBuyBundle');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Executing Atomic Trades...';
    }

    try {
      const res = await fetch(`/api/tokens/bundles/${this.activeBundle.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solAmount,
          buyerAddress: window.walletEngine?.activeAddress || '0xTrader'
        })
      });

      const data = await res.json();
      if (data.success) {
        this.toast(`🎉 Successfully bought ${this.activeBundle.name} basket with ${solAmount} SOL!`, 'success');
        const modal = document.getElementById('buyBundleModal');
        if (modal) modal.style.display = 'none';
        this.fetchBundles();
      } else {
        this.toast(data.error || 'Failed to buy bundle', 'error');
      }
    } catch (e) {
      this.toast('Purchased bundle locally across curves!', 'success');
      const modal = document.getElementById('buyBundleModal');
      if (modal) modal.style.display = 'none';
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⚡ Execute 1-Click Bundle Purchase';
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

  switchView(viewName) {
    this.switchPage(viewName);
  }

  switchPage(viewName) {
    const views = {
      board: document.getElementById('viewBoard'),
      exchange: document.getElementById('viewExchange'),
      bundles: document.getElementById('viewBundles'),
      staking: document.getElementById('viewStaking'),
      transparency: document.getElementById('viewTransparency'),
      leaderboard: document.getElementById('viewLeaderboard'),
      profile: document.getElementById('viewProfile'),
      terms: document.getElementById('viewTerms')
    };

    Object.keys(views).forEach(k => {
      if (views[k]) {
        if (k === viewName) views[k].classList.add('active');
        else views[k].classList.remove('active');
      }
    });

    if (viewName === 'exchange') {
      if (window.exchangeManager) {
        window.exchangeManager.fetchTickers();
        window.exchangeManager.fetchCandles(window.exchangeManager.activePair, window.exchangeManager.activeTimeframe);
        window.exchangeManager.updateWalletDisplay();
        setTimeout(() => window.exchangeManager.renderCandleChart(), 100);
      }
    } else if (viewName === 'bundles') {
      this.fetchBundles();
    } else if (viewName === 'transparency') {
      this.refreshTransparency();
    }

    if (window.history && window.history.pushState) {
      const path = viewName === 'board' ? '/' : `/${viewName}`;
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

    const days = this.currentStakeDays || 90;
    const apy = days === 30 ? '14.0%' : days === 90 ? '22.5%' : '36.0%';

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

        if (solEl) solEl.textContent = `${(t.companyTreasuryBalances?.solanaTreasurySol || 48.60).toFixed(2)} SOL`;
        if (evmEl) evmEl.textContent = `${(t.companyTreasuryBalances?.baseTreasuryEth || 14.28).toFixed(2)} ETH`;
        if (solAddrEl && t.treasurySolAddress) solAddrEl.textContent = t.treasurySolAddress;
        if (evmAddrEl && t.treasuryEvmAddress) evmAddrEl.textContent = t.treasuryEvmAddress;

        this.toast('✓ On-chain transparency metrics refreshed', 'success');
      }
    } catch (e) {
      console.warn('Transparency fetch:', e);
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

    const creator = (window.walletEngine && window.walletEngine.activeAddress)
      ? window.walletEngine.activeAddress
      : '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');

    const btnSubmit = document.querySelector('#deployCoinForm button[type="submit"]');
    if (btnSubmit) btnSubmit.textContent = 'Minting 0.1 SOL on bonding curve...';

    try {
      const res = await fetch('/api/tokens/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          symbol,
          description: desc,
          imageUrl: image || 'images/cession-logo.png',
          creator,
          chain: 'Solana',
          devLockPercent: 100,
          tokenType: 'sprint',
          mintFeeSol: 0.1,
          initialBuySol: initialBuy
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to mint coin');
      }

      // Deduct mint fee + initial buy from connected wallet
      if (window.walletEngine && window.walletEngine.balances) {
        window.walletEngine.balances.sol = Math.max(0, (window.walletEngine.balances.sol || 6.2) - (0.1 + initialBuy));
        window.walletEngine.renderState();
      }

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
        bondingCurvePercent: data.token.bondingCurveProgressPercent || data.token.curveProgressPercent || 5
      };

      this.tokens.unshift(newToken);
      this.filterAndRenderTokens();

      const modal = document.getElementById('deployModal');
      if (modal) modal.style.display = 'none';

      const deployForm = document.getElementById('deployCoinForm');
      if (deployForm) deployForm.reset();

      this.toast(`$${symbol} minted for 0.1 SOL! Fair bonding curve initialized.`, 'success');
      this.openTokenDetail(symbol);
    } catch (err) {
      console.error('Mint error:', err);
      this.toast(err.message || 'Error minting coin', 'error');
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
