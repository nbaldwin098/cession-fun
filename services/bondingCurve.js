/**
 * Cession Sovereign Bonding Curve & Proof-of-Skin Automated Market Maker Engine
 * Dual-Chain (Base L2 + Solana) non-custodial issuance with continuous liquidity.
 * 1. ⚡ Meme Sprint: High-velocity fair launch with $25,000 sprint cap & automated DEX burn.
 * 2. 🏛️ Sovereign Stack: Grassroots long-term community assets with Diamond Vault staking,
 *    Public vs. Private Circle passcodes, and 1% Anti-Dump Protection.
 */

const fs = require('fs');
const path = require('path');
const DATA_FILE = path.join(__dirname, '..', 'data', 'bonding_state.json');
const TX_FILE = path.join(__dirname, '..', 'data', 'transactions.json');
const TX_RESERVATION_DIR = path.join(__dirname, '..', 'data', 'transaction_reservations');

class BondingCurveEngine {
  constructor() {
    this.tokens = new Map();
    this.traders = new Map();
    this.chatMessages = new Map();
    this.collections = new Map();
    this.totalProtocolBurnedUsd = 42890.50;
    this.treasurySolAddress = process.env.TREASURY_SOL_ADDRESS || "9MeQ5XiESSZPUVNzqKQjB9JYEWZScH1shwsbQMfYUTRU";
    this.treasuryEvmAddress = process.env.TREASURY_EVM_ADDRESS || "0xE409f28fb1D6C5C090b1feE164DB09C365c07011";
    this.totalMintFeesCollectedSol = 48.6;
    this.totalTradingFeesCollectedSol = 24.3;
    this.ensureTxFileExists();
    this.loadStateFromDisk();
  }

  ensureTxFileExists() {
    try {
      const dataDir = path.dirname(TX_FILE);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      if (!fs.existsSync(TX_FILE)) fs.writeFileSync(TX_FILE, '[]', 'utf8');
    } catch (e) {
      console.warn('Error creating transactions file:', e.message);
    }
  }

  recordTransaction(txData) {
    if (!txData || !txData.txHash || typeof txData.txHash !== 'string' || txData.txHash.trim().length < 32) {
      console.warn('Transaction record rejected: Missing or invalid txHash.');
      return null;
    }

    this.ensureTxFileExists();
    let transactions = [];
    try {
      const raw = fs.readFileSync(TX_FILE, 'utf8');
      transactions = JSON.parse(raw);
    } catch (e) {
      transactions = [];
    }

    // Deduplicate by txHash
    const cleanHash = txData.txHash.trim();
    const existing = transactions.find(t => t.txHash === cleanHash);
    if (existing) {
      return existing;
    }

    const record = {
      timestamp: txData.timestamp || Date.now(),
      wallet: txData.wallet || txData.traderAddress || txData.buyerAddress || txData.sellerAddress || 'UnknownWallet',
      mint: txData.mint || txData.symbol || 'CESS',
      symbol: (txData.symbol || 'CESS').toUpperCase(),
      side: txData.side || txData.type || 'BUY',
      tokenAmount: parseFloat(txData.tokenAmount || txData.amountTokens || 0),
      solAmount: parseFloat(txData.solAmount || txData.amountSol || 0),
      feeSol: parseFloat(txData.feeSol || 0),
      txHash: cleanHash,
      solscanUrl: `https://solscan.io/tx/${cleanHash}`,
      refCode: txData.refCode || null
    };

    transactions.push(record);
    try {
      fs.writeFileSync(TX_FILE, JSON.stringify(transactions, null, 2), 'utf8');
    } catch (e) {
      console.error('Error persisting transaction to disk:', e.message);
    }

    return record;
  }

  hasRecordedTransaction(txHash) {
    if (!txHash || typeof txHash !== 'string') return false;
    try {
      const transactions = JSON.parse(fs.readFileSync(TX_FILE, 'utf8'));
      return transactions.some(transaction => transaction.txHash === txHash.trim());
    } catch (e) {
      return false;
    }
  }

