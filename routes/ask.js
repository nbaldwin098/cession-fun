const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const ask = require('../services/askService');
const CHAT = path.join(__dirname, '..', 'data', 'global_chat.json');

function readChat() {
  try { return JSON.parse(fs.readFileSync(CHAT, 'utf8')); }
  catch { return { messages: [] }; }
}
function writeChat(store) {
  fs.mkdirSync(path.dirname(CHAT), { recursive: true });
  fs.writeFileSync(CHAT, JSON.stringify(store, null, 2));
}

router.get('/banner', (req, res) => {
  res.json({ success: true, question: ask.bannerQuestion() });
});

router.post('/', async (req, res) => {
  try {
    const message = String(req.body.message || '').slice(0, 500);
    const address = req.body.address || null;
    if (!message) return res.status(400).json({ success: false, error: 'Message required' });
    const ctx = ask.siteContext(address);
    const reply = await ask.modelAnswer(message, ctx);
    res.json({ success: true, reply, hasModel: !!(process.env.XAI_API_KEY || process.env.GROK_API_KEY || process.env.OPENAI_API_KEY) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/bots', (req, res) => {
  const ctx = ask.siteContext(req.query.address);
  res.json({ success: true, bots: ctx.bots });
});

router.post('/bots', (req, res) => {
  const bot = ask.saveBot(req.body.address, {
    symbol: req.body.symbol,
    buySol: req.body.buySol,
    slippage: req.body.slippage,
    type: req.body.type || 'dca',
    interval: req.body.interval || '1h'
  });
  res.json({ success: true, bot, notice: 'Rule saved. It will not place trades until the program is live.' });
});

router.get('/chat', (req, res) => {
  const store = readChat();
  res.json({ success: true, messages: (store.messages || []).slice(-100) });
});

router.post('/chat', (req, res) => {
  const text = String(req.body.text || '').trim().slice(0, 280);
  if (!text) return res.status(400).json({ success: false, error: 'Message required' });
  const store = readChat();
  const msg = {
    id: 'm' + Date.now(),
    address: req.body.address || null,
    username: String(req.body.username || 'anon').slice(0, 24),
    pnl: req.body.pnl || '0',
    text,
    at: new Date().toISOString()
  };
  store.messages = (store.messages || []).concat(msg).slice(-200);
  writeChat(store);
  res.json({ success: true, message: msg });
});

router.get('/rewards/:address', (req, res) => {
  res.json({
    success: true,
    address: req.params.address,
    status: 'Not live yet',
    accruedSol: 0,
    rule: 'Holder share is 0.25 percent of trade fees, paid after real protocol volume. No fake SOL.'
  });
});

module.exports = router;
