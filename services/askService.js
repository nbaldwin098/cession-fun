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
  return { feed, bots, statement, address: address || null };
}
function localAnswer(message, ctx) {
  const q = String(message || '').toLowerCase();
  if (/bot/.test(q)) return 'I can save a bot rule (symbol, buy SOL, slippage). It will not place trades until the Solana program is live.';
  if (/pnl|p\/l|profit|statement|hold/.test(q)) {
    if (!ctx.address) return 'Connect a wallet. I only report indexed Cession trades for that address.';
    const n = (ctx.statement && (ctx.statement.count || (ctx.statement.transactions || []).length)) || 0;
    return n ? ('This wallet has ' + n + ' indexed Cession trades. Not tax advice.') : 'No statements to display.';
  }
  if (!ctx.feed.length) return 'No live coins yet. Create is 0.05 SOL. Trade fee is 0.50 percent.';
  const mover = ctx.feed.slice().sort((a, b) => Math.abs(b.change24h || 0) - Math.abs(a.change24h || 0))[0];
  if (/why|up|down|move/.test(q) && mover) return (mover.symbol || 'A coin') + ' is the largest 24h move at ' + Number(mover.change24h || 0).toFixed(1) + '%. That is curve volume.';
  return 'There are ' + ctx.feed.length + ' live coins. Ask about a ticker, your P/L, or a bot rule.';
}
async function modelAnswer(message, ctx) {
  const key = process.env.XAI_API_KEY || process.env.GROK_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return localAnswer(message, ctx);
  const xai = !!(process.env.XAI_API_KEY || process.env.GROK_API_KEY);
  const url = xai ? 'https://api.x.ai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
  const model = xai ? 'grok-4-fast' : 'gpt-4o-mini';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are Cession Ask. Use only provided site data. No fake balances. Not investment advice. If asked to make a bot, describe the saved rule.' },
        { role: 'user', content: JSON.stringify({ question: message, site: ctx }) }
      ]
    })
  });
  if (!res.ok) return localAnswer(message, ctx);
  const data = await res.json();
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || localAnswer(message, ctx);
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
  const bot = { id: 'bot_' + Date.now(), owner: owner || null, symbol: String(rule.symbol || '').toUpperCase(), buySol: Number(rule.buySol || 0.05), slippage: Number(rule.slippage || 1), live: false, createdAt: new Date().toISOString() };
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
