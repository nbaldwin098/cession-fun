/**
 * Quick production smoke: health + key routes.
 * Usage: node test/smoke-production.js [baseUrl]
 */
const base = process.argv[2] || process.env.SMOKE_BASE || 'http://127.0.0.1:3057';

async function check(path, expectOk = true) {
  const url = base.replace(/\/$/, '') + path;
  try {
    const r = await fetch(url);
    const text = await r.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 120); }
    const ok = expectOk ? r.status < 500 : true;
    console.log(ok ? 'OK ' : 'FAIL', r.status, path, typeof body === 'object' ? JSON.stringify(body).slice(0, 100) : body);
    return ok;
  } catch (e) {
    console.log('FAIL', path, e.message);
    return false;
  }
}

(async () => {
  let pass = true;
  pass = (await check('/health')) && pass;
  pass = (await check('/api/health')) && pass;
  pass = (await check('/api/access/perps')) && pass;
  pass = (await check('/api/baas/summary?wallet=11111111111111111111111111111111')) && pass;
  pass = (await check('/')) && pass;
  pass = (await check('/legal', true)) && pass;
  console.log(pass ? 'SMOKE_PASS' : 'SMOKE_FAIL');
  process.exit(pass ? 0 : 1);
})();
