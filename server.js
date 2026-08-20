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
const ALLOW = (process.env.CORS_ORIGIN || 'https://cession.us,https://www.cession.us,https://cession.fun,https://www.cession.fun').split(',');

// Trust exactly one reverse-proxy hop (the host platform's edge/LB). This makes
// req.ip / req.headers['x-forwarded-for'] reflect only the value that platform actually
// set, so it can no longer be spoofed by a client to bypass IP-keyed rate limits or
// IP-based geo/compliance checks. Configurable in case the real deployment sits behind
// more than one hop.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

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
app.use(['/api/tokens/create', '/api/tokens/deploy', '/api/tokens/launch'], rateLimit(6, 60000));
app.use(/^\/api\/tokens\/[^/]+\/(buy|sell|stake)$/, rateLimit(30, 60000));
app.use(['/api/tokens/collections/create', '/api/tokens/bundles/create'], rateLimit(6, 60000));
app.use(/^\/api\/tokens\/(collections|bundles)\/[^/]+\/buy$/, rateLimit(20, 60000));
app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html', 'htm'] }));

['/', '/explore', '/rewards', '/wallet', '/you', '/foryou', '/legal', '/fuse', '/r/:code'].forEach((route) => {
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

const PORT = process.env.PORT || 3057;
server.listen(PORT, '0.0.0.0', () => {
  console.log('cession.us on', PORT);
});
