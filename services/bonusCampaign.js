const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'bonus_campaign.json');
const BONUS_CODE = String(process.env.BONUS_CODE || 'FREESOL').trim().toUpperCase();
const BONUS_POINTS = Number(process.env.BONUS_POINTS || 300);

function ensureStore() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({ claims: [] }, null, 2), 'utf8');
  }
}

function readStore() {
  ensureStore();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.claims)) return { claims: [] };
    return parsed;
  } catch (e) {
    return { claims: [] };
  }
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

function campaignMeta() {
  return {
    codeHint: BONUS_CODE ? (BONUS_CODE.slice(0, 2) + '***') : 'not-set',
    points: BONUS_POINTS
  };
}

function getStatus(address) {
  const wallet = normalizeAddress(address);
  if (!wallet) return { walletAddress: '', claimed: false, ...campaignMeta() };
  const store = readStore();
  const claim = store.claims.find((c) => c.walletAddress === wallet) || null;
  return {
    walletAddress: wallet,
    claimed: !!claim,
    claimedAt: claim ? claim.claimedAt : null,
    points: claim ? claim.points : BONUS_POINTS,
    codeHint: campaignMeta().codeHint
  };
}

function claim(address, code) {
  const wallet = normalizeAddress(address);
  if (!wallet) throw new Error('Wallet address is required.');
  const inputCode = String(code || '').trim().toUpperCase();
  if (!BONUS_CODE) throw new Error('Campaign code is not configured.');
  if (inputCode !== BONUS_CODE) throw new Error('Invalid promo code.');

  const store = readStore();
  const existing = store.claims.find((c) => c.walletAddress === wallet);
  if (existing) {
    return {
      walletAddress: wallet,
      alreadyClaimed: true,
      claimedAt: existing.claimedAt,
      points: existing.points
    };
  }

  const row = {
    walletAddress: wallet,
    claimedAt: new Date().toISOString(),
    points: BONUS_POINTS
  };
  store.claims.push(row);
  writeStore(store);
  return { ...row, alreadyClaimed: false };
}

module.exports = {
  getStatus,
  claim
};
