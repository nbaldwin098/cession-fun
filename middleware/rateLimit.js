const buckets = new Map();

function rateLimit(max, windowMs) {
  return function (req, res, next) {
    const key = (req.ip || 'x') + ':' + req.path;
    const now = Date.now();
    const row = buckets.get(key) || { n: 0, t: now };
    if (now - row.t > windowMs) {
      row.n = 0;
      row.t = now;
    }
    row.n += 1;
    buckets.set(key, row);
    if (row.n > max) {
      return res.status(429).json({ success: false, error: 'slow down' });
    }
    next();
  };
}

module.exports = { rateLimit };