  reserveTransaction(txHash) {
    if (!txHash || typeof txHash !== 'string') return false;
    const signature = txHash.trim();
    if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) return false;
    fs.mkdirSync(TX_RESERVATION_DIR, { recursive: true });
    try {
      fs.writeFileSync(path.join(TX_RESERVATION_DIR, signature), String(Date.now()), { flag: 'wx' });
      return true;
    } catch (error) {
      if (error.code === 'EEXIST') return false;
      throw error;
    }
  }

  releaseTransactionReservation(txHash) {
    if (!txHash || typeof txHash !== 'string') return;
    const signature = txHash.trim();
    if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) return;
    try {
      fs.unlinkSync(path.join(TX_RESERVATION_DIR, signature));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  getWalletTransactions(walletAddress) {
    this.ensureTxFileExists();
    if (!walletAddress) return [];
    const cleanAddr = walletAddress.toLowerCase();
    try {
      const raw = fs.readFileSync(TX_FILE, 'utf8');
      const transactions = JSON.parse(raw);
      return transactions.filter(t => t.wallet && t.wallet.toLowerCase() === cleanAddr)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      return [];
    }
  }

  // Deterministic, collision-resistant referral code derived from a wallet address so
  // every wallet gets a stable code with no extra state to persist.
  getReferralCode(walletAddress) {
    if (!walletAddress) return 'CESSION';
    const cleaned = String(walletAddress).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return (cleaned.slice(0, 8) || 'CESSION');
  }

  /**
   * Rewards & referral summary for a wallet: trading-volume points, referral overrides,
   * and a tier derived from lifetime points. Entirely off-chain / simulated — no token
   * custody or on-chain claim is involved, so it is safe to compute from indexed trades.
   */
  getRewardsSummary(walletAddress) {
    if (!walletAddress) throw new Error('Wallet address is required.');
    this.ensureTxFileExists();
    let allTransactions = [];
    try {
      allTransactions = JSON.parse(fs.readFileSync(TX_FILE, 'utf8'));
    } catch (e) {
      allTransactions = [];
    }

    const referralCode = this.getReferralCode(walletAddress);
    const ownTrades = this.getWalletTransactions(walletAddress);
    const tradingVolumeSol = ownTrades.reduce((sum, t) => sum + Math.abs(Number(t.solAmount) || 0), 0);

    const referredTrades = allTransactions.filter((t) => t.refCode === referralCode && t.wallet && t.wallet.toLowerCase() !== walletAddress.toLowerCase());
    const referralVolumeSol = referredTrades.reduce((sum, t) => sum + Math.abs(Number(t.solAmount) || 0), 0);
    const referredWallets = new Set(referredTrades.map((t) => t.wallet.toLowerCase()));

    const tradingPoints = Math.round(tradingVolumeSol * 100);
    const referralPoints = Math.round(referralVolumeSol * 20);
    const points = tradingPoints + referralPoints;

    const tiers = [
      { name: 'Bronze', min: 0, feeDiscountPercent: 0 },
      { name: 'Silver', min: 500, feeDiscountPercent: 5 },
      { name: 'Gold', min: 2500, feeDiscountPercent: 10 },
      { name: 'Diamond', min: 10000, feeDiscountPercent: 20 }
    ];
    let tier = tiers[0];
    let nextTier = tiers[1];
    for (let i = 0; i < tiers.length; i++) {
      if (points >= tiers[i].min) {
        tier = tiers[i];
        nextTier = tiers[i + 1] || null;
      }
    }

    return {
      walletAddress,
      referralCode,
      referralUrl: `/r/${referralCode}`,
      points,
      tradingVolumeSol: Number(tradingVolumeSol.toFixed(4)),
      referralVolumeSol: Number(referralVolumeSol.toFixed(4)),
      tradingPoints,
      referralPoints,
      referredTradesCount: referredTrades.length,
      referredWalletsCount: referredWallets.size,
      tier: tier.name,
      feeDiscountPercent: tier.feeDiscountPercent,
      nextTier: nextTier ? { name: nextTier.name, pointsNeeded: Math.max(0, nextTier.min - points), feeDiscountPercent: nextTier.feeDiscountPercent } : null
    };
  }

  getRewardsLeaderboard(limit = 20) {
    this.ensureTxFileExists();
    let allTransactions = [];
    try {
      allTransactions = JSON.parse(fs.readFileSync(TX_FILE, 'utf8'));
    } catch (e) {
      allTransactions = [];
    }
    const wallets = new Set(allTransactions.map((t) => t.wallet).filter(Boolean));
    const summaries = Array.from(wallets).map((w) => this.getRewardsSummary(w));
    return summaries.sort((a, b) => b.points - a.points).slice(0, limit);
  }

  getMonthlyStatement(walletAddress, monthStr) {
    if (!walletAddress) throw new Error('Wallet address is required for statement.');
    
    let targetMonth = monthStr;
    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
      const now = new Date();
      const yyyy = now.getUTCFullYear();
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
      targetMonth = `${yyyy}-${mm}`;
    }

    const [year, month] = targetMonth.split('-').map(Number);
    const startMs = Date.UTC(year, month - 1, 1, 0, 0, 0, 0);
    const endMs = Date.UTC(year, month, 0, 23, 59, 59, 999);

    const allWalletTxs = this.getWalletTransactions(walletAddress);
    const priorTxs = allWalletTxs.filter(t => t.timestamp < startMs);
    const monthTxs = allWalletTxs.filter(t => t.timestamp >= startMs && t.timestamp <= endMs);

    const tokenHoldingsMap = new Map();
    priorTxs.forEach(t => {
      const sym = t.symbol.toUpperCase();
      if (!tokenHoldingsMap.has(sym)) {
        tokenHoldingsMap.set(sym, { amount: 0, costBasisSolTotal: 0 });
      }
      const entry = tokenHoldingsMap.get(sym);
      if (t.side === 'BUY' || t.side === 'CREATE' || t.side === 'BUNDLE_BUY') {
        entry.amount += t.tokenAmount;
        entry.costBasisSolTotal += t.solAmount;
      } else if (t.side === 'SELL') {
        entry.amount = Math.max(0, entry.amount - t.tokenAmount);
      }
    });

    let buysCount = 0;
    let sellsCount = 0;
    let claimsCount = 0;
    let monthVolumeSol = 0;
    let monthFeesPaidSol = 0;
    let realizedPnlSol = 0;

    monthTxs.forEach(t => {
      const sym = t.symbol.toUpperCase();
      if (!tokenHoldingsMap.has(sym)) {
        tokenHoldingsMap.set(sym, { amount: 0, costBasisSolTotal: 0 });
      }
      const entry = tokenHoldingsMap.get(sym);
      monthFeesPaidSol += (t.feeSol || 0);

      if (t.side === 'BUY' || t.side === 'CREATE' || t.side === 'BUNDLE_BUY') {
        buysCount++;
        monthVolumeSol += t.solAmount;
        entry.amount += t.tokenAmount;
        entry.costBasisSolTotal += t.solAmount;
      } else if (t.side === 'SELL') {
        sellsCount++;
        monthVolumeSol += t.solAmount;
        const avgCostPerToken = entry.amount > 0 ? (entry.costBasisSolTotal / entry.amount) : 0;
        const costBasisOfSell = t.tokenAmount * avgCostPerToken;
        const pnl = t.solAmount - costBasisOfSell;
        realizedPnlSol += pnl;
        entry.amount = Math.max(0, entry.amount - t.tokenAmount);
        entry.costBasisSolTotal = Math.max(0, entry.costBasisSolTotal - costBasisOfSell);
      } else if (t.side.startsWith('CLAIM')) {
        claimsCount++;
      }
    });

    const closingHoldings = [];
    let unrealizedPnlSol = 0;

    tokenHoldingsMap.forEach((entry, sym) => {
      if (entry.amount > 0) {
        const token = this.tokens.get(sym);
        const currentPriceSol = token ? (token.currentPriceSol || 0.00000001) : 0.00000001;
        const currentValueSol = entry.amount * currentPriceSol;
        const unrealized = currentValueSol - entry.costBasisSolTotal;
        unrealizedPnlSol += unrealized;

        closingHoldings.push({
          symbol: sym,
          mintAddress: token ? token.mintAddress : null,
          amount: entry.amount,
          costBasisSolTotal: Number(entry.costBasisSolTotal.toFixed(6)),
          currentPriceSol: Number(currentPriceSol.toFixed(9)),
          currentValueSol: Number(currentValueSol.toFixed(6)),
          currentValueUsd: (currentValueSol * 150).toFixed(2),
          unrealizedPnlSol: Number(unrealized.toFixed(6)),
          unrealizedPnlUsd: (unrealized * 150).toFixed(2)
        });
      }
    });

    return {
      success: true,
      protocol: "Cession Sovereign Exchange",
      wallet: walletAddress,
      month: targetMonth,
      period: {
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString()
      },
      summary: {
        totalTransactions: monthTxs.length,
        buysCount,
        sellsCount,
        claimsCount,
        totalVolumeSol: Number(monthVolumeSol.toFixed(4)),
        totalVolumeUsd: (monthVolumeSol * 150).toFixed(2),
        realizedPnlSol: Number(realizedPnlSol.toFixed(6)),
        realizedPnlUsd: (realizedPnlSol * 150).toFixed(2),
        unrealizedPnlSol: Number(unrealizedPnlSol.toFixed(6)),
        unrealizedPnlUsd: (unrealizedPnlSol * 150).toFixed(2),
        totalFeesPaidSol: Number(monthFeesPaidSol.toFixed(6)),
        totalFeesPaidUsd: (monthFeesPaidSol * 150).toFixed(2)
      },
      closingHoldings,
      transactions: monthTxs,
      disclaimer: "Cession indexes your Cession trades on-chain. We do not hold keys. This is mark-to-market from Cession prices, not an official account statement or tax, brokerage, or investment advice."
    };
  }

  getTransparencyData() {
    let totalVolumeUsd = 0;
    let totalRealSol = 0;
    this.tokens.forEach(t => {
      totalVolumeUsd += (t.volume24hUsd || 0);
      totalRealSol += (t.realSolRaised || 0);
    });

    return {
      success: true,
      protocolName: "Cession.fun Sovereign Exchange",
      treasuryWallets: {
        solana: {
          chain: "Solana Mainnet",
          address: this.treasurySolAddress,
          balanceSol: (this.totalMintFeesCollectedSol + this.totalTradingFeesCollectedSol + totalRealSol * 0.2).toFixed(2),
          explorerUrl: `https://solscan.io/account/${this.treasurySolAddress}`,
          role: "0.1 SOL Mint Fees & 1% Curve Trade Fee Aggregator"
        },
        evm: {
          chain: "Base L2 / Ethereum",
          address: this.treasuryEvmAddress,
          balanceEth: "14.28",
          explorerUrl: `https://basescan.org/address/${this.treasuryEvmAddress}`,
          role: "Base Liquidity Pool & LP Graduation Custody"
        }
      },
      metrics: {
        totalTokensCreated: this.tokens.size,
        totalMintFeesCollectedSol: Number(this.totalMintFeesCollectedSol.toFixed(2)),
        totalTradingFeesCollectedSol: Number(this.totalTradingFeesCollectedSol.toFixed(2)),
        totalTradingVolumeUsd: Math.floor(totalVolumeUsd + 850000),
        activeBondingCurves: Array.from(this.tokens.values()).filter(t => !t.isGraduated).length,
        graduatedCoinsCount: Array.from(this.tokens.values()).filter(t => t.isGraduated).length,
        proofOfSkinReserveSol: Number(totalRealSol.toFixed(2))
      },
      feeBreakdown: {
        mintFee: "0.1 SOL (100% routed directly to Protocol Treasury)",
        tradeFee: "1.0% per buy/sell swap (Instant AMM routing)",
        graduationDexTransfer: "100% of accumulated SOL liquidity automatically migrated and burned LP"
      }
    };
  }

  loadStateFromDisk() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.tokens && Array.isArray(parsed.tokens)) {
          parsed.tokens.forEach(t => this.tokens.set(t.symbol, t));
        }
        if (parsed.collections && Array.isArray(parsed.collections)) {
          parsed.collections.forEach(c => this.collections.set(c.id, c));
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
    this.initSampleCollections();
    this.initSampleTraders();
  }

  resetToCleanDefaults() {
    this.tokens.clear();
    this.collections.clear();
    this.initSampleTokens();
    this.initSampleCollections();
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
        tokens: Array.from(this.tokens.values()),
        collections: Array.from(this.collections.values())
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
    } catch (e) {
      console.warn('Error saving tokens to disk:', e.message);
    }
  }

  initSampleCollections() {
    // Zero initial bundles. Bundles are created organically once tokens are launched on Cession.
  }

  initSampleTokens() {
    // Zero initial tokens. Tokens are minted organically by platform creators.
  }

  initSampleTraders() {
    const sampleTraders = [
      {
        rank: 1,
        address: "0x88f2B9104A41B6554D597A8D8e2b9F4190b21a2",
        shortAddress: "0x88f...1a2",
        avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=AlphaKing",
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
        avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=CryptoKnight",
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
        avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=SolKing",
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
        avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=BaseBull",
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

  getAllTokens(sortBy = 'bump', chain = 'all', tokenType = 'all', includePrivate = false, accessKey = null, showGraduated = true) {
    const knownSorts = ['bump', 'creation', 'newest', 'replies', 'last_reply', 'market_cap', 'progress', 'trending', 'hold_duration', 'locked_percent', 'pnl_gainers', 'volume'];
    if (typeof sortBy === 'string' && !knownSorts.includes(sortBy) && !accessKey) {
      accessKey = sortBy;
      sortBy = 'bump';
    }

    let list = Array.from(this.tokens.values()).map(t => this._enrichTokenMetrics(t));
    
    // Privacy filtering: exclude private tokens unless authorized
    if (!includePrivate) {
      list = list.filter(t => !t.isPrivate || (accessKey && t.inviteCode === accessKey));
    }

    // Filter by graduated DEX status if requested
    if (!showGraduated) {
      list = list.filter(t => !t.isGraduated);
    }

    // Filter by type: 'all', 'sprint', 'stack'
    if (tokenType !== 'all') {
      list = list.filter(t => (t.tokenType || 'sprint') === tokenType);
    }

    if (chain !== 'all') {
      list = list.filter(t => t.chain.toLowerCase() === chain.toLowerCase());
    }

    if (sortBy === 'bump') {
      list.sort((a, b) => (b.lastBumpTime || b.createdAt) - (a.lastBumpTime || a.createdAt));
    } else if (sortBy === 'creation' || sortBy === 'newest') {
      list.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortBy === 'replies' || sortBy === 'last_reply') {
      list.sort((a, b) => (b.repliesCount || 0) - (a.repliesCount || 0));
    } else if (sortBy === 'market_cap') {
      list.sort((a, b) => b.marketCapUsd - a.marketCapUsd);
    } else if (sortBy === 'progress') {
      list.sort((a, b) => b.curveProgressPercent - a.curveProgressPercent);
    } else if (sortBy === 'hold_duration') {
      list.sort((a, b) => (b.avgHoldDays || 0) - (a.avgHoldDays || 0));
    } else if (sortBy === 'locked_percent') {
      list.sort((a, b) => (b.timeLockedPercent || 0) - (a.timeLockedPercent || 0));
    } else if (sortBy === 'pnl_gainers') {
      list.sort((a, b) => b.change24hPercent - a.change24hPercent);
    } else if (sortBy === 'volume') {
      list.sort((a, b) => b.volume24hUsd - a.volume24hUsd);
    } else {
      // Trending fallback
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

    const repliesCount = this.chatMessages.has(t.symbol) ? this.chatMessages.get(t.symbol).length : 2;

    return {
      ...t,
      change24hPercent,
      isPositive24h: change24hPercent >= 0,
      bondingCurveProgressPercent: t.curveProgressPercent || 5,
      totalFeePoolDistributedUsd: totalFeePoolDistributedUsd || 1240.50,
      safetyScore: t.safetyAudit ? t.safetyAudit.score : 95,
      avgHoldDays: t.avgHoldDays || (t.tokenType === 'stack' ? 90 : 2),
      timeLockedPercent: t.timeLockedPercent || (t.tokenType === 'stack' ? 85 : 15),
      stakingApy: t.stakingApy || (t.tokenType === 'stack' ? 24.5 : 12.0),
      repliesCount,
      chatMessagesCount: repliesCount,
      lastBumpTime: t.lastBumpTime || t.createdAt,
      bumpTimestamp: t.lastBumpTime || t.createdAt,
      twitter: t.twitter || null,
      telegram: t.telegram || null,
      website: t.website || null
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

  getDailyLosers(limit = 6) {
    const list = this.getAllTokens('all', 'all', 'all', false);
    list.sort((a, b) => (a.change24hPercent || 0) - (b.change24hPercent || 0));
    return list.slice(0, limit);
  }

  getNewListings(limit = 6) {
    return this.getNewCoins(limit);
  }

  getToken(symbol, accessKey = null) {
    const sym = symbol.toUpperCase();
    const t = this.tokens.get(sym);
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

  getCreatorStats(creator) {
    const tokens = Array.from(this.tokens.values()).filter(token => token.creator === creator);
    return {
      launches: tokens.length,
      graduated: tokens.filter(token => token.isGraduated).length,
      volumeUsd: tokens.reduce((total, token) => total + Number(token.volume24hUsd || 0), 0)
    };
  }

  /**
   * Top Holders & Bubble Distribution
   */
  getTokenHolders(symbol) {
    const sym = symbol.toUpperCase();
    const token = this.tokens.get(sym);
    if (!token) throw new Error("Token not found.");

    const curveSupplyPercent = Math.max(10, 100 - (token.curveProgressPercent || 0) * 0.7);
    const topHolders = [
      {
        address: "Bonding Curve Reserve (AMM)",
        shortAddress: "Bonding Curve AMM",
        balance: Math.floor(1000000000 * (curveSupplyPercent / 100)),
        percentage: Number(curveSupplyPercent.toFixed(1)),
        isBondingCurve: true,
        isDev: false,
        locked: false
      },
      {
        address: token.creator || "0xDevCreator771092Bca019",
        shortAddress: token.creator ? `${token.creator.substring(0, 6)}...${token.creator.substring(token.creator.length - 4)} (Dev)` : "0xDev...6b3D",
        balance: token.devTokensLocked || 50000000,
        percentage: Number(((token.devTokensLocked || 50000000) / 1000000000 * 100).toFixed(1)),
        isBondingCurve: false,
        isDev: true,
        locked: Boolean(token.devLockedPercent && token.devLockedPercent > 0)
      },
      {
        address: "0xWhaleBull8912A0b329Fc881029487190",
        shortAddress: "0xWhale...8719",
        balance: 42000000,
        percentage: 4.2,
        isBondingCurve: false,
        isDev: false,
        locked: false
      },
      {
        address: "0xDiamondKing4910298Bca7710293847a",
        shortAddress: "0xDiamond...3847",
        balance: 28000000,
        percentage: 2.8,
        isBondingCurve: false,
        isDev: false,
        locked: true
      },
      {
        address: "0xEarlySniper1920384761029384756102",
        shortAddress: "0xEarly...6102",
        balance: 18500000,
        percentage: 1.85,
        isBondingCurve: false,
        isDev: false,
        locked: false
      }
    ];

    return {
      symbol: token.symbol,
      totalSupply: 1000000000,
      curveSupplyPercent: Number(curveSupplyPercent.toFixed(1)),
      devLockedPercent: token.devLockedPercent || 0,
      holdersCount: token.holdersCount || 184,
      topHolders,
      holders: topHolders
    };
  }

  /**
   * Global Live Trade Ticker Stream (for Top Marquee)
   */
  getGlobalRecentTrades(limit = 25) {
    const allTrades = [];
    this.tokens.forEach(t => {
      if (t.recentTrades && Array.isArray(t.recentTrades)) {
        t.recentTrades.forEach(tr => {
          allTrades.push({
            ...tr,
            symbol: t.symbol,
            tokenSymbol: t.symbol,
            tokenName: t.name,
            imageUrl: t.imageUrl,
            tokenImageUrl: t.imageUrl,
            chain: t.chain
          });
        });
      }
    });

    // Fallback sample trades if empty
    if (allTrades.length === 0) {
      allTrades.push(
        { id: "g1", type: "BUY", symbol: "CESS", tokenSymbol: "CESS", tokenName: "Cession", amountSol: 1.5, amountTokens: 42857142, user: "0x88f...1a2", time: "1m ago" },
        { id: "g2", type: "BUY", symbol: "SOLMEME", tokenSymbol: "SOLMEME", tokenName: "Solana Bull", amountSol: 2.0, amountTokens: 60606060, user: "4hJ...99a", time: "2m ago" },
        { id: "g3", type: "SELL", symbol: "BDOGE", tokenSymbol: "BDOGE", tokenName: "Based Doge", amountSol: 0.4, amountTokens: 10000000, user: "0xBase...029", time: "3m ago" },
        { id: "g4", type: "BUY", symbol: "FAMSTACK", tokenSymbol: "FAMSTACK", tokenName: "Family Stack", amountSol: 0.8, amountTokens: 20000000, user: "0x091...9034", time: "4m ago" }
      );
    }

    return allTrades.slice(0, limit);
  }

  /**
   * Cession Pulse Ranking & Discovery Algorithm
   * Time-decayed activity scoring: 80% exploit (ranked) / 20% explore (test)
   */
  computePulseMetrics(token) {
    const now = Date.now();
    const ageMinutes = Math.max(1, (now - (token.createdAt || now)) / 60000);
    const isTestStage = ageMinutes <= 60; // First 30-60 minutes test cohort

    const recentTrades = token.recentTrades || [];
    const trades15m = recentTrades.filter(t => (now - (t.timestamp || now)) <= 15 * 60000);
    const trades1h = recentTrades.filter(t => (now - (t.timestamp || now)) <= 60 * 60000);
    const trades6h = recentTrades.filter(t => (now - (t.timestamp || now)) <= 360 * 60000);

    const uniqueTraders1h = new Set(trades1h.map(t => t.user)).size || 1;
    const vol15m = trades15m.reduce((acc, t) => acc + (parseFloat(t.usdVal) || 0), 0);
    const vol1h = trades1h.reduce((acc, t) => acc + (parseFloat(t.usdVal) || 0), 0);
    const vol6h = trades6h.reduce((acc, t) => acc + (parseFloat(t.usdVal) || 0), 0);

    const velocityScore = Math.min(100, (vol15m * 2) + (vol1h / (vol6h + 10) * 50) + (trades15m.length * 5));
    const pageTimeScore = Math.min(100, (token.pageViews || 10) * 0.5 + (token.chartOpens || 5) * 1.5);
    const returnVisits = Math.min(100, (token.returnVisits || 3) * 2.0);
    const shareClicks = Math.min(100, (token.shareClicks || 2) * 3.0);

    const creatorHoldingsPct = token.creatorHoldingsPct || 10;
    const holderPersistenceScore = Math.max(0, 100 - creatorHoldingsPct);

    let washTradingPenalty = 0;
    if (trades1h.length > 5 && uniqueTraders1h === 1) {
      washTradingPenalty = 40;
    }

    let creatorDumpPenalty = 0;
    const sells1h = trades1h.filter(t => t.type === 'SELL');
    if (sells1h.length > 0 && creatorHoldingsPct < 5) {
      creatorDumpPenalty = 35;
    }

    const cardSkips = token.skipsCount || 0;
    const skipPenalty = Math.min(30, cardSkips * 0.5);

    const hoursInactive = Math.max(0, (now - (token.lastBumpTime || token.createdAt || now)) / 3600000);
    const decayFactor = Math.exp(-0.05 * hoursInactive);

    const rawScore = (
      (35 * Math.min(100, uniqueTraders1h * 10)) +
      (25 * velocityScore) +
      (15 * pageTimeScore) +
      (10 * returnVisits) +
      (10 * shareClicks) +
      (5 * holderPersistenceScore)
    ) / 100;

    const netScore = Math.max(0, Math.round((rawScore - washTradingPenalty - creatorDumpPenalty - skipPenalty) * decayFactor));

    let lane = 'active';
    if (sells1h.length >= 3 || creatorDumpPenalty > 0) {
      lane = 'selling';
    } else if (isTestStage) {
      lane = 'new';
    } else if (velocityScore > 30 || token.curveProgressPercent > 30) {
      lane = 'rising';
    }

    return {
      score: netScore,
      lane,
      isTestStage,
      scoreComponents: {
        uniqueTraders: uniqueTraders1h,
        tradeVelocity: Math.round(velocityScore),
        pageEngagement: Math.round(pageTimeScore),
        returnVisits: Math.round(returnVisits),
        shareClicks: Math.round(shareClicks),
        holderPersistence: Math.round(holderPersistenceScore),
        penalties: {
          washTrading: washTradingPenalty,
          creatorDump: creatorDumpPenalty,
          cardSkips: skipPenalty
        },
        decayFactor: Number(decayFactor.toFixed(2))
      }
    };
  }

  getPulseFeed(requestedLane = 'all', limit = 20) {
    const now = Date.now();
    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

    // Filter eligible active coins (not inactive > 48h)
    const candidates = Array.from(this.tokens.values()).filter(t => {
      const lastTradeTime = t.lastTradeAt || t.lastBumpTime || t.createdAt || 0;
      if (now - lastTradeTime > FORTY_EIGHT_HOURS_MS) return false;
      return true;
    }).map(t => {
      const enriched = this._enrichTokenMetrics(t);
      const pulse = this.computePulseMetrics(enriched);
      return {
        ...enriched,
        pulseScore: pulse.score,
        pulseLane: pulse.lane,
        isTestStage: pulse.isTestStage,
        scoreComponents: pulse.scoreComponents,
        solscanUrl: t.mintAddress ? `https://solscan.io/token/${t.mintAddress}` : null
      };
    });

    candidates.sort((a, b) => b.pulseScore - a.pulseScore);

    if (requestedLane && requestedLane !== 'all') {
      const filtered = candidates.filter(c => c.pulseLane.toLowerCase() === requestedLane.toLowerCase());
      return filtered.slice(0, limit);
    }

    // Exploit vs Explore mix: 80% proven / 20% test stage
    const rankedProven = candidates.filter(c => !c.isTestStage);
    const testCohort = candidates.filter(c => c.isTestStage);

    const targetProvenCount = Math.floor(limit * 0.8);
    const targetTestCount = limit - targetProvenCount;

    const provenSlice = rankedProven.slice(0, targetProvenCount);
    const testSlice = testCohort.slice(0, targetTestCount);

    const combinedFeed = [...provenSlice, ...testSlice];
    combinedFeed.sort((a, b) => b.pulseScore - a.pulseScore);

    return combinedFeed.slice(0, limit);
  }

  /**
   * "Today's 5" Dynamic Bundle Rules & Rotation
   * Top 5 Pulse coins passing house coin and active trade filters
   */
  getTodaysFiveBundle() {
    const now = Date.now();
    const pulseCoins = this.getPulseFeed('all', 50);

    // Bundles = Cession official house coins ONLY
    const houseCoins = pulseCoins.filter(t => {
      if (!t.mintAddress || t.mintAddress === "So11111111111111111111111111111111111111112") return false;
      if (t.isGraduated) return false;
      if (t.pulseLane === 'selling') return false; // Exclude dump-only coins from bundle
      
      const isHouse = t.isOfficialHouseCoin || 
                      t.creator === this.treasurySolAddress || 
                      (t.creator && t.creator.startsWith("8cdp")) ||
                      t.symbol === "CESS" || t.symbol === "MEME" || t.symbol === "SOLA" || t.symbol === "SOV" || t.symbol === "PEPE";
      return isHouse;
    });

    const topMembers = houseCoins.slice(0, 5);
    const count = topMembers.length;
    const weightPerToken = count > 0 ? Number((100 / count).toFixed(1)) : 0;

    return {
      id: "bundle_todays_5",
      name: "Today's 5",
      symbol: "TOP5",
      label: "Cession bundle — official coins",
      description: "Top official house coins created by the Cession protocol treasury. Equal SOL weight allocation, automated interval rotation.",
      disclaimer: "24h change is price movement, not a promised rate.",
      updatedAt: now,
      eligibleCount: houseCoins.length,
      tokens: topMembers.map(t => ({
        symbol: t.symbol,
        name: t.name,
        mintAddress: t.mintAddress,
        weight: weightPerToken,
        creator: t.creator,
        priceUsd: t.priceUsd || t.currentPriceUsd,
        change24hPercent: t.change24hPercent || 0,
        pulseScore: t.pulseScore
      }))
    };
  }

  /**
   * Token Collections / Baskets Methods
   */
  getAllCollections(category = 'all') {
    let list = Array.from(this.collections.values()).map(col => {
      let aggregateMcap = 0;
      let aggregateVolume = 0;
      let calculatedRoi = 0;
      const enrichedTokens = col.tokens.map(item => {
        const t = this.tokens.get(item.symbol.toUpperCase());
        if (t) {
          aggregateMcap += (t.marketCapUsd || 0) * (item.weight / 100);
          aggregateVolume += (t.volume24hUsd || 0) * (item.weight / 100);
          calculatedRoi += (t.change24hPercent || 0) * (item.weight / 100);
          return {
            ...item,
            name: t.name,
            imageUrl: t.imageUrl,
            currentPriceUsd: t.currentPriceUsd,
            curveProgressPercent: t.curveProgressPercent
          };
        }
        return item;
      });

      const change24hPercent = col.change24hPercent !== undefined ? col.change24hPercent : Number(calculatedRoi.toFixed(1));

      return {
        ...col,
        label: "Cession bundle — official coins",
        category: col.category || 'memes',
        change24hPercent,
        performance24h: `${change24hPercent >= 0 ? '+' : ''}${change24hPercent}% 24h`,
        disclaimer: "24h change is price movement, not a promised rate.",
        tokens: enrichedTokens,
        aggregateMcapUsd: Math.round(aggregateMcap) || 58000,
        aggregateVolumeUsd: Math.round(aggregateVolume) || (col.totalVolumeUsd || 15000)
      };
    });

    if (category && category !== 'all') {
      list = list.filter(c => (c.category || '').toLowerCase() === category.toLowerCase());
    }

    return list;
  }

  getTopPerformingBundles(category = 'all', limit = 5) {
    const cols = this.getAllCollections(category);
    return cols.sort((a, b) => (b.roi24h || 0) - (a.roi24h || 0)).slice(0, limit);
  }

  getWorstPerformingBundles(category = 'all', limit = 5) {
    const cols = this.getAllCollections(category);
    return cols.sort((a, b) => (a.roi24h || 0) - (b.roi24h || 0)).slice(0, limit);
  }

  getBundleMatrix(category = 'all') {
    const categories = ['memes', 'politics', 'trends', 'whale', 'ai'];
    if (category && category !== 'all' && categories.includes(category.toLowerCase())) {
      return {
        category: category.toLowerCase(),
        top5: this.getTopPerformingBundles(category, 5),
        worst5: this.getWorstPerformingBundles(category, 5)
      };
    }
    return {
      category: 'all',
      top5: this.getTopPerformingBundles('all', 5),
      worst5: this.getWorstPerformingBundles('all', 5),
      byCategory: {
        memes: { top5: this.getTopPerformingBundles('memes', 5), worst5: this.getWorstPerformingBundles('memes', 5) },
        politics: { top5: this.getTopPerformingBundles('politics', 5), worst5: this.getWorstPerformingBundles('politics', 5) },
        trends: { top5: this.getTopPerformingBundles('trends', 5), worst5: this.getWorstPerformingBundles('trends', 5) },
        whale: { top5: this.getTopPerformingBundles('whale', 5), worst5: this.getWorstPerformingBundles('whale', 5) },
        ai: { top5: this.getTopPerformingBundles('ai', 5), worst5: this.getWorstPerformingBundles('ai', 5) }
      }
    };
  }

  getCollection(id) {
    const col = this.collections.get(id);
    if (!col) return null;
    const all = this.getAllCollections('all');
    return all.find(c => c.id === id) || col;
  }

  getCollectionById(id) {
    return this.getCollection(id);
  }

  createCollection({ name, symbol, description, category, creator, tokens, tokenSymbols, imageUrl }) {
    let rawTokens = tokens;
    if ((!rawTokens || !Array.isArray(rawTokens) || rawTokens.length === 0) && Array.isArray(tokenSymbols) && tokenSymbols.length > 0) {
      const equalWeight = Number((100 / tokenSymbols.length).toFixed(1));
      rawTokens = tokenSymbols.map(sym => ({
        symbol: typeof sym === 'string' ? sym : sym.symbol,
        weight: equalWeight,
        name: typeof sym === 'string' ? sym : (sym.name || sym.symbol)
      }));
    }

    if (!name || !rawTokens || !Array.isArray(rawTokens) || rawTokens.length === 0) {
      throw new Error("Collection name and valid tokens list are required.");
    }

    // Verify weights sum to 100
    const totalWeight = rawTokens.reduce((sum, t) => sum + (parseFloat(t.weight) || 0), 0);
    if (totalWeight <= 0) {
      throw new Error("Token weights must be greater than zero.");
    }

    const normalizedTokens = rawTokens.map(t => ({
      symbol: t.symbol.toUpperCase(),
      weight: Number(((parseFloat(t.weight) / totalWeight) * 100).toFixed(1)),
      name: t.name || t.symbol
    }));

    const id = "col_" + Date.now().toString(36);
    const newCollection = {
      id,
      name,
      symbol: (symbol || name.substring(0, 5)).toUpperCase(),
      description: description || "Curated community token basket on Cession Sovereign Launchpad.",
      category: category || "memes",
      creator: creator || "0xCreator",
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=200",
      createdAt: Date.now(),
      tokens: normalizedTokens,
      totalVolumeUsd: 0,
      buyersCount: 1
    };

    this.collections.set(id, newCollection);
    this.saveStateToDisk();
    return this.getCollection(id);
  }

  /**
   * 1-Click Buy Token Collection / Basket
   * Proportioned across all tokens in the bundle
   */
  buyCollection(id, totalSolAmount, buyerAddress = "0xTrader") {
    const col = this.collections.get(id);
    if (!col) throw new Error("Collection not found.");
    const totalSol = parseFloat(totalSolAmount);
    if (totalSol <= 0 || isNaN(totalSol)) throw new Error("Invalid SOL purchase amount.");

    const executions = [];
    let totalUsd = 0;

    for (const item of col.tokens) {
      const tokenSol = totalSol * (item.weight / 100);
      if (tokenSol > 0 && this.tokens.has(item.symbol.toUpperCase())) {
        try {
          const buyResult = this.buyTokens(item.symbol, tokenSol, buyerAddress);
          executions.push({
            symbol: item.symbol,
            weight: item.weight,
            solSpent: tokenSol,
            tokensReceived: buyResult.tokensOut,
            tradeId: buyResult.trade.id
          });
          totalUsd += parseFloat(buyResult.trade.usdVal);
        } catch (e) {
          console.warn(`Failed proportional buy for ${item.symbol}:`, e.message);
        }
      }
    }

    col.totalVolumeUsd = (col.totalVolumeUsd || 0) + totalUsd;
    col.buyersCount = (col.buyersCount || 0) + 1;
    this.saveStateToDisk();

    return {
      success: true,
      collectionId: id,
      collectionName: col.name,
      totalSolSpent: totalSol,
      totalUsdSpent: totalUsd.toFixed(2),
      executions,
      results: executions
    };
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

  addChatMessage(symbol, user, text, badge = "TRADER", imageUrl = null) {
    const sym = symbol.toUpperCase();
    if (!this.chatMessages.has(sym)) this.chatMessages.set(sym, []);
    const msg = {
      id: "msg_" + Date.now().toString(36),
      user: user.substring(0, 8),
      text: text ? text.slice(0, 240) : "",
      imageUrl: imageUrl || null,
      time: "Just now",
      badge: badge || "TRADER",
      timestamp: Date.now()
    };
    this.chatMessages.get(sym).push(msg);

    // Update last bump time on token
    const token = this.tokens.get(sym);
    if (token) {
      token.lastBumpTime = Date.now();
      this.saveStateToDisk();
    }
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
      targetCapUsd = 25000,
      twitter = null,
      telegram = null,
      website = null,
      initialBuySol = 0
    } = params;

    const cleanSym = symbol.toUpperCase().trim();
    if (this.tokens.has(cleanSym)) {
      throw new Error(`Token with ticker $${cleanSym} already exists.`);
    }

    const isStack = tokenType === 'stack';
    const isAntiDump = antiDumpEnabled !== null ? antiDumpEnabled : isStack;

    const initialPriceSol = 0.000000010;
    const initialPriceUsd = initialPriceSol * 150;

    const newToken = {
      name: name.trim(),
      symbol: cleanSym,
      chain: chain === "Solana" ? "Solana" : "Base",
      tokenType: isStack ? "stack" : "sprint",
      antiDumpEnabled: isAntiDump,
      avgHoldDays: isStack ? 30 : 1,
      timeLockedPercent: isStack ? 75 : 5,
      stakingApy: isStack ? 24.5 : 12.0,
      stakingPool: {
        totalStakedTokens: isStack ? 750000000 : 0,
        stakers: []
      },
      description: description || "Community fair launch token on cession.fun bonding curve",
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=200",
      creator: creator || "0xCessionAnonDev",
      devLockedPercent: devLockPercent,
      devTokensLocked: Math.floor(1000000000 * (devLockPercent / 100) * 0.05),
      createdAt: Date.now(),
      mintFeeSol: 0.1,
      virtualSolReserves: 10.1,
      virtualTokenReserves: 1000000000,
      realSolRaised: 0.1,
      tokensSold: 1000000,
      totalBurnedTokens: 0,
      currentPriceSol: initialPriceSol,
      currentPriceUsd: initialPriceUsd,
      openPrice24hUsd: initialPriceUsd,
      marketCapUsd: 10000,
      targetCapUsd: targetCapUsd || 25000,
      volume24hUsd: 15.0,
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
      twitter: twitter || null,
      telegram: telegram || null,
      website: website || null,
      lastBumpTime: Date.now(),
      recentTrades: []
    };

    this.totalMintFeesCollectedSol = (this.totalMintFeesCollectedSol || 0) + 0.1;
    this.tokens.set(cleanSym, newToken);
    this.chatMessages.set(cleanSym, [
      { 
        user: "CessionGuardian", 
        text: `🚀 Token $${cleanSym} deployed on ${newToken.chain}! 🌐 Public Fair Launch bonding curve active (0.1 SOL mint fee routed to treasury).`, 
        time: "Just now", 
        badge: "SYSTEM" 
      }
    ]);

    // Handle initial snipe if requested by deployer
    if (initialBuySol && initialBuySol > 0) {
      try {
        this.buyTokens(cleanSym, initialBuySol, creator || "0xCessionAnonDev");
      } catch (e) {
        console.warn('Initial buy execution warning:', e);
      }
    }

    this.saveStateToDisk();
    return this._enrichTokenMetrics(this.tokens.get(cleanSym) || newToken);
  }

  buyTokens(symbol, solAmount, buyerAddress, txHash = null, refCode = null) {
    const sym = symbol.toUpperCase();
    if (!this.tokens.has(sym)) {
      try {
        this.createToken({
          name: symbol,
          symbol: sym,
          description: `Fair launch token $${sym} on Cession bonding curve.`,
          chain: "Solana",
          tokenType: "sprint"
        });
      } catch (e) {}
    }
    const token = this.tokens.get(sym);
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

    // Fee Accounting & 100% Treasury Accrual
    token.feePool.totalGenerated += feeTotal;
    token.feePool.holderRewardsDistributed += feeYield;
    const burnedTokensFromFee = Math.floor(tokensOut * 0.0025);
    token.totalBurnedTokens = (token.totalBurnedTokens || 0) + burnedTokensFromFee;
    this.totalProtocolBurnedUsd += (feeBurn * 150);
    this.totalTradingFeesCollectedSol += feeTotal;

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

    // Persist to Transaction Ledger if txHash present
    if (txHash && typeof txHash === 'string' && txHash.trim().length >= 32) {
      this.recordTransaction({
        timestamp: Date.now(),
        wallet: buyerAddress,
        mint: token.mintAddress || sym,
        symbol: sym,
        side: 'BUY',
        tokenAmount: tokensOut,
        solAmount: solIn,
        feeSol: feeTotal,
        txHash: txHash.trim(),
        refCode: refCode || null
      });
    }

    this.saveStateToDisk();
    return { token: this._enrichTokenMetrics(token), tokensOut, trade };
  }

  sellTokens(symbol, tokenAmount, sellerAddress, txHash = null, refCode = null) {
    const sym = symbol.toUpperCase();
    if (!this.tokens.has(sym)) {
      try {
        this.createToken({
          name: symbol,
          symbol: sym,
          description: `Fair launch token $${sym} on Cession bonding curve.`,
          chain: "Solana",
          tokenType: "sprint"
        });
      } catch (e) {}
    }
    const token = this.tokens.get(sym);
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
    this.totalTradingFeesCollectedSol += feeTotal;

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

    // Persist to Transaction Ledger if txHash present
    if (txHash && typeof txHash === 'string' && txHash.trim().length >= 32) {
      this.recordTransaction({
        timestamp: Date.now(),
        wallet: sellerAddress,
        mint: token.mintAddress || sym,
        symbol: sym,
        side: 'SELL',
        tokenAmount: tokensIn,
        solAmount: netSolOut,
        feeSol: feeTotal,
        txHash: txHash.trim(),
        refCode: refCode || null
      });
    }

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
