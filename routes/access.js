const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const cache = new Map();
const hits = new Map();
const BLOCKED = new Set(['US', 'PR', 'GU', 'VI', 'AS', 'MP', 'UM']);

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || req.ip || '';
}

function headerCountry(req) {
  const c = String(
    req.headers['cf-ipcountry'] ||
    req.headers['x-vercel-ip-country'] ||
    req.headers['x-country-code'] ||
    ''
  ).toUpperCase();
  return c.length === 2 ? c : '';
}

async function lookupCountry(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return '';
  const hit = cache.get(ip);
  if (hit && Date.now() - hit.t < 6 * 36e5) return hit.c;
  try {
    const r = await fetch('https://ipapi.co/' + encodeURIComponent(ip) + '/country/', {
      headers: { 'User-Agent': 'cession.fun' }
    });
    const c = String(await r.text()).trim().toUpperCase();
    const code = c.length === 2 ? c : '';
    cache.set(ip, { c: code, t: Date.now() });
    return code;
  } catch (e) {
    return '';
  }
}

async function countryOf(req) {
  return headerCountry(req) || (await lookupCountry(clientIp(req)));
}

function limited(ip) {
  const now = Date.now();
  const row = hits.get(ip) || [];
  const keep = row.filter((t) => now - t < 10 * 60 * 1000);
  if (keep.length >= 8) {
    hits.set(ip, keep);
    return true;
  }
  keep.push(now);
  hits.set(ip, keep);
  return false;
}

function secret() {
  return String(process.env.ACCESS_CODE || '').trim();
}

function token() {
  const s = secret() || 'cession-gate';
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const body = String(exp);
  const sig = crypto.createHmac('sha256', s).update(body).digest('hex');
  return body + '.' + sig;
}

function validToken(val) {
  const s = secret();
  if (!s || !val) return false;
  const parts = String(val).split('.');
  if (parts.length !== 2) return false;
  const exp = Number(parts[0]);
  if (!exp || Date.now() > exp) return false;
  const sig = crypto.createHmac('sha256', s).update(parts[0]).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(parts[1]));
  } catch (e) {
    return false;
  }
}

function cookieOf(req) {
  const raw = String(req.headers.cookie || '');
  const m = raw.match(/(?:^|;\s*)cession_gate=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

router.get('/perps', async (req, res) => {
  const country = await countryOf(req);
  const allowed = !BLOCKED.has(country);
  res.json({ success: true, allowed });
});

router.get('/gate', (req, res) => {
  res.json({ success: true, open: validToken(cookieOf(req)) });
});

router.post('/unlock', (req, res) => {
  const ip = clientIp(req);
  if (limited(ip)) return res.status(429).json({ success: false, error: 'Wait and try again.' });
  const want = secret();
  const got = String((req.body && req.body.code) || '').trim();
  if (!want) return res.status(503).json({ success: false, error: 'Gate is not set.' });
  const a = Buffer.from(want);
  const b = Buffer.from(got);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ success: false, error: 'Wrong code.' });
  }
  const t = token();
  res.setHeader('Set-Cookie', 'cession_gate=' + encodeURIComponent(t) + '; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict');
  res.json({ success: true });
});

router.validToken = validToken;
router.cookieOf = cookieOf;
module.exports = router;
