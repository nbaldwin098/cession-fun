require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const apiRoutes = require('./routes/api');
const priceEngine = require('./services/priceEngine');
const { rateLimit } = require('./middleware/rateLimit');
require('./services/store').init();

const app = express();
const server = http.createServer(app);
const ALLOW = (process.env.CORS_ORIGIN || 'https://cession.fun,https://www.cession.fun,https://cession.us,https://www.cession.us').split(',');

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOW.indexOf(origin) >= 0) return cb(null, true);
    cb(null, false);
  },
  credentials: true
}));
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use('/api/pulse', rateLimit(60, 60000));
app.use('/api/ask', rateLimit(30, 60000));
app.use('/api/support', rateLimit(20, 60000));
app.use('/api/pay', rateLimit(40, 60000));
app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html', 'htm'] }));

['/', '/explore', '/rewards', '/wallet', '/you', '/foryou', '/legal', '/mayhem', '/r/:code'].forEach((route) => {
  app.get(route, (req, res) => {
    if (route === '/legal') return res.sendFile(path.join(__dirname, 'public', 'legal.html'));
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const wss = new WebSocket.Server({ server, path: '/ws' });
wss.on('connection', (ws) => {
  priceEngine.addClient(ws);
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.action === 'SUBSCRIBE' && data.symbol) {
        ws.send(JSON.stringify({ type: 'CANDLE_HISTORY', symbol: data.symbol, candles: priceEngine.getCandles(data.symbol) }));
      }
    } catch (err) {}
  });
  ws.on('close', () => priceEngine.removeClient(ws));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('cession on', PORT);
});
