/**
 * Cession Corporate Treasury & Financial Tracking API
 */

const express = require('express');
const router = express.Router();
const treasuryService = require('../services/treasuryService');

/**
 * GET /api/treasury/public-reserves
 * Public Kraken-grade transparency & Proof of Reserves endpoint
 */
router.get('/public-reserves', (req, res) => {
  const reserves = treasuryService.getPublicProofOfReserves();
  res.json(reserves);
});

/**
 * GET /api/treasury/financial-report
 * Returns full real-time P&L, cost ledger, and treasury balances
 */
router.get('/financial-report', (req, res) => {
  const report = treasuryService.getFinancialReport();
  res.json({ success: true, report });
});

/**
 * GET /api/treasury/costs
 * Returns zero-SaaS cost tracking ledger
 */
router.get('/costs', (req, res) => {
  const report = treasuryService.getFinancialReport();
  res.json({
    success: true,
    costLedger: report.costTrackingLedger,
    reserves: report.reserves
  });
});

module.exports = router;
