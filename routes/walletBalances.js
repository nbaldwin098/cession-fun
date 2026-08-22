/**
 * On-chain balance reads only. Never invents money.
 * SOL + SPL token accounts via public Solana RPC; EVM via public JSON-RPC.
 */
const express = require('express');
const router = express.Router();

const SOL_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const ETH_RPC = process.env.ETH_RPC_URL || 'https://cloudflare-eth.com';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

function isSol(addr) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,48}$/.test(String(addr || ''));
}
function isEvm(addr) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(addr || ''));
}

async function rpc(url, method, params) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || method + ' failed');
  return d.result;
}

async function solBalance(address) {
  const result = await rpc(SOL_RPC, 'getBalance', [address]);
  const lamports = (result && result.value) || 0;
  return {
    chain: 'solana',
    symbol: 'SOL',
    mint: 'So11111111111111111111111111111111111111112',
    raw: lamports,
    amount: lamports / 1e9,
    decimals: 9,
    source: 'solana_rpc'
  };
}

async function solTokenAccounts(address) {
  const result = await rpc(SOL_RPC, 'getTokenAccountsByOwner', [
    address,
    { programId: TOKEN_PROGRAM },
    { encoding: 'jsonParsed' }
  ]);
  const value = (result && result.value) || [];
  const out = [];
  for (const row of value) {
    try {
      const info = row.account && row.account.data && row.account.data.parsed && row.account.data.parsed.info;
      if (!info) continue;
      const ta = info.tokenAmount || {};
      const amount = Number(ta.uiAmount) || 0;
      if (amount <= 0) continue;
      const mint = info.mint || '';
      out.push({
        chain: 'solana',
        symbol: mint.slice(0, 4) + '\u2026',
        mint,
        raw: ta.amount,
        amount,
        decimals: Number(ta.decimals) || 0,
        source: 'solana_token_account',
        tokenAccount: row.pubkey
      });
    } catch (e) {
      /* skip bad account */
    }
  }
  return out;
}

async function ethBalance(address) {
  const result = await rpc(ETH_RPC, 'eth_getBalance', [address, 'latest']);
  const wei = BigInt(result || '0x0');
  const eth = Number(wei) / 1e18;
  return {
    chain: 'ethereum',
    symbol: 'ETH',
    mint: '',
    raw: result,
    amount: eth,
    decimals: 18,
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
      try {
        const tokens = await solTokenAccounts(address);
        balances.push(...tokens);
      } catch (e) {
        /* native still returned */
      }
    } else if (isEvm(address)) {
      balances.push(await ethBalance(address));
    } else {
      return res.status(400).json({ ok: false, error: 'Unrecognized address format' });
    }

    res.json({
      ok: true,
      address,
      balances,
      note: 'On-chain reads only. Cession does not custody funds.'
    });
  } catch (e) {
    res.status(502).json({
      ok: false,
      error: e.message || 'balance read failed',
      balances: [],
      note: 'Could not read chain.'
    });
  }
});

module.exports = router;
