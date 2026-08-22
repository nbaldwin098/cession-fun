const express = require('express');
const router = express.Router();

/** Public, non-secret client config */
router.get('/public', (req, res) => {
  res.json({
    ok: true,
    walletConnectProjectId: String(process.env.WALLETCONNECT_PROJECT_ID || '').trim()
  });
});

module.exports = router;
