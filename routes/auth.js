const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const nacl = require('tweetnacl');
const bs58 = require('bs58').default || require('bs58');
const { ethers } = require('ethers');
const ofacChecker = require('../services/ofacChecker');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const TICKETS_FILE = path.join(__dirname, '..', 'data', 'tickets.json');
const usersByAddress = new Map();
const activeSessions = new Map();
const nonces = new Map();
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function keysFor(address) {
  const raw = String(address || '').trim();
  const out = [];
  if (raw) out.push(raw);
  if (raw.startsWith('0x')) out.push(raw.toLowerCase());
  return out;
}
function findUser(address) {
  for (const k of keysFor(address)) {
    if (usersByAddress.has(k)) return usersByAddress.get(k);
    const low = k.toLowerCase();
    for (const [ak, u] of usersByAddress) {
      if (ak.toLowerCase() === low) return u;
    }
  }
  return null;
}
function putUser(user) {
  keysFor(user.address || user.cleanAddress).forEach((k) => usersByAddress.set(k, user));
}
function loadUsersFromDisk() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      if (Array.isArray(parsed)) parsed.forEach((u) => { if (u.address) putUser(u); });
    }
  } catch (e) {}
}
function saveUsersToDisk() {
  try {
    const uniq = [];
    const seen = new Set();
    for (const u of usersByAddress.values()) {
      const id = (u.address || '').toLowerCase();
      if (seen.has(id)) continue;
      seen.add(id);
      uniq.push(u);
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(uniq, null, 2));
  } catch (e) {}
}
function readTickets() {
  try { return JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8')); } catch { return { tickets: {} }; }
}
function writeTickets(store) {
  fs.mkdirSync(path.dirname(TICKETS_FILE), { recursive: true });
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(store, null, 2));
}
function usernameTaken(name, exceptAddr) {
  const want = String(name || '').trim().toLowerCase();
  const except = String(exceptAddr || '').toLowerCase();
  for (const u of usersByAddress.values()) {
    if (u.usernameLocked && String(u.username || '').toLowerCase() === want && String(u.address || '').toLowerCase() !== except) return true;
  }
  return false;
}
function ensureUser(address) {
  let user = findUser(address);
  if (user) return user;
  const raw = String(address || '').trim();
  user = {
    id: 'usr_' + crypto.randomBytes(6).toString('hex'),
    address: raw,
    cleanAddress: raw.startsWith('0x') ? raw.toLowerCase() : raw,
    username: null,
    usernameLocked: false,
    avatar: '',
    createdAt: Date.now(),
    lastLogin: Date.now()
  };
  putUser(user);
  saveUsersToDisk();
  return user;
}
loadUsersFromDisk();

function verifySolanaSignature(address, message, signatureHexOrBase58) {
  try {
    const messageBytes = new TextEncoder().encode(message);
    let signatureBytes;
    if (/^[0-9a-fA-F]+$/.test(signatureHexOrBase58)) signatureBytes = Buffer.from(signatureHexOrBase58, 'hex');
    else signatureBytes = bs58.decode(signatureHexOrBase58);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, bs58.decode(address));
  } catch { return false; }
}
function verifyEthereumSignature(address, message, signatureHex) {
  try { return ethers.verifyMessage(message, signatureHex).toLowerCase() === address.toLowerCase(); } catch { return false; }
}

