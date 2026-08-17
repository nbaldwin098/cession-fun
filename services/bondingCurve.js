/**
 * Calabi Sovereign Bonding Curve & Proof-of-Skin Automated Market Maker Engine
 * Dual Architecture:
 * 1. ⚡ Meme Sprint: High-velocity fair launch with $25,000 sprint cap & automated DEX burn.
 * 2. 🏛️ Sovereign Stack: Grassroots long-term community assets with Diamond Vault staking,
 *    Public vs. Private Circle passcodes, and 1% Anti-Dump Protection.
 */

const fs = require('fs');
const path = require('path');
const DATA_FILE = path.join(__dirname, '..', 'data', 'bonding_state.json');

class BondingCurveEngine {
  constructor() {
    this.tokens = new Map();
    this.traders = new Map();
    this.chatMessages = new Map();
    this.totalProtocolBurnedUsd = 42890.50;
    this.loadStateFromDisk();
  }

  loadStateFromDisk() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.tokens && Array.isArray(parsed.tokens)) {
          parsed.tokens.forEach(t => this.tokens.set(t.symbol, t));
        }
        if (parsed.totalProtocolBurnedUsd) {
          this.totalProtocolBurnedUsd = parsed.totalProtocolBurnedUsd;
        }
      }
    } catch (e) {
      console.warn('Error reading bonding state from disk, initializing defaults:', e.message);
    }

    if (this.tokens.size === 0) {
      this.initSampleTokens();
    }
    this.initSampleTraders();
  }

  resetToCleanDefaults() {
    this.tokens.clear();
    this.initSampleTokens();
    this.saveStateToDisk();
  }

  resetToDefaults() {
    this.resetToCleanDefaults();
  }

  saveStateToDisk() {
    try {
      const dataDir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const payload = {
        totalProtocolBurnedUsd: this.totalProtocolBurnedUsd,
        tokens: Array.from(this.tokens.values())
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
    } catch (e) {
      console.warn('Error saving tokens to disk:', e.message);
    }
  }

  initSampleTokens() {
    const sampleTokens = [
      {
        name: "Cession Sovereign Network",
        symbol: "CESS",
        chain: "Base",
        tokenType: "sprint",
        isPrivate: false,
        description: "The native zero-knowledge governance & fee-redistribution token powering cession.fun launchpad.",
        imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200",
        creator: "0x777A3F98A86e2417C218B14a6Eb339c08B7A6b3D",
        devLockedPercent: 100,
        devTokensLocked: 50000000,
        createdAt: Date.now() - 86400000,
        virtualSolReserves: 28.5,
        virtualTokenReserves: 720000000,
        realSolRaised: 7.8,
        tokensSold: 280000000,
        currentPriceSol: 0.000000045,
        currentPriceUsd: 0.00000675,
        openPrice24hUsd: 0.00000375,
        marketCapUsd: 58240,
        targetCapUsd: 25000,
        volume24hUsd: 148500,
        high24hUsd: 0.00000720,
        low24hUsd: 0.00000360,
        isGraduated: false,
        curveProgressPercent: 96,
        totalBurnedTokens: 4200000,
        holdersCount: 382,
        avgHoldDays: 12,
        timeLockedPercent: 25,
        antiDumpEnabled: false,
        stakingApy: 14.0,
        holders: [
          { address: "0x777A...6b3D (Dev)", balance: 50000000, percentage: 5.0, isDev: true, locked: true },
          { address: "0x9182...4421 (Whale)", balance: 42000000, percentage: 4.2, isDev: false, locked: false },
          { address: "0x1209...8812 (Diamond)", balance: 28000000, percentage: 2.8, isDev: false, locked: false }
        ],
        safetyAudit: {
          score: 98,
          grade: "A+",
          mevProtected: true,
          devVestingLocked: true,
          top10HoldersPercent: 18.2,
          warnings: []
        },
        recentTrades: [
          { id: "tx_1", type: "BUY", amountSol: 1.5, amountTokens: 42857142, usdVal: "225.00", user: "0x88f...1a2", time: "2m ago", mevShielded: true },
          { id: "tx_2", type: "BUY", amountSol: 0.8, amountTokens: 22857142, usdVal: "120.00", user: "0x19c...99e", time: "5m ago", mevShielded: true }
        ]
      },
      {
        name: "Baldwin Sovereign Family Stack",
        symbol: "FAMSTACK",
        chain: "Base",
        tokenType: "stack",
        isPrivate: false,
        description: "Grassroots generational micro-endowment for friends & family. 86% time-locked in Diamond Vault with 1% max daily sell anti-dump protection.",
        imageUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200",
        creator: "0x091A4B8290CC189108a798129034",
        devLockedPercent: 100,
        devTokensLocked: 50000000,
        createdAt: Date.now() - (86400000 * 14),
        virtualSolReserves: 28.0,
        virtualTokenReserves: 750000000,
        realSolRaised: 18.5,
        tokensSold: 250000000,
        currentPriceSol: 0.000000045,
        currentPriceUsd: 0.00000675,
        openPrice24hUsd: 0.00000550,
        marketCapUsd: 22500,
        targetCapUsd: 25000,
        volume24hUsd: 64200,
        high24hUsd: 0.00000700,
        low24hUsd: 0.00000540,
        isGraduated: false,
        curveProgressPercent: 90,
        totalBurnedTokens: 8900000,
        holdersCount: 88,
        avgHoldDays: 142,
        timeLockedPercent: 86,
        antiDumpEnabled: true,
        stakingApy: 28.5,
        stakingPool: {
          totalStakedTokens: 645000000,
          stakers: [
            { id: "stk_1", user: "0x091A...9034", amount: 200000000, durationDays: 365, apy: 36.0 }
          ]
        },
        holders: [
          { address: "0x091A...9034 (Family Trust Lead)", balance: 200000000, percentage: 20.0, isDev: true, locked: true },
          { address: "0x4491...1812 (Circle Member)", balance: 80000000, percentage: 8.0, isDev: false, locked: true }
        ],
        safetyAudit: {
          score: 99,
          grade: "A+",
          mevProtected: true,
          devVestingLocked: true,
          top10HoldersPercent: 28.0,
          warnings: []
        },
        recentTrades: [
          { id: "tx_fam1", type: "BUY", amountSol: 1.0, amountTokens: 25000000, usdVal: "150.00", user: "0x449...812", time: "18m ago", mevShielded: true }
        ]
      },
      {
        name: "Genesis Alpha Founders Circle",
        symbol: "TEAMONE",
        chain: "Base",
        tokenType: "stack",
        isPrivate: true,
        inviteCode: "fam_trust_2026",
        description: "Private invite-only startup & co-worker sovereign stack. Password protected with automatic fee compounding.",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200",
        creator: "0x98bA...2214",
        devLockedPercent: 100,
        devTokensLocked: 40000000,
        createdAt: Date.now() - (86400000 * 7),
        virtualSolReserves: 21.0,
        virtualTokenReserves: 840000000,
        realSolRaised: 11.0,
        tokensSold: 160000000,
        currentPriceSol: 0.000000028,
        currentPriceUsd: 0.00000420,
        openPrice24hUsd: 0.00000350,
        marketCapUsd: 14000,
        targetCapUsd: 25000,
        volume24hUsd: 38500,
        high24hUsd: 0.00000440,
        low24hUsd: 0.00000340,
        isGraduated: false,
        curveProgressPercent: 55,
        totalBurnedTokens: 3100000,
        holdersCount: 24,
        avgHoldDays: 95,
        timeLockedPercent: 92,
        antiDumpEnabled: true,
        stakingApy: 32.0,
        stakingPool: {
          totalStakedTokens: 720000000,
          stakers: []
        },
        holders: [
          { address: "0x98bA...2214 (Founder)", balance: 150000000, percentage: 15.0, isDev: true, locked: true }
        ],
        safetyAudit: {
          score: 98,
          grade: "A+",
          mevProtected: true,
          devVestingLocked: true,
          top10HoldersPercent: 35.0,
          warnings: []
        },
        recentTrades: []
      },
      {
        name: "Quantum Pepe",
        symbol: "QPEPE",
        chain: "Solana",
        tokenType: "sprint",
        isPrivate: false,
        description: "Superconducting green frog riding on high-frequency Solana bonding curves with 100% dev locked.",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200",
        creator: "SoLDev99xFaCe8721990172Bca9012377a0",
        devLockedPercent: 100,
        devTokensLocked: 30000000,
        createdAt: Date.now() - 43200000,
        virtualSolReserves: 18.2,
        virtualTokenReserves: 910000000,
        realSolRaised: 9.6,
        tokensSold: 90000000,
        currentPriceSol: 0.000000022,
        currentPriceUsd: 0.00000330,
        openPrice24hUsd: 0.00000250,
        marketCapUsd: 12000,
        targetCapUsd: 25000,
        volume24hUsd: 92400,
        high24hUsd: 0.00000350,
        low24hUsd: 0.00000240,
        isGraduated: false,
        curveProgressPercent: 48,
        totalBurnedTokens: 2100000,
        holdersCount: 219,
        avgHoldDays: 3,
        timeLockedPercent: 10,
        antiDumpEnabled: false,
        stakingApy: 12.0,
        holders: [
          { address: "SoLDev...7a0 (Dev)", balance: 30000000, percentage: 3.0, isDev: true, locked: true },
          { address: "9xKq...110p", balance: 19000000, percentage: 1.9, isDev: false, locked: false }
        ],
        safetyAudit: {
          score: 95,
          grade: "A",
          mevProtected: true,
          devVestingLocked: true,
          top10HoldersPercent: 12.0,
          warnings: []
        },
        recentTrades: [
          { id: "tx_3", type: "BUY", amountSol: 2.0, amountTokens: 60606060, usdVal: "300.00", user: "4hJ...99a", time: "1m ago", mevShielded: true }
        ]
      },
      {
        name: "Based Doge",
        symbol: "BDOGE",
        chain: "Base",
        tokenType: "sprint",
        isPrivate: false,
        description: "The friendliest sovereign Shiba on Base L2. Zero tax, zero rug, 100% fair.",
        imageUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200",
        creator: "0xBaseDev7718910019230912",
        devLockedPercent: 80,
        devTokensLocked: 20000000,
        createdAt: Date.now() - 14400000,
        virtualSolReserves: 12.0,
        virtualTokenReserves: 980000000,
        realSolRaised: 6.4,
        tokensSold: 20000000,
        currentPriceSol: 0.000000015,
        currentPriceUsd: 0.00000225,
        openPrice24hUsd: 0.00000200,
        marketCapUsd: 8000,
        targetCapUsd: 25000,
        volume24hUsd: 41200,
        high24hUsd: 0.00000240,
        low24hUsd: 0.00000190,
        isGraduated: false,
        curveProgressPercent: 32,
        totalBurnedTokens: 850000,
        holdersCount: 144,
        avgHoldDays: 2,
        timeLockedPercent: 5,
        antiDumpEnabled: false,
        stakingApy: 10.0,
        holders: [
          { address: "0xBase...0912 (Dev)", balance: 20000000, percentage: 2.0, isDev: true, locked: true }
        ],
        safetyAudit: {
          score: 92,
          grade: "A",
          mevProtected: true,
          devVestingLocked: true,
          top10HoldersPercent: 14.5,
          warnings: []
        },
        recentTrades: []
      }
    ];

    sampleTokens.forEach(t => {
      this.tokens.set(t.symbol, t);
      this.chatMessages.set(t.symbol, [
        { user: "AlphaHunter", text: "Dev locked 100% supply, this is going to Raydium/Uniswap tonight 🚀", time: "10m ago", badge: "WHALE" },
        { user: "SovereignBull", text: "Clean bonding curve, MEV shield and staking vault active!", time: "4m ago", badge: "DIAMOND" }
      ]);
    });
  }

  initSampleTraders() {
    const sampleTraders = [
      {
        rank: 1,
        address: "0x88f2B9104A41B6554D597A8D8e2b9F4190b21a2",
        shortAddress: "0x88f...1a2",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=AlphaKing",
        dailyPnlPercent: 184.5,
        dailyProfitUsd: 14250.00,
        totalVolumeUsd: 68400.00,
        tradesCount: 42,
        winRate: 85.7,
        badge: "SOVEREIGN WHALE"
      },
      {
        rank: 2,
        address: "0x19c30A90B1293c8477a10293Fa8b1190412899e",
        shortAddress: "0x19c...99e",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=CryptoKnight",
        dailyPnlPercent: 142.0,
        dailyProfitUsd: 9820.50,
        totalVolumeUsd: 41200.00,
        tradesCount: 29,
        winRate: 79.3,
        badge: "DIAMOND HANDS"
      },
      {
        rank: 3,
        address: "SoLMaster771092Bca01928371900192809123Fa",
        shortAddress: "SoLM...3Fa",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=SolKing",
        dailyPnlPercent: 98.4,
        dailyProfitUsd: 6450.00,
        totalVolumeUsd: 32000.00,
        tradesCount: 18,
        winRate: 72.2,
        badge: "SPEED SNIPER"
      },
      {
        rank: 4,
        address: "0x44b912aBc091823901928170291902837491029",
        shortAddress: "0x44b...029",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=BaseBull",
        dailyPnlPercent: 64.2,
        dailyProfitUsd: 3820.00,
        totalVolumeUsd: 19500.00,
        tradesCount: 14,
        winRate: 64.3,
        badge: "COMMUNITY STACKER"
      }
    ];

    sampleTraders.forEach(trader => {
      this.traders.set(trader.address, trader);
    });
  }

  getAllTokens(sortBy = 'trending', chain = 'all', tokenType = 'all', includePrivate = false, accessKey = null) {
    // If a single string that isn't a known sort option is passed, treat it as an access key
    const knownSorts = ['trending', 'market_cap', 'progress', 'hold_duration', 'locked_percent', 'newest', 'pnl_gainers', 'volume'];
    if (typeof sortBy === 'string' && !knownSorts.includes(sortBy) && !accessKey) {
      accessKey = sortBy;
      sortBy = 'trending';
    }

    let list = Array.from(this.tokens.values()).map(t => this._enrichTokenMetrics(t));
    
    // Privacy filtering: exclude private tokens unless authorized
    if (!includePrivate) {
      list = list.filter(t => !t.isPrivate || (accessKey && t.inviteCode === accessKey));
    }

    // Filter by type: 'all', 'sprint', 'stack'
    if (tokenType !== 'all') {
      list = list.filter(t => (t.tokenType || 'sprint') === tokenType);
    }

    if (chain !== 'all') {
      list = list.filter(t => t.chain.toLowerCase() === chain.toLowerCase());
    }

    if (sortBy === 'market_cap') {
      list.sort((a, b) => b.marketCapUsd - a.marketCapUsd);
    } else if (sortBy === 'progress') {
      list.sort((a, b) => b.curveProgressPercent - a.curveProgressPercent);
    } else if (sortBy === 'hold_duration') {
      list.sort((a, b) => (b.avgHoldDays || 0) - (a.avgHoldDays || 0));
    } else if (sortBy === 'locked_percent') {
      list.sort((a, b) => (b.timeLockedPercent || 0) - (a.timeLockedPercent || 0));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortBy === 'pnl_gainers') {
      list.sort((a, b) => b.change24hPercent - a.change24hPercent);
    } else if (sortBy === 'volume') {
      list.sort((a, b) => b.volume24hUsd - a.volume24hUsd);
    } else {
      // Trending
      list.sort((a, b) => (b.curveProgressPercent * 1.5 + b.safetyAudit.score) - (a.curveProgressPercent * 1.5 + a.safetyAudit.score));
    }

    return list;
  }

  _enrichTokenMetrics(t) {
    const change24hPercent = t.openPrice24hUsd > 0 
      ? Number((((t.currentPriceUsd - t.openPrice24hUsd) / t.openPrice24hUsd) * 100).toFixed(2))
      : 0;
    
    const totalFeePoolDistributedUsd = t.feePool && t.feePool.totalGenerated
      ? (t.feePool.totalGenerated * 150)
      : (t.totalBurnedTokens ? (t.totalBurnedTokens * t.currentPriceUsd * 0.25) : 0);

    return {
      ...t,
      change24hPercent,
      isPositive24h: change24hPercent >= 0,
      bondingCurveProgressPercent: t.curveProgressPercent || 5,
      totalFeePoolDistributedUsd: totalFeePoolDistributedUsd || 1240.50,
      safetyScore: t.safetyAudit ? t.safetyAudit.score : 95,
      avgHoldDays: t.avgHoldDays || (t.tokenType === 'stack' ? 90 : 2),
      timeLockedPercent: t.timeLockedPercent || (t.tokenType === 'stack' ? 85 : 15),
      stakingApy: t.stakingApy || (t.tokenType === 'stack' ? 24.5 : 12.0)
    };
  }

  getKingOfTheHill() {
    const ungraduated = Array.from(this.tokens.values()).filter(t => !t.isGraduated && !t.isPrivate);
    if (ungraduated.length === 0) return this._enrichTokenMetrics(Array.from(this.tokens.values())[0]);
    ungraduated.sort((a, b) => b.curveProgressPercent - a.curveProgressPercent);
    return this._enrichTokenMetrics(ungraduated[0]);
  }

  getTrendingCoins(limit = 6) {
    return this.getAllTokens('trending', 'all', 'all', false).slice(0, limit);
  }

  getSovereignStacks(limit = 8) {
    return this.getAllTokens('hold_duration', 'all', 'stack', false).slice(0, limit);
  }

  getNewCoins(limit = 6) {
    return this.getAllTokens('newest', 'all', 'all', false).slice(0, limit);
  }

  getCoinDailyGainers(limit = 6) {
    return this.getAllTokens('pnl_gainers', 'all', 'all', false).slice(0, limit);
  }

  getLeaderboard() {
    return Array.from(this.traders.values()).sort((a, b) => b.dailyProfitUsd - a.dailyProfitUsd);
  }

  getTraderLeaderboard() {
    return this.getLeaderboard();
  }

  getDailyGainers(limit = 6) {
    return this.getCoinDailyGainers(limit);
  }

  getNewListings(limit = 6) {
    return this.getNewCoins(limit);
  }

  getToken(symbol, accessKey = null) {
    const t = this.tokens.get(symbol.toUpperCase());
    if (!t) return null;
    if (t.isPrivate && accessKey && t.inviteCode !== accessKey) {
      return {
        ...this._enrichTokenMetrics(t),
        isLockedPrivate: true,
        description: "🔒 Private Circle Sovereign Stack. Enter access passcode or click invite link to trade."
      };
    }
    return this._enrichTokenMetrics(t);
  }

  getChatMessages(symbol) {
    const sym = symbol.toUpperCase();
    if (!this.chatMessages.has(sym)) {
      this.chatMessages.set(sym, [
        { user: "CessionGuardian", text: `🔒 Sovereign trollbox channel for $${sym} open.`, time: "1m ago", badge: "SYSTEM" }
      ]);
    }
    return this.chatMessages.get(sym);
  }

  addChatMessage(symbol, user, text, badge = "TRADER") {
    const sym = symbol.toUpperCase();
    if (!this.chatMessages.has(sym)) this.chatMessages.set(sym, []);
    const msg = {
      user: user.substring(0, 8),
      text: text.slice(0, 180),
      time: "Just now",
      badge
    };
    const list = this.chatMessages.get(sym);
    list.push(msg);
    if (list.length > 50) list.shift();
    return msg;
  }

  createToken(params) {
    const { 
      name, 
      symbol, 
      description, 
      imageUrl, 
      creator, 
      chain = "Base", 
      devLockPercent = 100,
      tokenType = "sprint", // 'sprint' or 'stack'
      isPrivate = false,
      inviteCode = null,
      antiDumpEnabled = null,
      targetCapUsd = 25000
    } = params;

    const cleanSym = symbol.toUpperCase().trim();
    if (this.tokens.has(cleanSym)) {
      throw new Error(`Token with ticker $${cleanSym} already exists.`);
    }

    const isStack = tokenType === 'stack';
    const generatedInvite = isPrivate ? (inviteCode || `circle_${Math.random().toString(36).substring(2, 8)}`) : null;
    const isAntiDump = antiDumpEnabled !== null ? antiDumpEnabled : isStack;

    const initialPriceSol = 0.000000010;
    const initialPriceUsd = initialPriceSol * 150;

    const newToken = {
      name: name.trim(),
      symbol: cleanSym,
      chain: chain === "Solana" ? "Solana" : "Base",
      tokenType: isStack ? "stack" : "sprint",
      isPrivate: Boolean(isPrivate),
      inviteCode: generatedInvite,
      antiDumpEnabled: isAntiDump,
      avgHoldDays: isStack ? 30 : 1,
      timeLockedPercent: isStack ? 75 : 5,
      stakingApy: isStack ? 24.5 : 12.0,
      stakingPool: {
        totalStakedTokens: isStack ? 750000000 : 0,
        stakers: []
      },
      description: description || (isStack ? "Long-term community sovereign stack on cession.fun" : "Community fair launch token on cession.fun"),
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=200",
      creator: creator || "0xCalabiAnonDev",
      devLockedPercent: devLockPercent,
      devTokensLocked: Math.floor(1000000000 * (devLockPercent / 100) * 0.05),
      createdAt: Date.now(),
      virtualSolReserves: 10.0,
      virtualTokenReserves: 1000000000,
      realSolRaised: 0,
      tokensSold: 0,
      totalBurnedTokens: 0,
      currentPriceSol: initialPriceSol,
      currentPriceUsd: initialPriceUsd,
      openPrice24hUsd: initialPriceUsd,
      marketCapUsd: 10000,
      targetCapUsd: targetCapUsd || 25000,
      volume24hUsd: 0,
      high24hUsd: initialPriceUsd,
      low24hUsd: initialPriceUsd,
      isGraduated: false,
      curveProgressPercent: 5,
      feePool: {
        totalGenerated: 0,
        holderRewardsDistributed: 0
      },
      holdersCount: 1,
      holders: [
        { address: `${creator.substring(0, 6)}... (Dev Locked)`, balance: 50000000, percentage: 5.0, isDev: true, locked: true }
      ],
      safetyAudit: {
        score: devLockPercent >= 80 ? 98 : 75,
        grade: devLockPercent >= 80 ? "A+" : "B",
        mevProtected: true,
        devVestingLocked: devLockPercent >= 80,
        top10HoldersPercent: 5.0,
        warnings: devLockPercent < 80 ? ["Dev did not lock 80%+ of allocation."] : []
      },
      recentTrades: []
    };

    this.tokens.set(cleanSym, newToken);
    this.chatMessages.set(cleanSym, [
      { 
        user: "CessionGuardian", 
        text: `🚀 ${newToken.tokenType === 'stack' ? '🏛️ Sovereign Stack' : '⚡ Token'} $${cleanSym} deployed on ${newToken.chain}! ${newToken.isPrivate ? '🔒 Private Circle Active.' : '🌐 Public Discovery Active.'}`, 
        time: "Just now", 
        badge: "SYSTEM" 
      }
    ]);

    this.saveStateToDisk();
    return this._enrichTokenMetrics(newToken);
  }

  buyTokens(symbol, solAmount, buyerAddress) {
    const token = this.tokens.get(symbol.toUpperCase());
    if (!token) throw new Error("Token not found.");

    const solIn = parseFloat(solAmount);
    if (solIn <= 0 || isNaN(solIn)) throw new Error("Invalid SOL / ETH amount.");

    if (!token.feePool) {
      token.feePool = { totalGenerated: 0, holderRewardsDistributed: 0 };
    }

    // 0.50% Swap Fee (0.25% Burn / 0.25% Staking Yield)
    const feeTotal = solIn * 0.005;
    const feeBurn = feeTotal * 0.50;
    const feeYield = feeTotal * 0.50;
    const netSolIn = solIn - feeTotal;

    const k = BigInt(Math.floor(token.virtualSolReserves * 1e9)) * BigInt(token.virtualTokenReserves);
    const newSolReserves = token.virtualSolReserves + netSolIn;
    const newTokenReserves = Number(k / BigInt(Math.floor(newSolReserves * 1e9)));
    const tokensOut = Math.max(0, token.virtualTokenReserves - newTokenReserves);

    token.virtualSolReserves = newSolReserves;
    token.virtualTokenReserves = newTokenReserves;
    token.realSolRaised = (token.realSolRaised || 0) + netSolIn;
    token.tokensSold = (token.tokensSold || 0) + tokensOut;

    // Fee Accounting
    token.feePool.totalGenerated += feeTotal;
    token.feePool.holderRewardsDistributed += feeYield;
    const burnedTokensFromFee = Math.floor(tokensOut * 0.0025);
    token.totalBurnedTokens = (token.totalBurnedTokens || 0) + burnedTokensFromFee;
    this.totalProtocolBurnedUsd += (feeBurn * 150);

    // Dynamic Price & Cap
    token.currentPriceSol = token.virtualSolReserves / token.virtualTokenReserves;
    token.currentPriceUsd = token.currentPriceSol * 150 * 1000;
    token.volume24hUsd += (solIn * 150);

    const solGraduationTarget = token.targetCapUsd <= 25000 ? 8.0 : 20.0;
    token.marketCapUsd = Math.max(10000, (token.realSolRaised / solGraduationTarget) * token.targetCapUsd);
    token.curveProgressPercent = Math.min(100, Math.floor((token.realSolRaised / solGraduationTarget) * 100));

    // Graduation Check
    if (token.realSolRaised >= solGraduationTarget && !token.isGraduated) {
      token.isGraduated = true;
      token.graduationData = {
        dexName: token.chain === "Solana" ? "Raydium CPMM" : "Uniswap v3 (Base)",
        liquiditySolSeeded: token.realSolRaised,
        lpBurnTx: "0xdead" + Math.random().toString(36).substring(2, 15) + "0000dead",
        timestamp: Date.now()
      };
    }

    // Add Trade
    const trade = {
      id: "tx_" + Date.now().toString(36),
      type: "BUY",
      amountSol: solIn,
      amountTokens: tokensOut,
      usdVal: (solIn * 150).toFixed(2),
      user: `${buyerAddress.substring(0, 6)}...${buyerAddress.substring(buyerAddress.length - 4)}`,
      time: "Just now",
      mevShielded: true
    };
    token.recentTrades.unshift(trade);
    if (token.recentTrades.length > 25) token.recentTrades.pop();

    this.saveStateToDisk();
    return { token: this._enrichTokenMetrics(token), tokensOut, trade };
  }

  sellTokens(symbol, tokenAmount, sellerAddress) {
    const token = this.tokens.get(symbol.toUpperCase());
    if (!token) throw new Error("Token not found.");

    const tokensIn = parseFloat(tokenAmount);
    if (tokensIn <= 0 || isNaN(tokensIn)) throw new Error("Invalid token amount.");

    // Anti-Dump Protection: Max 1% of pool supply per trade for protected Sovereign Stacks
    if (token.antiDumpEnabled) {
      const maxAllowed = token.virtualTokenReserves * 0.01;
      if (tokensIn > maxAllowed) {
        throw new Error(`Anti-Dump Shield Active: Max sell limit is ${Math.floor(maxAllowed).toLocaleString()} tokens (1% of pool) per transaction to protect long-term stackers.`);
      }
    }

    const k = BigInt(Math.floor(token.virtualSolReserves * 1e9)) * BigInt(token.virtualTokenReserves);
    const newTokenReserves = token.virtualTokenReserves + tokensIn;
    const newSolReserves = Number(k / BigInt(newTokenReserves)) / 1e9;
    const grossSolOut = Math.max(0.0001, token.virtualSolReserves - newSolReserves);

    // 0.50% Swap Fee
    const feeTotal = grossSolOut * 0.005;
    const netSolOut = grossSolOut - feeTotal;

    token.virtualSolReserves = newSolReserves;
    token.virtualTokenReserves = newTokenReserves;
    token.tokensSold = Math.max(0, token.tokensSold - tokensIn);
    token.realSolRaised = Math.max(0, token.realSolRaised - grossSolOut);

    const solGraduationTarget = token.targetCapUsd <= 25000 ? 8.0 : 20.0;
    token.currentPriceSol = token.virtualSolReserves / token.virtualTokenReserves;
    token.currentPriceUsd = token.currentPriceSol * 150 * 1000;
    token.marketCapUsd = Math.max(5000, (token.realSolRaised / solGraduationTarget) * token.targetCapUsd);
    token.volume24hUsd += (grossSolOut * 150);
    token.curveProgressPercent = Math.min(100, Math.floor((token.realSolRaised / solGraduationTarget) * 100));

    const trade = {
      id: "tx_" + Date.now().toString(36),
      type: "SELL",
      amountSol: netSolOut,
      amountTokens: tokensIn,
      usdVal: (netSolOut * 150).toFixed(2),
      user: `${sellerAddress.substring(0, 6)}...${sellerAddress.substring(sellerAddress.length - 4)}`,
      time: "Just now",
      mevShielded: true
    };
    token.recentTrades.unshift(trade);
    if (token.recentTrades.length > 25) token.recentTrades.pop();

    this.saveStateToDisk();
    return { token: this._enrichTokenMetrics(token), solOut: netSolOut, trade };
  }

  stakeTokens(symbol, tokenAmount, durationDays = 90, userAddress = "0xUser") {
    const token = this.tokens.get(symbol.toUpperCase());
    if (!token) throw new Error("Token not found.");
    const amount = parseFloat(tokenAmount);
    if (amount <= 0 || isNaN(amount)) throw new Error("Invalid staking amount.");

    if (!token.stakingPool) {
      token.stakingPool = { totalStakedTokens: 0, stakers: [] };
    }

    const unlockTime = Date.now() + (durationDays * 86400000);
    const apy = durationDays >= 365 ? 36.0 : (durationDays >= 90 ? 22.5 : 14.0);
    const stakeRecord = {
      id: "stake_" + Date.now().toString(36),
      user: userAddress,
      amount,
      durationDays,
      stakedAt: Date.now(),
      unlockTime,
      apy
    };

    token.stakingPool.stakers.push(stakeRecord);
    token.stakingPool.totalStakedTokens += amount;
    token.timeLockedPercent = Math.min(98, Math.floor((token.stakingPool.totalStakedTokens / 1000000000) * 100) + 20);

    this.saveStateToDisk();
    return { 
      success: true, 
      stake: stakeRecord, 
      totalStaked: token.stakingPool.totalStakedTokens, 
      token: this._enrichTokenMetrics(token) 
    };
  }
}

module.exports = new BondingCurveEngine();
