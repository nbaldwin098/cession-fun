# Cession

Non-custodial crypto app. Your wallet. Real prices. Fair launches.

**Live:** [cession.fun](https://cession.fun)

## What it is
- **Exchange** — spot markets, live prices (Binance feed)
- **Wallet** — connect Phantom, MetaMask, or Trust. We never hold keys
- **Xchange** — fair-launch bonding curve coins + optional Fuse agent
- **Banking** — partner rails when live (we don't take deposits)
- **Copilot** — product help, not financial advice

## What it is not
- Not a custodian
- Not a bank
- Not inventing balances — chain/API or $0
- Leverage / exposure tools are not for US users

## Stack
Node + Express on Render. Postgres when configured. Solana mainnet for launches.

## Fees (when trading is live)
See in-app. Protocol treasury: `9MeQ5XiESSZPUVNzqKQjB9JYEWZScH1shwsbQMfYUTRU`

## Run locally
```bash
npm install
cp .env.example .env
npm start
```

## Status
Invite / early access. Banking and full partner buy/sell wire-up still in progress.
