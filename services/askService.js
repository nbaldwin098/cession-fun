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
    return (bondingCurve.getPulseFeed('all', 80) || []).filter((c) => {
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
    liveCoins: feed.map((c) => ({
      symbol: c.symbol,
      name: c.name,
      change24h: c.change24h || 0,
      volume24hUsd: c.volume24hUsd || 0,
      priceUsd: c.priceUsd || 0,
      uniqueTraders: c.uniqueTraders || 0,
      mint: c.mintAddress || c.mint
    })),
    createFeeSol: 0.05,
    tradeFeePercent: 0.5,
    programLive: false,
    bots,
    statement,
    address: address || null
  };
}

const SYSTEM = [
  'You are Cession Ask. Talk like Grok: direct, useful, a little dry.',
  'Answer everyday questions fully: math, explanations, how-tos, jokes.',
  'When the topic is Cession, coins, wallets, fees, or P/L, use the live snapshot only. Do not invent coins or balances.',
  'If the board is empty, say so once, then still answer the rest of the question.',
  'Not investment advice.'
].join(' ');

const MODELS = ['grok-4.3', 'grok-4.2', 'grok-4.20', 'grok-4-3', 'grok-4-2'];

async function callXai(messages) {
  const key = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!key) return { ok: false, error: 'no_key' };
  const models = process.env.XAI_MODEL ? [process.env.XAI_MODEL].concat(MODELS) : MODELS;
  const errors = [];
  for (const model of models) {
    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify({ model, temperature: 0.7, messages })
      });
      const data = await res.json();
      const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (res.ok && text) return { ok: true, text, model };
      errors.push(model + ': ' + ((data.error && (data.error.message || data.error.code)) || ('HTTP ' + res.status)));
    } catch (e) {
      errors.push(model + ': ' + e.message);
    }
  }
  return { ok: false, error: errors.join(' | ') };
}

async function modelAnswer(message, ctx) {
  const snapshot = {
    liveCoinCount: (ctx.liveCoins || []).length,
    liveCoins: ctx.liveCoins || [],
    createFeeSol: ctx.createFeeSol,
    tradeFeePercent: ctx.tradeFeePercent,
    programLive: ctx.programLive,
    wallet: ctx.address || null,
    statement: ctx.statement || null,
    bots: ctx.bots || []
  };
  const result = await callXai([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: 'Live Cession snapshot:\n' + JSON.stringify(snapshot) + '\n\nUser:\n' + message }
  ]);
  if (result.ok) return result.text;
  return 'Grok is not answering yet. Set XAI_MODEL on Render to the exact name from the console (grok-4.3 or grok-4.2). Detail: ' + result.error;
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
