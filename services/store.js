/**
 * Persistence: Postgres when DATABASE_URL is set, local JSON files otherwise.
 * Render Postgres: auto-relax cert checks for *.render.com hosts.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data');
let pool = null;
let initPromise = null;
let lastError = null;

function isRenderHost(url) {
  try {
    const u = new URL(url);
    return /render\.com$/i.test(u.hostname) || /^dpg-/i.test(u.hostname);
  } catch {
    return false;
  }
}

function buildSsl(url) {
  const flag = String(process.env.DATABASE_SSL_INSECURE || '').trim();
  if (flag === 'true') return { rejectUnauthorized: false };
  if (process.env.DATABASE_CA_CERT) {
    return { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT };
  }
  // Render managed Postgres almost always needs relaxed cert verification
  if (isRenderHost(url)) return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

async function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const url = String(process.env.DATABASE_URL || '').trim();
    if (!url) {
      console.log('[store] No DATABASE_URL — using local data/*.json files');
      pool = null;
      return false;
    }
    try {
      const { Pool } = require('pg');
      const ssl = buildSsl(url);
      pool = new Pool({
        connectionString: url,
        ssl,
        max: Number(process.env.DATABASE_POOL_MAX || 5),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });
      await pool.query(`
        CREATE TABLE IF NOT EXISTS cession_kv (
          k TEXT PRIMARY KEY,
          v JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      lastError = null;
      console.log('[store] Postgres connected (cession_kv ready)');
      return true;
    } catch (e) {
      lastError = e.message || String(e);
      console.warn('[store] Postgres off, using files:', lastError);
      if (pool) {
        try { await pool.end(); } catch (_) {}
      }
      pool = null;
      return false;
    }
  })();
  return initPromise;
}

function fileFor(key) {
  return path.join(DIR, String(key).replace(/[^a-z0-9_-]/gi, '_') + '.json');
}

async function get(key, fallback) {
  await init();
  if (pool) {
    try {
      const r = await pool.query('SELECT v FROM cession_kv WHERE k = $1', [key]);
      return r.rows[0] ? r.rows[0].v : fallback;
    } catch (e) {
      console.warn('[store] get failed, fallback file:', e.message);
    }
  }
  try {
    return JSON.parse(fs.readFileSync(fileFor(key), 'utf8'));
  } catch {
    return fallback;
  }
}

async function set(key, value) {
  await init();
  if (pool) {
    try {
      const payload = typeof value === 'string' ? value : JSON.stringify(value);
      await pool.query(
        `INSERT INTO cession_kv (k, v) VALUES ($1, $2::jsonb)
         ON CONFLICT (k) DO UPDATE SET v = $2::jsonb, updated_at = NOW()`,
        [key, payload]
      );
      return;
    } catch (e) {
      console.warn('[store] set failed, writing file:', e.message);
    }
  }
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(fileFor(key), JSON.stringify(value, null, 2));
}

function getSync(key, fallback) {
  try {
    return JSON.parse(fs.readFileSync(fileFor(key), 'utf8'));
  } catch {
    return fallback;
  }
}

function setSync(key, value) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(fileFor(key), JSON.stringify(value, null, 2));
}

function status() {
  return {
    postgres: !!pool,
    lastError,
    hasDatabaseUrl: Boolean(String(process.env.DATABASE_URL || '').trim())
  };
}

init().catch(() => {});

module.exports = {
  init,
  get,
  set,
  getSync,
  setSync,
  usingPostgres: () => !!pool,
  status
};
