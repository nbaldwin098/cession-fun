const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'data');
let pool = null;

async function init() {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  try {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
    await pool.query('CREATE TABLE IF NOT EXISTS cession_kv (k TEXT PRIMARY KEY, v JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW())');
    return true;
  } catch (e) {
    console.warn('Postgres off, using files:', e.message);
    pool = null;
    return false;
  }
}

function fileFor(key) {
  return path.join(DIR, key.replace(/[^a-z0-9_-]/gi, '_') + '.json');
}

async function get(key, fallback) {
  if (pool) {
    const r = await pool.query('SELECT v FROM cession_kv WHERE k = $1', [key]);
    return r.rows[0] ? r.rows[0].v : fallback;
  }
  try { return JSON.parse(fs.readFileSync(fileFor(key), 'utf8')); }
  catch { return fallback; }
}

async function set(key, value) {
  if (pool) {
    await pool.query(
      'INSERT INTO cession_kv (k, v) VALUES ($1, $2) ON CONFLICT (k) DO UPDATE SET v = $2, updated_at = NOW()',
      [key, value]
    );
    return;
  }
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(fileFor(key), JSON.stringify(value, null, 2));
}

function getSync(key, fallback) {
  try { return JSON.parse(fs.readFileSync(fileFor(key), 'utf8')); }
  catch { return fallback; }
}
function setSync(key, value) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(fileFor(key), JSON.stringify(value, null, 2));
}

init();

module.exports = { init, get, set, getSync, setSync, usingPostgres: () => !!pool };
