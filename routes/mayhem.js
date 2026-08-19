const express = require('express');
const router = express.Router();
const mayhem = require('../services/mayhem');

router.get('/', (req, res) => {
  res.json(mayhem.status());
});

router.get('/coins', (req, res) => {
  res.json({ success: true, coins: [] });
});

router.post('/manual', (req, res) => {
  res.status(503).json({
    success: false,
    error: 'Mayhem agent does not trade until the program is live. Create flag is off.'
  });
});

module.exports = router;
