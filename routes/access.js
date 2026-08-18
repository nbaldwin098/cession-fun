const express = require('express');
const router = express.Router();
const cache = new Map();
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

router.get('/perps', async (req, res) => {
  const country = await countryOf(req);
  const allowed = !BLOCKED.has(country);
  res.json({ success: true, allowed });
});

module.exports = router;
