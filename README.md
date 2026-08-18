# Cession (`cession.fun`) — Sovereign Web3 Fair Launchpad & Bonding Curve Protocol

Cession is a non-custodial, fair-launch coin factory and bonding curve exchange where users create and trade tokens directly from Phantom (Solana Mainnet) or MetaMask (Ethereum Mainnet) with on-chain verification.

---

## ⚡ Quick Start for Founder (Local Development)

```bash
# 1. Clone & Install Dependencies
git clone https://github.com/nbaldwin098/cession-fun.git
cd cession-fun
npm install

# 2. Set Up Environment File
cp .env.example .env

# 3. Run Automated Tests
npm test

# 4. Launch Local Development Server
npm run dev
# App will run at: http://localhost:3000
```

---

## 🔒 Security & Non-Custodial Directives

1. **Zero Server Seeds**: Cession **never** generates, stores, or requests 12-word seed phrases or private keys. All identity management is handled client-side by user wallets.
2. **Cryptographic Authentication**: Logging in requires signing a cryptographic message challenge (`nacl.sign` on Solana, SIWE / `personal_sign` on EVM). Unsigned connect requests are strictly rejected.
3. **Card Purchases Disabled**: Stripe credit card onramping is permanently disabled (`/api/stripe/config` returns `{ enabled: false }`). Users bring their own crypto.
4. **Persistent Account Storage**: Verified user profiles and bonding curve transactions persist to `data/users.json` and `data/bonding_state.json` so server reboots on Render never erase user records.

---

## 📊 Fee Math & Economics

Every trade on Cession incurs a total **1.0% protocol fee**:
* **0.5% Protocol Treasury**: Directly sent to `TREASURY_SOL_ADDRESS` / `TREASURY_EVM_ADDRESS`.
* **0.5% LP Reservation**: Reserved for DEX liquidity migration when the bonding curve target is reached.

---

## 🚀 Honest Graduation Policy

* **Target Cap**: $25,000 (~85 SOL).
* When a curve reaches 85 SOL raised, trading freezes and the UI states:
  > *"Bonding curve target reached (85 SOL raised). Raydium DEX liquidity pool migration pending."*
* Cession **never** displays fake "Graduated" badges without a verified live DEX pool.

---

## 📋 Founder Production Configuration (Render.com Environment)

In your [Render.com Dashboard](https://dashboard.render.com) -> `cession-fun` -> **Environment**, set:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Application Web Port |
| `NODE_ENV` | `production` | Production Environment Flag |
| `SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | Solana Mainnet RPC Endpoint |
| `TREASURY_SOL_ADDRESS` | `8cdpVXsrQQDf84H4KC9pfqEKxUV9ZJjZZbeueWmJCCvH` | Solana Protocol Fee Wallet |
| `TREASURY_EVM_ADDRESS` | `0xE409f28fb1D6C5C090b1feE164DB09C365c07011` | Ethereum Protocol Fee Wallet |

---

## 🔍 Verification & Explorer Links

* **Solana Trades**: Verified on [Solscan](https://solscan.io) (`https://solscan.io/tx/${sig}`).
* **Ethereum Trades**: Verified on [Etherscan](https://etherscan.io) (`https://etherscan.io/tx/${hash}`).
