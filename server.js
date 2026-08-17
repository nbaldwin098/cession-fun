/**
 * cession.fun — Sovereign Digital Asset Exchange & Fair-Launch Platform
 * Main Server Entrypoint (Express + WebSockets)
 * Clean URLs without .html extensions
 */

require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');

const apiRoutes = require('./routes/api');
const priceEngine = require('./services/priceEngine');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets with automatic clean extension resolution
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html', 'htm']
}));

// API Routes
app.use('/api', apiRoutes);

// Explicit Clean URL Page Routes (No .html needed)
const cleanRoutes = [
  '/',
  '/launchpad',
  '/board',
  '/exchange',
  '/swap',
  '/trade',
  '/bundles',
  '/bundles/:id',
  '/staking',
  '/transparency',
  '/treasury',
  '/leaderboard',
  '/rankings',
  '/profile',
  '/terms',
  '/privacy',
  '/coin/:symbol',
  '/token/:symbol'
];

cleanRoutes.forEach(route => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
});

// Fallback to index.html for all other SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Setup WebSocket Server
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
  priceEngine.addClient(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.action === 'SUBSCRIBE' && data.symbol) {
        // Send initial candle snapshot for subscribed symbol
        const candles = priceEngine.getCandles(data.symbol);
        ws.send(JSON.stringify({ type: 'CANDLE_HISTORY', symbol: data.symbol, candles }));
      }
    } catch (err) {
      // Ignore malformed client payload
    }
  });

  ws.on('close', () => {
    priceEngine.removeClient(ws);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 CESSION.FUN SOVEREIGN EXCHANGE & FAIR LAUNCHPAD ONLINE`);
  console.log(`🌐 Clean Gateway (No .html): http://localhost:${PORT}`);
  console.log(`⚡ WebSocket Stream: ws://localhost:${PORT}/ws`);
  console.log(`💼 Proof-of-Skin Anti-Rug Engine & Transparent Reserves Ready`);
  console.log(`=======================================================`);
});
