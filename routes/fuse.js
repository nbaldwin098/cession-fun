const express = require('express');
const router = express.Router();
const fuse = require('../services/fuse');

router.get('/', (req, res) => {
  res.json({ success: true, fuse: fuse.overview() });
});

router.get('/:symbol', (req, res) => {
  const row = fuse.get(req.params.symbol);
  if (!row) return res.status(404).json({ success: false, error: 'Not a Fuse coin.' });
  res.json({ success: true, coin: row });
});

module.exports = router;