router.post('/wallet-login', (req, res) => {
  try {
    const { address, chain = 'Solana', walletType = 'phantom', message, signature } = req.body;
    if (!address) return res.status(400).json({ success: false, error: 'Wallet address is required.' });
    if (!message || !signature) return res.status(401).json({ success: false, error: 'Signature required.' });
    const screen = ofacChecker.screenAddress(address);
    if (!screen.allowed) return res.status(403).json({ success: false, error: screen.detail || 'Blocked.' });
    const sol = chain.toLowerCase() === 'solana' || /phantom|solflare/i.test(walletType);
    const ok = sol ? verifySolanaSignature(address, message, signature) : verifyEthereumSignature(address, message, signature);
    if (!ok) return res.status(401).json({ success: false, error: 'Invalid wallet signature.' });
    const user = ensureUser(address);
    user.lastLogin = Date.now();
    saveUsersToDisk();
    const addrKey = String(address).toLowerCase();
    const nrec = nonces.get(addrKey);
    if (nrec) {
      if (nrec.exp < Date.now()) { nonces.delete(addrKey); return res.status(401).json({ success: false, error: 'Nonce expired. Try again.' }); }
      if (!String(message).includes(nrec.nonce)) return res.status(401).json({ success: false, error: 'Nonce mismatch.' });
      nonces.delete(addrKey);
    }
    const token = 'sess_' + crypto.randomBytes(24).toString('hex');
    user._exp = Date.now() + SESSION_TTL_MS;
    activeSessions.set(token, user);
    res.json({ success: true, token, user: { address: user.address, username: user.username, usernameLocked: !!user.usernameLocked, avatar: user.avatar || '', needsUsername: !user.usernameLocked } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/ticket', (req, res) => {
  const ticket = crypto.randomBytes(12).toString('hex');
  const store = readTickets();
  store.tickets[ticket] = { status: 'pending', provider: req.body.provider || 'phantom', createdAt: Date.now() };
  writeTickets(store);
  const origin = (req.headers.origin || ('https://' + (req.headers.host || 'cession.fun'))).replace(/\/$/, '');
  res.json({ success: true, ticket, authUrl: origin + '/auth.html?ticket=' + ticket + '&provider=' + encodeURIComponent(req.body.provider || 'phantom') });
});

router.get('/ticket/:id', (req, res) => {
  const row = readTickets().tickets[req.params.id];
  if (!row) return res.status(404).json({ success: false, error: 'Unknown ticket' });
  res.json({ success: true, ...row });
});

router.post('/ticket/:id/complete', (req, res) => {
  const store = readTickets();
  const row = store.tickets[req.params.id];
  if (!row) return res.status(404).json({ success: false, error: 'Unknown ticket' });
  const address = String(req.body.address || '').trim();
  if (address.length < 20) return res.status(400).json({ success: false, error: 'Address required' });
  const user = ensureUser(address);
  row.status = 'complete';
  row.address = user.address;
  row.user = { address: user.address, username: user.username, usernameLocked: !!user.usernameLocked, avatar: user.avatar || '', needsUsername: !user.usernameLocked };
  writeTickets(store);
  res.json({ success: true, user: row.user });
});

router.post('/username', (req, res) => {
  const address = String(req.body.address || '').trim();
  const username = String(req.body.username || '').trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
  if (!address || username.length < 3) return res.status(400).json({ success: false, error: 'Username must be 3-20 letters or numbers.' });
  const user = ensureUser(address);
  if (user.usernameLocked) {
    return res.json({ success: true, username: user.username, already: true });
  }
  if (usernameTaken(username, address)) return res.status(409).json({ success: false, error: 'Username taken.' });
  user.username = username;
  user.usernameLocked = true;
  putUser(user);
  saveUsersToDisk();
  res.json({ success: true, username });
});

router.post('/avatar', (req, res) => {
  const user = findUser(req.body.address);
  if (!user) return res.status(404).json({ success: false, error: 'Connect first.' });
  user.avatar = String(req.body.avatar || '').slice(0, 400000);
  saveUsersToDisk();
  res.json({ success: true });
});

router.get('/profile/:address', (req, res) => {
  const user = findUser(req.params.address);
  if (!user) return res.json({ success: true, exists: false, usernameLocked: false });
  res.json({ success: true, exists: true, username: user.username, usernameLocked: !!user.usernameLocked, avatar: user.avatar || '' });
});

router.get('/session', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '') || req.query.token;
  if (!token || !activeSessions.has(token)) return res.status(401).json({ success: false, authenticated: false });
  const user = activeSessions.get(token);
  if (user && user._exp && user._exp < Date.now()) {
    activeSessions.delete(token);
    return res.status(401).json({ success: false, authenticated: false });
  }
  res.json({ success: true, authenticated: true, user });
});

router.post('/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '') || req.body.token;
  if (token) activeSessions.delete(token);
  res.json({ success: true });
});

router.post(['/register', '/login', '/google'], (req, res) => {
  res.status(410).json({ success: false, error: 'Cession is non-custodial. Connect Phantom or MetaMask.' });
});

function pruneSessions() {
  const now = Date.now();
  for (const [tok, u] of activeSessions) {
    if (u && u._exp && u._exp < now) activeSessions.delete(tok);
  }
}

function getSession(token) {
  if (!token) return null;
  pruneSessions();
  const u = activeSessions.get(token);
  if (!u) return null;
  if (u._exp && u._exp < Date.now()) {
    activeSessions.delete(token);
    return null;
  }
  return u;
}

function requireAuth(req, res, next) {
  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : (req.headers['x-cession-session'] || (req.body && req.body.sessionToken) || req.query.token || '');
  const user = getSession(token);
  if (!user) return res.status(401).json({ ok: false, success: false, error: 'Connect and sign in with your wallet.' });
  req.cessionUser = user;
  req.cessionToken = token;
  next();
}

function sessionWalletMatches(req, claimed) {
  const sess = (req.cessionUser && (req.cessionUser.address || req.cessionUser.cleanAddress)) || '';
  const claim = String(claimed || '').trim();
  if (!sess || !claim) return false;
  return sess.toLowerCase() === claim.toLowerCase();
}

router.get('/nonce', (req, res) => {
  const address = String(req.query.address || req.query.wallet || '').trim();
  if (!address) return res.status(400).json({ success: false, error: 'address required' });
  const nonce = crypto.randomBytes(16).toString('hex');
  nonces.set(address.toLowerCase(), { nonce, exp: Date.now() + 10 * 60 * 1000 });
  const message =
    'Cession sign-in\n' +
    'Address: ' + address + '\n' +
    'Nonce: ' + nonce + '\n' +
    'Domain: cession.fun\n' +
    'This proves you control this wallet. No funds move.';
  res.json({ success: true, nonce, message });
});

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.getSession = getSession;
module.exports.sessionWalletMatches = sessionWalletMatches;
