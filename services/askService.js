const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'data');
function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8')); }
  catch { return fallback; }
}
function writeJson(name, value) {
  if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(path.join(DATA, name), JSON.stringify(value, null, 2));
}
function liveFeed() {
  try {
    const bondingCurve = require('./bondingCurve');
    return (bondingCurve.getPulseFeed('all', 50) || []).filter((c) => {
      const mint = String(c.mintAddress || c.mint || '');
      const sym = String(c.symbol || '').toUpperCase();
      return mint.length >= 32 && !/TEST|DEMO|TDOGE|QPEPE|BDOGE|GRAD/.test(sym);
    });
  } catch { return []; }
}
function siteContext(address) {
  const feed = liveFeed();
  const bots = (readJson('bots.json', { bots: [] }).bots || []).filter((b) => !address || b.owner === address);
  let statement = null;
  if (address) {
    try { statement = require('./bondingCurve').getMonthlyStatement(address); } catch { statement = null; }
  }
  return {
    feed: feed.map((c) => ({ symbol: c.symbol, name: c.name, change24h: c.change24h, volume24hUsd: c.volume24hUsd, priceUsd: c.priceUsd, mint: c.mintAddress || c.mint })),
    bots,
    statement,
    address: address || null
  };
}
function localAnswer(message, ctx) {
  const q = String(message || '').toLowerCase();
  if (/bot/.test(q)) return 'I can save a DCA, limit, or take-profit rule. It will not place trades until the program is live.';
  if (/pnl|p\/l|profit|statement|hold/.test(q)) {
    if (!ctx.address) return 'Connect a wallet. I only report indexed Cession trades.';
    const n = (ctx.statement && (ctx.statement.count || (ctx.statement.transactions || []).length)) || 0;
    return n ? ('This wallet has ' + n + ' indexed Cession trades.') : 'No statements to display.';
  }
  if (!ctx.feed.length && /coin|cession|token|chart/.test(q)) return 'No live coins yet. Create is 0.05 SOL.';
  if (ctx.feed.length && /coin|best|worst|trending/.test(q)) return 'Live coins: ' + ctx.feed.map((c) => c.symbol).join(', ') + '.';
  return 'I can help with Cession and everyday questions. Ask anything.';
}
async function modelAnswer(message, ctx) {
  const key = process.env.XAI_API_KEY || process.env.GROK_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return localAnswer(message, ctx);
  const xai = !!(process.env.XAI_API_KEY || process.env.GROK_API_KEY);
  const url = xai ? 'https://api.x.ai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
  const model = xai ? 'grok-4-fast' : 'gpt-4o-mini';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        messages: [
          { role: 'system', content: 'You are Cession Ask. Answer everyday questions normally and helpfully. When the topic is Cession, coins, wallets, or P/L, use only the provided live site data. Never invent balances, fills, or coins. Not investment advice. Be concise.' },
          { role: 'user', content: 'Question: ' + message + '\n\nLive Cession data: ' + JSON.stringify(ctx) }
        ]
      })
    });
    if (!res.ok) return localAnswer(message, ctx);
    const data = await res.json();
    return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || localAnswer(message, ctx);
  } catch { return localAnswer(message, ctx); }
}
function bannerQuestion() {
  const feed = liveFeed();
  if (!feed.length) return 'Why are there no live coins yet?';
  const mover = feed.slice().sort((a, b) => Math.abs(b.change24h || 0) - Math.abs(a.change24h || 0))[0];
  const chg = Number(mover.change24h || 0);
  return 'Why is ' + mover.symbol + ' ' + (chg >= 0 ? 'up' : 'down') + ' ' + Math.abs(chg).toFixed(1) + '%?';
}
function saveBot(owner, rule) {
  const store = readJson('bots.json', { bots: [] });
  const bot = {
    id: 'bot_' + Date.now(),
    owner: owner || null,
    type: String(rule.type || 'dca'),
    symbol: String(rule.symbol || '').toUpperCase(),
    buySol: Number(rule.buySol || 0.05),
    slippage: Number(rule.slippage || 1),
    interval: rule.interval || '1h',
    live: false,
    createdAt: new Date().toISOString()
  };
  store.bots.push(bot);
  writeJson('bots.json', store);
  return bot;
}
function follows() { return readJson('follows.json', { follows: [] }); }
function addFollow(follower, creator) {
  const store = follows();
  if (!store.follows.find((f) => f.follower === follower && f.creator === creator)) {
    store.follows.push({ follower, creator, at: new Date().toISOString() });
    writeJson('follows.json', store);
  }
  return store.follows.filter((f) => f.follower === follower);
}
module.exports = { siteContext, modelAnswer, bannerQuestion, saveBot, addFollow, follows, liveFeed };
