/**
 * Cession Sovereign Authentication & Non-Custodial Session Router
 * 
 * STRICT NON-CUSTODIAL IDENTITY DIRECTIVE:
 * 1. Your wallet is your door. Cession NEVER creates, stores, or returns seed phrases/mnemonics.
 * 2. Connect requests MUST be cryptographically signed (tweetnacl on Solana, SIWE/ethers on EVM).
 * 3. Accounts & sessions persist to disk (data/users.json) so server restarts never erase user profiles.
 */

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

// In-memory store backed by data/users.json
const usersByAddress = new Map();
const activeSessions = new Map();

function loadUsersFromDisk() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(u => {
          if (u.address) usersByAddress.set(u.address.toLowerCase(), u);
        });
      }
    }
  } catch (e) {
    console.warn('[Auth] Error loading users.json:', e.message);
  }
}

function saveUsersToDisk() {
  try {
    const list = Array.from(usersByAddress.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('[Auth] Error saving users.json:', e.message);
  }
}

// Initial load
loadUsersFromDisk();

/**
 * Verify Solana Detached Ed25519 Signature via TweetNaCl
 */
function verifySolanaSignature(address, message, signatureHexOrBase58) {
  try {
    const messageBytes = new TextEncoder().encode(message);
    let signatureBytes;
    
    // Attempt hex or base58 decode
    if (/^[0-9a-fA-F]+$/.test(signatureHexOrBase58)) {
      signatureBytes = Buffer.from(signatureHexOrBase58, 'hex');
    } else {
      signatureBytes = bs58.decode(signatureHexOrBase58);
    }
    
    const publicKeyBytes = bs58.decode(address);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (err) {
    console.warn('[Auth] Solana signature verification failed:', err.message);
    return false;
  }
}

/**
 * Verify Ethereum Signature via Ethers.js (SIWE / Personal Sign)
 */
function verifyEthereumSignature(address, message, signatureHex) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signatureHex);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (err) {
    console.warn('[Auth] Ethereum signature verification failed:', err.message);
    return false;
  }
}

/**
 * Non-Custodial Cryptographically Signed Wallet Login
 */
router.post('/wallet-login', (req, res) => {
  try {
    const { address, chain = 'Solana', walletType = 'phantom', message, signature } = req.body;
    
    if (!address) {
      return res.status(400).json({ success: false, error: 'Wallet address is required.' });
    }

    if (!message || !signature) {
      return res.status(401).json({
        success: false,
        error: 'Cryptographic signature required. Please approve the login request in your wallet.'
      });
    }

    // OFAC Sanctions Screening
    const screen = ofacChecker.screenAddress(address);
    if (!screen.allowed) {
      return res.status(403).json({ success: false, error: screen.detail || 'Sanctioned entity blocked.' });
    }

    // Verify cryptographic signature
    let isValidSignature = false;
    if (chain.toLowerCase() === 'solana' || walletType.toLowerCase() === 'phantom' || walletType.toLowerCase() === 'solflare') {
      isValidSignature = verifySolanaSignature(address, message, signature);
    } else {
      isValidSignature = verifyEthereumSignature(address, message, signature);
    }

    if (!isValidSignature) {
      return res.status(401).json({
        success: false,
        error: '❌ Invalid wallet signature. Signature verification failed.'
      });
    }

    const cleanAddr = address.toLowerCase();
    let user = usersByAddress.get(cleanAddr);

    if (!user) {
      user = {
        id: 'usr_' + crypto.randomBytes(6).toString('hex'),
        address,
        cleanAddress: cleanAddr,
        chain,
        walletType,
        username: `${walletType.toUpperCase()}_${address.substring(0, 4)}...${address.substring(address.length - 4)}`,
        createdAt: Date.now(),
        lastLogin: Date.now(),
        badge: chain.toLowerCase() === 'solana' ? 'SOLANA NATIVE' : 'ETHEREUM NATIVE'
      };
      usersByAddress.set(cleanAddr, user);
      saveUsersToDisk();
    } else {
      user.lastLogin = Date.now();
      saveUsersToDisk();
    }

    const token = 'sess_' + crypto.randomBytes(24).toString('hex');
    activeSessions.set(token, user);

    res.json({
      success: true,
      message: `✓ Cryptographically authenticated via ${walletType.toUpperCase()}`,
      token,
      user: {
        id: user.id,
        address: user.address,
        chain: user.chain,
        walletType: user.walletType,
        username: user.username,
        badge: user.badge
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Check Active Non-Custodial Session
 */
router.get('/session', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : req.query.token;
  
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ success: false, authenticated: false });
  }
  
  const user = activeSessions.get(token);
  res.json({
    success: true,
    authenticated: true,
    user: {
      id: user.id,
      address: user.address,
      chain: user.chain,
      walletType: user.walletType,
      username: user.username,
      badge: user.badge
    }
  });
});

/**
 * Logout Session
 */
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : req.body.token;
  if (token) activeSessions.delete(token);
  res.json({ success: true, message: 'Session terminated.' });
});

/**
 * Explicitly Disabled Deprecated Custodial Endpoints
 */
router.post(['/register', '/login', '/google'], (req, res) => {
  res.status(410).json({
    success: false,
    error: 'Custodial accounts & email logins have been permanently retired. Cession is 100% non-custodial: connect directly using your Phantom or MetaMask wallet.'
  });
});

module.exports = router;
