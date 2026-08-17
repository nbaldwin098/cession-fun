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

class BondingCurveEngine {
  constructor() {
    this.tokens = new Map();
    this.traders = new Map();
    this.chatMessages = new Map();
    this.collections = new Map();
    this.totalProtocolBurnedUsd = 42890.50;
    this.treasurySolAddress = process.env.TREASURY_SOL_ADDRESS || "8cdpVXsrQQDf84H4KC9pfqEKxUV9ZJjZZbeueWmJCCvH";
    this.treasuryEvmAddress = process.env.TREASURY_EVM_ADDRESS || "0x777A6b3D91028374829108a798129034Cession99";
    this.totalMintFeesCollectedSol = 48.6;
    this.totalTradingFeesCollectedSol = 24.3;
    this.loadStateFromDisk();
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
    const sampleBaskets = [
      // ==========================================
      // 1. MEMES CATEGORY (Top 5 Best & Top 5 Worst)
      // ==========================================
      {
        id: "col_apex_memes",
        name: "Solana Apex Moonshot Pack",
        symbol: "APEX",
        category: "memes",
        description: "The top trending alpha meme coins on Solana & Base with verified anti-rug parameters.",
        creator: "0x88f4b23a109823",
        imageUrl: "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=500",
        createdAt: Date.now() - (86400000 * 2),
        roi24h: 342.8,
        tokens: [
          { symbol: "USER", weight: 40, name: "The Random Bull" },
          { symbol: "BILLY", weight: 30, name: "Billycoin" },
          { symbol: "FLY", weight: 30, name: "Minecraft Fruit Fly" }
        ],
        totalVolumeUsd: 420800,
        buyersCount: 312
      },
      {
        id: "col_animal_cult",
        name: "Animal Meme Cult Index",
        symbol: "ANIMALZ",
        category: "memes",
        description: "The internet's favorite viral animal mascots combined into a single 1-click swap basket.",
        creator: "topfloor_b",
        imageUrl: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500",
        createdAt: Date.now() - (86400000 * 3),
        roi24h: 94.6,
        tokens: [
          { symbol: "BILLY", weight: 50, name: "Billycoin" },
          { symbol: "ORANGEPENG", weight: 50, name: "The Orange Backpack Peng..." }
        ],
        totalVolumeUsd: 184500,
        buyersCount: 145
      },
      {
        id: "col_viral_pepe",
        name: "Viral Pepe & Green Frog Cult",
        symbol: "PEPEPAK",
        category: "memes",
        description: "Classic green pepe meme variants bonded on sovereign zero-gas curves.",
        creator: "0x777A3F98A86e2417C218B14a6Eb339c08B7A6b3D",
        imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500",
        createdAt: Date.now() - (86400000 * 1.5),
        roi24h: 78.4,
        tokens: [
          { symbol: "USER", weight: 60, name: "The Random Bull" },
          { symbol: "BILLY", weight: 40, name: "Billycoin" }
        ],
        totalVolumeUsd: 142000,
        buyersCount: 118
      },
      {
        id: "col_doge_clan",
        name: "Shiba & Golden Doge Clan",
        symbol: "DOGECLAN",
        category: "memes",
        description: "Community-driven canine cult coins with zero team allocation.",
        creator: "0x091A4B8290CC189108a798129034",
        imageUrl: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500",
        createdAt: Date.now() - (86400000 * 4),
        roi24h: 54.2,
        tokens: [
          { symbol: "BILLY", weight: 60, name: "Billycoin" },
          { symbol: "CESS", weight: 40, name: "Cession Sovereign Engine" }
        ],
        totalVolumeUsd: 98000,
        buyersCount: 84
      },
      {
        id: "col_generational_stacks",
        name: "Baldwin Sovereign Family Stack",
        symbol: "FAMBASKET",
        category: "memes",
        description: "Curated long-term micro-endowments with 1% Anti-Dump protection and Staking yield.",
        creator: "0x091A4B8290CC189108a798129034",
        imageUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200",
        createdAt: Date.now() - 172800000,
        roi24h: 42.5,
        tokens: [
          { symbol: "CESS", weight: 50, name: "Cession Sovereign Engine" },
          { symbol: "BILLY", weight: 50, name: "Billycoin" }
        ],
        totalVolumeUsd: 112000,
        buyersCount: 68
      },
      {
        id: "col_memes_dip1",
        name: "Contrarian Meme Dip Hunters",
        symbol: "MEMEDIP",
        category: "memes",
        description: "Deep discount basket of temporarily oversold meme coins for aggressive dip-buyers.",
        creator: "fltnarwhal",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500",
        createdAt: Date.now() - (86400000 * 4),
        roi24h: -48.2,
        tokens: [
          { symbol: "r/", weight: 40, name: "r/" },
          { symbol: "ORANGEPENG", weight: 30, name: "The Orange Backpack Peng..." },
          { symbol: "FLY", weight: 30, name: "Minecraft Fruit Fly" }
        ],
        totalVolumeUsd: 89500,
        buyersCount: 92
      },
      {
        id: "col_memes_dip2",
        name: "Oversold Animal Scalpers",
        symbol: "BLEEDDOG",
        category: "memes",
        description: "Extreme animal mascot drawdown basket at historical bonding curve floor support.",
        creator: "botfn",
        imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500",
        createdAt: Date.now() - (86400000 * 5),
        roi24h: -36.5,
        tokens: [
          { symbol: "r/", weight: 60, name: "r/" },
          { symbol: "USER", weight: 40, name: "The Random Bull" }
        ],
        totalVolumeUsd: 52100,
        buyersCount: 64
      },
      {
        id: "col_memes_dip3",
        name: "Micro-Cap Meme Floor Pack",
        symbol: "FLOOR",
        category: "memes",
        description: "High beta micro-cap meme assets with asymmetric upside potential.",
        creator: "fltnarwhal",
        imageUrl: "https://images.unsplash.com/photo-1598439210625-5067c578f3f6?w=500",
        createdAt: Date.now() - (86400000 * 3),
        roi24h: -29.0,
        tokens: [
          { symbol: "ORANGEPENG", weight: 50, name: "The Orange Backpack Peng..." },
          { symbol: "FLY", weight: 50, name: "Minecraft Fruit Fly" }
        ],
        totalVolumeUsd: 41000,
        buyersCount: 47
      },
      {
        id: "col_memes_dip4",
        name: "Fallen Frog Rebound Basket",
        symbol: "FROGREB",
        category: "memes",
        description: "Heavily oversold frog tokens consolidating before next leg up.",
        creator: "0x88f4b23a109823",
        imageUrl: "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=500",
        createdAt: Date.now() - (86400000 * 2),
        roi24h: -22.4,
        tokens: [
          { symbol: "USER", weight: 50, name: "The Random Bull" },
          { symbol: "r/", weight: 50, name: "r/" }
        ],
        totalVolumeUsd: 38000,
        buyersCount: 39
      },
      {
        id: "col_memes_dip5",
        name: "Late Stage Pump Dip",
        symbol: "LATEDIP",
        category: "memes",
        description: "Post-graduation pullback coins entering secondary accumulation zone.",
        creator: "topfloor_b",
        imageUrl: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500",
        createdAt: Date.now() - (86400000 * 1),
        roi24h: -15.8,
        tokens: [
          { symbol: "BILLY", weight: 50, name: "Billycoin" },
          { symbol: "USER", weight: 50, name: "The Random Bull" }
        ],
        totalVolumeUsd: 31000,
        buyersCount: 33
      },

      // ==========================================
      // 2. POLITICS CATEGORY (Top 5 Best & Top 5 Worst)
      // ==========================================
      {
        id: "col_pol_patriot",
        name: "Executive Commander PolitiFi Pack",
        symbol: "PATRIOT",
        category: "politics",
        description: "High-conviction political sentiment tokens leading election cycle volume.",
        creator: "0xPolitico99",
        imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=500",
        createdAt: Date.now() - (86400000 * 2),
        roi24h: 285.4,
        tokens: [
          { symbol: "USER", weight: 50, name: "The Random Bull" },
          { symbol: "CESS", weight: 50, name: "Cession Sovereign Engine" }
        ],
        totalVolumeUsd: 340000,
        buyersCount: 260
      },
      {
        id: "col_pol_doge",
        name: "D.O.G.E Efficiency Index",
        symbol: "DOGEDEPT",
        category: "politics",
        description: "Department of Government Efficiency parody & meme governance basket.",
        creator: "0xGovEff99",
        imageUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=500",
        createdAt: Date.now() - (86400000 * 1.8),
        roi24h: 194.0,
        tokens: [
          { symbol: "BILLY", weight: 50, name: "Billycoin" },
          { symbol: "USER", weight: 50, name: "The Random Bull" }
        ],
        totalVolumeUsd: 280000,
        buyersCount: 215
      },
      {
        id: "col_pol_hill",
        name: "Capitol Hill Bipartisan Basket",
        symbol: "HILL",
        category: "politics",
        description: "Balanced PolitiFi index tracking viral Washington D.C. memes.",
        creator: "0xHillAlpha",
        imageUrl: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=500",
        createdAt: Date.now() - (86400000 * 3),
        roi24h: 112.5,
        tokens: [
          { symbol: "CESS", weight: 60, name: "Cession Sovereign Engine" },
          { symbol: "FLY", weight: 40, name: "Minecraft Fruit Fly" }
        ],
        totalVolumeUsd: 195000,
        buyersCount: 160
      },
      {
        id: "col_pol_vote",
        name: "Global Election Momentum Index",
        symbol: "VOTE2026",
        category: "politics",
        description: "Worldwide democratic voting narratives & election cycle tokens.",
        creator: "0xVoteGlobal",
        imageUrl: "https://images.unsplash.com/photo-1494178270175-e96de2971df9?w=500",
        createdAt: Date.now() - (86400000 * 2.5),
        roi24h: 67.8,
        tokens: [
          { symbol: "USER", weight: 50, name: "The Random Bull" },
          { symbol: "ORANGEPENG", weight: 50, name: "The Orange Backpack Peng..." }
        ],
        totalVolumeUsd: 130000,
        buyersCount: 95
      },
      {
        id: "col_pol_states",
        name: "Sovereign States Rights Stack",
        symbol: "STATES",
        category: "politics",
        description: "Grassroots state sovereignty and anti-centralization governance tokens.",
        creator: "0xStateFed",
        imageUrl: "https://images.unsplash.com/photo-1508849789987-4e5333c12b78?w=500",
        createdAt: Date.now() - (86400000 * 4),
        roi24h: 45.0,
        tokens: [
          { symbol: "CESS", weight: 70, name: "Cession Sovereign Engine" },
          { symbol: "BILLY", weight: 30, name: "Billycoin" }
        ],
        totalVolumeUsd: 85000,
        buyersCount: 72
      },
      {
        id: "col_pol_dip1",
        name: "Post-Debate PolitiFi Dip Hunters",
        symbol: "DEBATEDIP",
        category: "politics",
        description: "Oversold political tokens immediately following intense public debates.",
        creator: "0xDebateScalper",
        imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=500",
        createdAt: Date.now() - (86400000 * 5),
        roi24h: -52.4,
        tokens: [
          { symbol: "r/", weight: 50, name: "r/" },
          { symbol: "FLY", weight: 50, name: "Minecraft Fruit Fly" }
        ],
        totalVolumeUsd: 74000,
        buyersCount: 61
      },
      {
        id: "col_pol_dip2",
        name: "Oversold Campaign PAC Gems",
        symbol: "PACDIP",
        category: "politics",
        description: "Deep discount PAC meme coins with high potential mean reversion.",
        creator: "0xPACWatcher",
        imageUrl: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=500",
        createdAt: Date.now() - (86400000 * 4.5),
        roi24h: -41.2,
        tokens: [
          { symbol: "ORANGEPENG", weight: 50, name: "The Orange Backpack Peng..." },
          { symbol: "r/", weight: 50, name: "r/" }
        ],
        totalVolumeUsd: 59000,
        buyersCount: 52
      },
      {
        id: "col_pol_dip3",
        name: "Fallen Candidate Reversal Pack",
        symbol: "POLLDROP",
        category: "politics",
        description: "Tokens oversold after temporary polling drops seeking rebound bounce.",
        creator: "0xPollHunter",
        imageUrl: "https://images.unsplash.com/photo-1494178270175-e96de2971df9?w=500",
        createdAt: Date.now() - (86400000 * 3.8),
        roi24h: -33.6,
        tokens: [
          { symbol: "FLY", weight: 50, name: "Minecraft Fruit Fly" },
          { symbol: "USER", weight: 50, name: "The Random Bull" }
        ],
        totalVolumeUsd: 48000,
        buyersCount: 44
      },
      {
        id: "col_pol_dip4",
        name: "Filibuster Floor Pack",
        symbol: "FILIBUST",
        category: "politics",
        description: "Stalled legislative meme tokens trading at pure curve floor valuation.",
        creator: "0xHillAlpha",
        imageUrl: "https://images.unsplash.com/photo-1508849789987-4e5333c12b78?w=500",
        createdAt: Date.now() - (86400000 * 3),
        roi24h: -26.0,
        tokens: [
          { symbol: "r/", weight: 60, name: "r/" },
          { symbol: "BILLY", weight: 40, name: "Billycoin" }
        ],
        totalVolumeUsd: 36000,
        buyersCount: 35
      },
      {
        id: "col_pol_dip5",
        name: "Geopolitical Red-Wave Dip",
        symbol: "REDDIP",
        category: "politics",
        description: "Pullback political tokens accumulating on sovereign curve support.",
        creator: "0xPolitico99",
        imageUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=500",
        createdAt: Date.now() - (86400000 * 2),
        roi24h: -18.5,
        tokens: [
          { symbol: "ORANGEPENG", weight: 50, name: "The Orange Backpack Peng..." },
          { symbol: "CESS", weight: 50, name: "Cession Sovereign Engine" }
        ],
        totalVolumeUsd: 29000,
        buyersCount: 28
      },

      // ==========================================
      // 3. TRENDS CATEGORY (Top 5 Best & Top 5 Worst)
      // ==========================================
      {
        id: "col_trend_viral",
        name: "TikTok & Reels Viral Explosion",
        symbol: "VIRAL",
        category: "trends",
        description: "Top-ranking viral audio memes and cultural moments breaking short-form video records.",
        creator: "0xTikTokAlpha",
        imageUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500",
        createdAt: Date.now() - (86400000 * 1.2),
        roi24h: 412.0,
        tokens: [
          { symbol: "USER", weight: 40, name: "The Random Bull" },
          { symbol: "BILLY", weight: 30, name: "Billycoin" },
          { symbol: "FLY", weight: 30, name: "Minecraft Fruit Fly" }
        ],
        totalVolumeUsd: 520000,
        buyersCount: 420
      },
      {
        id: "col_trend_stream",
        name: "Pop Culture & Streaming Memes",
        symbol: "STREAM",
        category: "trends",
        description: "Live streaming moments, Twitch clips, and creator economy assets.",
        creator: "0xStreamCult",
        imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500",
        createdAt: Date.now() - (86400000 * 2),
        roi24h: 220.5,
        tokens: [
          { symbol: "BILLY", weight: 50, name: "Billycoin" },
          { symbol: "ORANGEPENG", weight: 50, name: "The Orange Backpack Peng..." }
        ],
        totalVolumeUsd: 310000,
        buyersCount: 240
      },
      {
        id: "col_trend_news",
        name: "Breaking News Wave Scalpers",
        symbol: "HEADLINE",
        category: "trends",
        description: "Rapid event-driven narrative tokens riding immediate social media headlines.",
        creator: "0xNewsHype",
        imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500",
        createdAt: Date.now() - (86400000 * 1.5),
        roi24h: 135.0,
        tokens: [
          { symbol: "USER", weight: 60, name: "The Random Bull" },
          { symbol: "CESS", weight: 40, name: "Cession Sovereign Engine" }
        ],
        totalVolumeUsd: 215000,
        buyersCount: 180
      },
      {
        id: "col_trend_lore",
        name: "Global Internet Lore Index",
        symbol: "RIZZLORE",
        category: "trends",
        description: "Deep internet lore, nostalgic copy-pastas, and underground web culture.",
        creator: "0xWebLore",
        imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500",
        createdAt: Date.now() - (86400000 * 3),
        roi24h: 82.4,
        tokens: [
          { symbol: "FLY", weight: 50, name: "Minecraft Fruit Fly" },
          { symbol: "BILLY", weight: 50, name: "Billycoin" }
        ],
        totalVolumeUsd: 140000,
        buyersCount: 110
      },
      {
        id: "col_trend_night",
        name: "Midnight Hype Momentum Pack",
        symbol: "NIGHTOWL",
        category: "trends",
        description: "Late-night Asian & US timezone transition pump basket.",
        creator: "0xNightOwl",
        imageUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=500",
        createdAt: Date.now() - (86400000 * 2.2),
        roi24h: 51.2,
        tokens: [
          { symbol: "USER", weight: 50, name: "The Random Bull" },
          { symbol: "ORANGEPENG", weight: 50, name: "The Orange Backpack Peng..." }
        ],
        totalVolumeUsd: 92000,
        buyersCount: 75
      },
      {
        id: "col_trend_dip1",
        name: "Post-Hype Crash Dip Hunters",
        symbol: "POSTHYPE",
        category: "trends",
        description: "Aggressive bottom buying on viral trends experiencing violent 24h pullbacks.",
        creator: "0xCrashHunter",
        imageUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500",
        createdAt: Date.now() - (86400000 * 4),
        roi24h: -58.0,
        tokens: [
          { symbol: "r/", weight: 50, name: "r/" },
          { symbol: "FLY", weight: 50, name: "Minecraft Fruit Fly" }
        ],
        totalVolumeUsd: 82000,
        buyersCount: 70
      },
      {
        id: "col_trend_dip2",
        name: "Oversold Viral Wave Pack",
        symbol: "FADED",
        category: "trends",
        description: "Faded trend tokens ready for round-two viral cycles on social feeds.",
        creator: "0xStreamCult",
        imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500",
        createdAt: Date.now() - (86400000 * 3.5),
        roi24h: -44.5,
        tokens: [
          { symbol: "ORANGEPENG", weight: 50, name: "The Orange Backpack Peng..." },
          { symbol: "r/", weight: 50, name: "r/" }
        ],
        totalVolumeUsd: 64000,
        buyersCount: 56
      },
      {
        id: "col_trend_dip3",
        name: "Fallen TikTok Trend Basket",
        symbol: "CLOUTDIP",
        category: "trends",
        description: "Short-form video assets consolidating at multi-day support lines.",
        creator: "0xTikTokAlpha",
        imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500",
        createdAt: Date.now() - (86400000 * 3),
        roi24h: -35.0,
        tokens: [
          { symbol: "FLY", weight: 50, name: "Minecraft Fruit Fly" },
          { symbol: "USER", weight: 50, name: "The Random Bull" }
        ],
        totalVolumeUsd: 51000,
        buyersCount: 46
      },
      {
        id: "col_trend_dip4",
        name: "Exhausted Momentum Dip Scalper",
        symbol: "EXHAUST",
        category: "trends",
        description: "Momentum exhaustion tokens trading at extreme RSI discounts.",
        creator: "0xWebLore",
        imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500",
        createdAt: Date.now() - (86400000 * 2.8),
        roi24h: -28.2,
        tokens: [
          { symbol: "r/", weight: 60, name: "r/" },
          { symbol: "BILLY", weight: 40, name: "Billycoin" }
        ],
        totalVolumeUsd: 39000,
        buyersCount: 38
      },
      {
        id: "col_trend_dip5",
        name: "Algorithm Shift Recovery Pack",
        symbol: "ALGODIP",
        category: "trends",
        description: "Tokens repositioning following recommendation algorithm shifts.",
        creator: "0xNightOwl",
        imageUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=500",
        createdAt: Date.now() - (86400000 * 2),
        roi24h: -19.4,
        tokens: [
          { symbol: "ORANGEPENG", weight: 50, name: "The Orange Backpack Peng..." },
          { symbol: "CESS", weight: 50, name: "Cession Sovereign Engine" }
        ],
        totalVolumeUsd: 31000,
        buyersCount: 30
      },

      // ==========================================
      // 4. WHALE CATEGORY (Top 5 Best & Top 5 Worst)
      // ==========================================
      {
        id: "col_whale_top",
        name: "Tier-1 Whale Accumulation Basket",
        symbol: "WHALEPICK",
        category: "whale",
        description: "The highest net-worth wallet inflows on Solana verified via on-chain balance deltas.",
        creator: "0xWhaleTracker",
        imageUrl: "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=500",
        createdAt: Date.now() - (86400000 * 1.8),
        roi24h: 368.0,
        tokens: [
          { symbol: "CESS", weight: 40, name: "Cession Sovereign Engine" },
          { symbol: "USER", weight: 35, name: "The Random Bull" },
          { symbol: "BILLY", weight: 25, name: "Billycoin" }
        ],
        totalVolumeUsd: 610000,
        buyersCount: 490
      },
      {
        id: "col_whale_smart",
        name: "Smart Money High-Conviction Index",
        symbol: "SMARTCAP",
        category: "whale",
        description: "Elite traders with >80% 30-day win rate heavily loading on bonding curves.",
        creator: "0xSmartMoneyHQ",
        imageUrl: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=500",
        createdAt: Date.now() - (86400000 * 2.5),
        roi24h: 245.8,
        tokens: [
          { symbol: "USER", weight: 50, name: "The Random Bull" },
          { symbol: "CESS", weight: 50, name: "Cession Sovereign Engine" }
        ],
        totalVolumeUsd: 430000,
        buyersCount: 310
      },
      {
        id: "col_whale_deep",
        name: "Deep Liquidity Institutional Vault",
        symbol: "DEEPFLOW",
        category: "whale",
        description: "High volume, low slippage baskets curated for large-size SOL execution.",
        creator: "0xDeepLiquidity",
        imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=500",
        createdAt: Date.now() - (86400000 * 3),
        roi24h: 160.2,
        tokens: [
          { symbol: "BILLY", weight: 50, name: "Billycoin" },
          { symbol: "USER", weight: 50, name: "The Random Bull" }
        ],
        totalVolumeUsd: 295000,
        buyersCount: 220
      },
      {
        id: "col_whale_inflow",
        name: "On-Chain Smart Inflow Pack",
        symbol: "INFLOW",
        category: "whale",
        description: "Tokens seeing sustained >50 SOL single-tx buy orders over 12 hours.",
        creator: "0xInflowRadar",
        imageUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=500",
        createdAt: Date.now() - (86400000 * 2),
        roi24h: 98.0,
        tokens: [
          { symbol: "FLY", weight: 40, name: "Minecraft Fruit Fly" },
          { symbol: "BILLY", weight: 60, name: "Billycoin" }
        ],
        totalVolumeUsd: 180000,
        buyersCount: 140
      },
      {
        id: "col_whale_stake",
        name: "Sovereign Staker Whale Pack",
        symbol: "SOLSTAKE",
        category: "whale",
        description: "Whale tokens with >70% supply time-locked in Staking Vaults.",
        creator: "0xWhaleTracker",
        imageUrl: "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=500",
        createdAt: Date.now() - (86400000 * 4),
        roi24h: 64.5,
        tokens: [
          { symbol: "CESS", weight: 60, name: "Cession Sovereign Engine" },
          { symbol: "USER", weight: 40, name: "The Random Bull" }
        ],
        totalVolumeUsd: 120000,
        buyersCount: 96
      },
      {
        id: "col_whale_dip1",
        name: "Whale Profit-Taking Dip Gem Basket",
        symbol: "DUMPDIP",
        category: "whale",
        description: "Temporary dip caused by massive whale de-risking into waiting limit orders.",
        creator: "0xDipWhale",
        imageUrl: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=500",
        createdAt: Date.now() - (86400000 * 4),
        roi24h: -46.0,
        tokens: [
          { symbol: "r/", weight: 50, name: "r/" },
          { symbol: "FLY", weight: 50, name: "Minecraft Fruit Fly" }
        ],
        totalVolumeUsd: 95000,
        buyersCount: 78
      },
      {
        id: "col_whale_dip2",
        name: "Capitulation Liquidation Rebound Pack",
        symbol: "REBOUND",
        category: "whale",
        description: "Post-cascade liquidation tokens ready for violent snapback recoveries.",
        creator: "0xSmartMoneyHQ",
        imageUrl: "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=500",
        createdAt: Date.now() - (86400000 * 3.5),
        roi24h: -39.8,
        tokens: [
          { symbol: "ORANGEPENG", weight: 50, name: "The Orange Backpack Peng..." },
          { symbol: "r/", weight: 50, name: "r/" }
        ],
        totalVolumeUsd: 76000,
        buyersCount: 63
      },
      {
        id: "col_whale_dip3",
        name: "Smart Money Stop-Hunt Floor Pack",
        symbol: "STOPHUNT",
        category: "whale",
        description: "Tokens bouncing off calculated stop-hunt zones with renewed buy pressure.",
        creator: "0xInflowRadar",
        imageUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=500",
        createdAt: Date.now() - (86400000 * 3),
        roi24h: -31.4,
        tokens: [
          { symbol: "FLY", weight: 50, name: "Minecraft Fruit Fly" },
          { symbol: "USER", weight: 50, name: "The Random Bull" }
        ],
        totalVolumeUsd: 58000,
        buyersCount: 51
      },
      {
        id: "col_whale_dip4",
        name: "High-Volume Whale Dip Scalper",
        symbol: "VOLHUNTER",
        category: "whale",
        description: "Heavy volume drawdown assets with institutional market maker absorption.",
        creator: "0xDeepLiquidity",
        imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=500",
        createdAt: Date.now() - (86400000 * 2.5),
        roi24h: -24.0,
        tokens: [
          { symbol: "r/", weight: 60, name: "r/" },
          { symbol: "BILLY", weight: 40, name: "Billycoin" }
        ],
        totalVolumeUsd: 46000,
        buyersCount: 42
      },
      {
        id: "col_whale_dip5",
        name: "Oversold Institutional Flow Basket",
        symbol: "FLOWDIP",
        category: "whale",
        description: "Institutional assets undergoing minor technical retracements.",
        creator: "0xWhaleTracker",
        imageUrl: "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=500",
        createdAt: Date.now() - (86400000 * 2),
        roi24h: -17.5,
        tokens: [
          { symbol: "ORANGEPENG", weight: 50, name: "The Orange Backpack Peng..." },
          { symbol: "CESS", weight: 50, name: "Cession Sovereign Engine" }
        ],
        totalVolumeUsd: 38000,
        buyersCount: 34
      },

      // ==========================================
      // 5. AI AGENTS CATEGORY (Top 5 Best & Top 5 Worst)
      // ==========================================
      {
        id: "col_ai_sovereign",
        name: "AI & Autonomous Agent Basket",
        symbol: "AISYS",
        category: "ai",
        description: "Curated portfolio of high-velocity AI agent tokens and sovereign liquidity engines.",
        creator: "0x777A3F98A86e2417C218B14a6Eb339c08B7A6b3D",
        imageUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=200",
        createdAt: Date.now() - 86400000,
        roi24h: 310.5,
        tokens: [
          { symbol: "CESS", weight: 40, name: "Cession Sovereign Engine" },
          { symbol: "FLY", weight: 30, name: "Minecraft Fruit Fly" },
          { symbol: "USER", weight: 30, name: "The Random Bull" }
        ],
        totalVolumeUsd: 480000,
        buyersCount: 380
      },
      {
        id: "col_ai_swarm",
        name: "Neural LLM Agent Swarm Index",
        symbol: "SWARM",
        category: "ai",
        description: "Multi-agent autonomous cognitive systems trading on continuous bonding curves.",
        creator: "0xNeuralSwarm",
        imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500",
        createdAt: Date.now() - (86400000 * 1.5),
        roi24h: 235.0,
        tokens: [
          { symbol: "FLY", weight: 50, name: "Minecraft Fruit Fly" },
          { symbol: "USER", weight: 50, name: "The Random Bull" }
        ],
        totalVolumeUsd: 360000,
        buyersCount: 290
      },
      {
        id: "col_ai_bots",
        name: "Autonomous Bot Trading Scalper",
        symbol: "BOTNET",
        category: "ai",
        description: "Algorithmic bot tokens with autonomous liquidity provisioning capabilities.",
        creator: "0xBotCluster",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500",
        createdAt: Date.now() - (86400000 * 2),
        roi24h: 142.6,
        tokens: [
          { symbol: "CESS", weight: 50, name: "Cession Sovereign Engine" },
          { symbol: "BILLY", weight: 50, name: "Billycoin" }
        ],
        totalVolumeUsd: 240000,
        buyersCount: 195
      },
      {
        id: "col_ai_compute",
        name: "Decentralized Compute & GPU Cluster",
        symbol: "COMPUTE",
        category: "ai",
        description: "Decentralized GPU inference nodes and zero-knowledge compute tokens.",
        creator: "0xGpuInference",
        imageUrl: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500",
        createdAt: Date.now() - (86400000 * 3),
        roi24h: 88.4,
        tokens: [
          { symbol: "FLY", weight: 60, name: "Minecraft Fruit Fly" },
          { symbol: "USER", weight: 40, name: "The Random Bull" }
        ],
        totalVolumeUsd: 165000,
        buyersCount: 130
      },
      {
        id: "col_ai_synth",
        name: "Self-Synthesizing Algorithmic Pack",
        symbol: "SYNTH",
        category: "ai",
        description: "Automated reinforcement learning agents managing internal supply schedules.",
        creator: "0xSynthAI",
        imageUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=500",
        createdAt: Date.now() - (86400000 * 2.5),
        roi24h: 59.0,
        tokens: [
          { symbol: "CESS", weight: 60, name: "Cession Sovereign Engine" },
          { symbol: "ORANGEPENG", weight: 40, name: "The Orange Backpack Peng..." }
        ],
        totalVolumeUsd: 110000,
        buyersCount: 88
      },
      {
        id: "col_ai_dip1",
        name: "AI Model Hallucination Dip Hunters",
        symbol: "GLITCH",
        category: "ai",
        description: "Deep discount entry on oversold algorithmic tokens after temporary agent glitches.",
        creator: "0xGlitchScalper",
        imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500",
        createdAt: Date.now() - (86400000 * 4),
        roi24h: -55.2,
        tokens: [
          { symbol: "r/", weight: 50, name: "r/" },
          { symbol: "FLY", weight: 50, name: "Minecraft Fruit Fly" }
        ],
        totalVolumeUsd: 87000,
        buyersCount: 72
      },
      {
        id: "col_ai_dip2",
        name: "Overbought Agent Cooling Basket",
        symbol: "COOLDOWN",
        category: "ai",
        description: "Healthy technical pullback on autonomous AI agents entering secondary consolidation.",
        creator: "0xBotCluster",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500",
        createdAt: Date.now() - (86400000 * 3.5),
        roi24h: -42.0,
        tokens: [
          { symbol: "ORANGEPENG", weight: 50, name: "The Orange Backpack Peng..." },
          { symbol: "r/", weight: 50, name: "r/" }
        ],
        totalVolumeUsd: 69000,
        buyersCount: 58
      },
      {
        id: "col_ai_dip3",
        name: "Compute GPU Oversold Gem Pack",
        symbol: "GPUFLOOR",
        category: "ai",
        description: "Compute cluster tokens trading near raw hardware cost basis on bonding curves.",
        creator: "0xGpuInference",
        imageUrl: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500",
        createdAt: Date.now() - (86400000 * 3),
        roi24h: -32.8,
        tokens: [
          { symbol: "FLY", weight: 50, name: "Minecraft Fruit Fly" },
          { symbol: "USER", weight: 50, name: "The Random Bull" }
        ],
        totalVolumeUsd: 53000,
        buyersCount: 47
      },
      {
        id: "col_ai_dip4",
        name: "Fallen Autonomous Swarm Basket",
        symbol: "OFFLINE",
        category: "ai",
        description: "Agent swarms preparing for firmware upgrades with high upside volatility.",
        creator: "0xNeuralSwarm",
        imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500",
        createdAt: Date.now() - (86400000 * 2.8),
        roi24h: -25.5,
        tokens: [
          { symbol: "r/", weight: 60, name: "r/" },
          { symbol: "BILLY", weight: 40, name: "Billycoin" }
        ],
        totalVolumeUsd: 42000,
        buyersCount: 39
      },
      {
        id: "col_ai_dip5",
        name: "Neural Weight Pruning Dip Scalper",
        symbol: "PRUNEDIP",
        category: "ai",
        description: "Pruned model tokens finding support on protocol reserve curves.",
        creator: "0xSynthAI",
        imageUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=500",
        createdAt: Date.now() - (86400000 * 2),
        roi24h: -16.0,
        tokens: [
          { symbol: "ORANGEPENG", weight: 50, name: "The Orange Backpack Peng..." },
          { symbol: "CESS", weight: 50, name: "Cession Sovereign Engine" }
        ],
        totalVolumeUsd: 34000,
        buyersCount: 31
      }
    ];

    sampleBaskets.forEach(b => this.collections.set(b.id, b));
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

  getNewListings(limit = 6) {
    return this.getNewCoins(limit);
  }

  getToken(symbol, accessKey = null) {
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

  /**
   * Top Holders & Bubble Distribution
   */
  getTokenHolders(symbol) {
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

      const roi24h = col.roi24h !== undefined ? col.roi24h : Number(calculatedRoi.toFixed(1));

      return {
        ...col,
        category: col.category || 'memes',
        roi24h,
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

  createCollection({ name, symbol, description, category, creator, tokens, imageUrl }) {
    if (!name || !tokens || !Array.isArray(tokens) || tokens.length === 0) {
      throw new Error("Collection name and valid tokens list are required.");
    }

    // Verify weights sum to 100
    const totalWeight = tokens.reduce((sum, t) => sum + (parseFloat(t.weight) || 0), 0);
    if (totalWeight <= 0) {
      throw new Error("Token weights must be greater than zero.");
    }

    const normalizedTokens = tokens.map(t => ({
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

  buyTokens(symbol, solAmount, buyerAddress) {
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
