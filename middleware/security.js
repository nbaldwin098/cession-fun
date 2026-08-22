function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "connect-src 'self' https: wss:",
      'upgrade-insecure-requests'
    ].join('; ')
  );
  next();
}

function requireJson(req, res, next) {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const ct = String(req.headers['content-type'] || '');
    if (ct && ct.indexOf('application/json') < 0 && ct.indexOf('urlencoded') < 0) {
      if (req.headers['content-length'] && Number(req.headers['content-length']) > 0) {
        return res.status(415).json({ ok: false, error: 'Unsupported content type' });
      }
    }
  }
  next();
}

function sanitizeWallet(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(s)) return s;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,48}$/.test(s)) return s;
  return '';
}

function noStore(req, res, next) {
  if (req.path.indexOf('/api/') === 0) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
}

module.exports = {
  securityHeaders,
  requireJson,
  sanitizeWallet,
  noStore
};
