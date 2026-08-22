/**
 * On-chain balance reads only. Never invents money.
 */
const express = require('express');
const router = express.Router();

const SOL_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const ETH_RPC = process.env.ETH_RPC_URL || 'https://cloudflare-eth.com';

function isSol(addr) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,48}$/.test(String(addr || ''));
}
function isEvm(addr) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(addr || ''));
}

async function solBalance(address) {
  const r = await fetch(SOL_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address]
    })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || 'sol rpc error');
  const lamports = (d.result && d.result.value) || 0;
  return {
    chain: 'solana',
    symbol: 'SOL',
    raw: lamports,
    amount: lamports / 1e9,
    source: 'solana_rpc'
  };
}

async function ethBalance(address) {
  const r = await fetch(ETH_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBalance',
      params: [address, 'latest']
    })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || 'eth rpc error');
  const wei = BigInt(d.result || '0x0');
  const eth = Number(wei) / 1e18;
  return {
    chain: 'ethereum',
    symbol: 'ETH',
    raw: d.result,
    amount: eth,
    source: 'eth_rpc'
  };
}

router.get('/:address/balances', async (req, res) => {
  try {
    const address = String(req.params.address || '').trim();
    if (!address) return res.status(400).json({ ok: false, error: 'address required' });

    const balances = [];
    if (isSol(address)) {
      balances.push(await solBalance(address));
    } else if (isEvm(address)) {
      balances.push(await ethBalance(address));
    } else {
      return res.status(400).json({ ok: false, error: 'Unrecognized address format' });
    }

    res.json({
      ok: true,
      address,
      balances,
      note: 'Balances are read on-chain from the user wallet. Cession does not custody or invent balances.'
    });
  } catch (e) {
    res.status(502).json({
      ok: false,
      error: e.message || 'balance read failed',
      balances: [],
      note: 'Could not read chain. Showing nothing rather than inventing funds.'
    });
  }
});

module.exports = router;
