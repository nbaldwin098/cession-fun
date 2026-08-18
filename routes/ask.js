const express = require('express');
const router = express.Router();
const ask = require('../services/askService');

router.get('/banner', (req, res) => {
  res.json({ success: true, question: ask.bannerQuestion() });
});

router.post('/', async (req, res) => {
  try {
    const message = String(req.body.message || '').slice(0, 500);
    const address = req.body.address || null;
    if (!message) return res.status(400).json({ success: false, error: 'Message required' });
    const ctx = ask.siteContext(address);
    if (/make (a )?bot|create (a )?bot/i.test(message)) {
      const symbol = (message.match(/\b[A-Z]{2,10}\b/) || [])[0] || req.body.symbol;
      const bot = ask.saveBot(address, { symbol, buySol: req.body.buySol, slippage: req.body.slippage });
      return res.json({ success: true, reply: 'Saved bot ' + bot.id + ' for ' + (bot.symbol || 'no ticker') + '. Not live until the program is deployed.', bot });
    }
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
  const bot = ask.saveBot(req.body.address, req.body);
  res.json({ success: true, bot });
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
