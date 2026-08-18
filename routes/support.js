const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();
const FILE = path.join(__dirname, '..', 'data', 'support_tickets.json');
const AUDIT = path.join(__dirname, '..', 'data', 'desk_audit.json');

function load(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function save(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function audit(entry) {
  const log = load(AUDIT, []);
  log.push(Object.assign({ t: new Date().toISOString() }, entry));
  save(AUDIT, log.slice(-2000));
}
function deskAuth(req, res, next) {
  const token = process.env.CESSION_DESK_TOKEN || '';
  const given = String(req.headers['x-cession-desk'] || req.query.token || '');
  if (!token || given.length < 16 || !crypto.timingSafeEqual(Buffer.from(token.padEnd(64)), Buffer.from(given.padEnd(64)))) {
    audit({ action: 'deny', ip: req.ip });
    return res.status(401).json({ success: false, error: 'desk locked' });
  }
  next();
}

router.post('/ticket', (req, res) => {
  const wallet = String(req.body.wallet || '').slice(0, 88);
  const message = String(req.body.message || '').slice(0, 2000);
  if (!message) return res.status(400).json({ success: false, error: 'message required' });
  const tickets = load(FILE, []);
  const ticket = {
    id: crypto.randomBytes(8).toString('hex'),
    wallet,
    message,
    status: 'open',
    createdAt: new Date().toISOString()
  };
  tickets.push(ticket);
  save(FILE, tickets);
  audit({ action: 'ticket_open', id: ticket.id });
  res.json({ success: true, id: ticket.id });
});

router.get('/mine', (req, res) => {
  const wallet = String(req.query.wallet || '');
  const tickets = load(FILE, []).filter((t) => t.wallet && t.wallet === wallet);
  res.json({ success: true, tickets });
});

router.get('/desk/tickets', deskAuth, (req, res) => {
  audit({ action: 'list_tickets' });
  res.json({ success: true, tickets: load(FILE, []) });
});

router.post('/desk/tickets/:id', deskAuth, (req, res) => {
  const tickets = load(FILE, []);
  const t = tickets.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ success: false });
  t.status = String(req.body.status || t.status).slice(0, 24);
  t.note = String(req.body.note || '').slice(0, 1000);
  save(FILE, tickets);
  audit({ action: 'ticket_update', id: t.id, status: t.status });
  res.json({ success: true, ticket: t });
});

module.exports = { router, deskAuth, audit, load, FILE };
