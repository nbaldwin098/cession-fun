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

function loadUsersFromDisk() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      if (Array.isArray(parsed)) parsed.forEach((u) => { if (u.address) usersByAddress.set(u.address.toLowerCase(), u); });
    }
  } catch (e) {}
}
function saveUsersToDisk() {
  try { fs.writeFileSync(USERS_FILE, JSON.stringify(Array.from(usersByAddress.values()), null, 2)); } catch (e) {}
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
  for (const u of usersByAddress.values()) {
    if (u.usernameLocked && String(u.username || '').toLowerCase() === want && u.cleanAddress !== exceptAddr) return true;
  }
  return false;
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
    const cleanAddr = address.toLowerCase();
    let user = usersByAddress.get(cleanAddr);
    if (!user) {
      user = { id: 'usr_' + crypto.randomBytes(6).toString('hex'), address, cleanAddress: cleanAddr, chain, walletType, username: null, usernameLocked: false, avatar: '', createdAt: Date.now(), lastLogin: Date.now() };
      usersByAddress.set(cleanAddr, user);
    } else user.lastLogin = Date.now();
    saveUsersToDisk();
    const token = 'sess_' + crypto.randomBytes(24).toString('hex');
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
  const cleanAddr = address.toLowerCase();
  let user = usersByAddress.get(cleanAddr);
  if (!user) {
    user = { id: 'usr_' + crypto.randomBytes(6).toString('hex'), address, cleanAddress: cleanAddr, username: null, usernameLocked: false, avatar: '', createdAt: Date.now(), lastLogin: Date.now() };
    usersByAddress.set(cleanAddr, user);
    saveUsersToDisk();
  }
  row.status = 'complete';
  row.address = address;
  row.user = { address: user.address, username: user.username, usernameLocked: !!user.usernameLocked, avatar: user.avatar || '', needsUsername: !user.usernameLocked };
  writeTickets(store);
  res.json({ success: true, user: row.user });
});

router.post('/username', (req, res) => {
  const address = String(req.body.address || '').toLowerCase();
  const username = String(req.body.username || '').trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
  if (!address || username.length < 3) return res.status(400).json({ success: false, error: 'Username must be 3-20 letters or numbers.' });
  const user = usersByAddress.get(address);
  if (!user) return res.status(404).json({ success: false, error: 'Connect first.' });
  if (user.usernameLocked) return res.status(409).json({ success: false, error: 'Username is permanent.' });
  if (usernameTaken(username, address)) return res.status(409).json({ success: false, error: 'Username taken.' });
  user.username = username;
  user.usernameLocked = true;
  saveUsersToDisk();
  res.json({ success: true, username });
});

router.post('/avatar', (req, res) => {
  const address = String(req.body.address || '').toLowerCase();
  const user = usersByAddress.get(address);
  if (!user) return res.status(404).json({ success: false, error: 'Connect first.' });
  user.avatar = String(req.body.avatar || '').slice(0, 400000);
  saveUsersToDisk();
  res.json({ success: true });
});

router.get('/profile/:address', (req, res) => {
  const user = usersByAddress.get(String(req.params.address).toLowerCase());
  if (!user) return res.json({ success: true, exists: false });
  res.json({ success: true, exists: true, username: user.username, usernameLocked: !!user.usernameLocked, avatar: user.avatar || '' });
});

router.get('/session', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '') || req.query.token;
  if (!token || !activeSessions.has(token)) return res.status(401).json({ success: false, authenticated: false });
  const user = activeSessions.get(token);
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

module.exports = router;
