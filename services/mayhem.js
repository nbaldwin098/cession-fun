const crypto = require('crypto');

const RULES = {
  extraTokens: 1_000_000_000,
  curveTokens: 1_000_000_000,
  totalSupply: 2_000_000_000,
  windowMs: 24 * 60 * 60 * 1000,
  minIntervalMs: 1000,
  maxLamportsPerTrade: 50_000_000,
  buyProbability: 0.5
};

const coins = new Map();
let timer = null;

function programReady() {
  return Boolean(String(process.env.CESSION_PROGRAM_ID || '').trim());
}

function keeperOn() {
  return String(process.env.MAYHEM_KEEPER || '') === '1';
}

function agentKeySet() {
  return Boolean(String(process.env.MAYHEM_AGENT_KEY || '').trim());
}

function status() {
  return {
    success: true,
    live: false,
    reason: !programReady()
      ? 'Program is not deployed.'
      : !keeperOn()
        ? 'MAYHEM_KEEPER is off.'
        : !agentKeySet()
          ? 'MAYHEM_AGENT_KEY is not set.'
          : 'No Mayhem coins. Create flag is not enabled yet.',
    rules: RULES,
    flagged: [...coins.values()],
    programId: process.env.CESSION_PROGRAM_ID || null
  };
}

function pickSide() {
  return crypto.randomInt(0, 1000) < RULES.buyProbability * 1000 ? 'buy' : 'sell';
}

function pickLamports() {
  return 1_000_000 + crypto.randomInt(0, RULES.maxLamportsPerTrade);
}

async function tick() {
  if (!keeperOn() || !programReady() || !agentKeySet()) return;
  const now = Date.now();
  for (const coin of coins.values()) {
    if (!coin.mayhem) continue;
    if (now - coin.startedAt >= RULES.windowMs) {
      coin.ended = true;
      coin.next = 'burn leftover agent tokens on-chain';
      continue;
    }
    if (coin.lastTradeAt && now - coin.lastTradeAt < RULES.minIntervalMs) continue;
    coin.lastTradeAt = now;
    coin.planned = {
      side: pickSide(),
      lamports: pickLamports(),
      note: 'Would sign buy/sell with the agent key. No tx until the program is live.'
    };
  }
}

function start() {
  if (timer) return;
  timer = setInterval(function () {
    tick().catch(function () {});
  }, 1000);
}

module.exports = { RULES, status, start, coins };
