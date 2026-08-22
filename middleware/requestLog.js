/**
 * Lightweight structured request log for Render / ops.
 */
function requestLog(req, res, next) {
  const start = Date.now();
  res.on('finish', function () {
    if (req.path === '/health' || req.path === '/api/health') return;
    const ms = Date.now() - start;
    const line = JSON.stringify({
      t: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms,
      ip: req.ip
    });
    if (res.statusCode >= 500) console.error('[http]', line);
    else if (res.statusCode >= 400) console.warn('[http]', line);
    else if (process.env.LOG_HTTP === '1') console.log('[http]', line);
  });
  next();
}

module.exports = { requestLog };
