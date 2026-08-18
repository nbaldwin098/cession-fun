# Cession (`cession.fun`) — Sovereign Web3 Fair Launchpad & Bonding Curve Protocol

Cession is a non-custodial, fair-launch coin factory and bonding curve exchange where users create and trade tokens directly from Phantom (Solana Mainnet) or MetaMask (Ethereum Mainnet) with on-chain smart contract verification.

---

## ⚡ How Cession Works

1. **Non-Custodial First**: Users connect Phantom or MetaMask. Cession **never** generates or stores 12-word seed phrases.
2. **Coin Factory (`create`)**: Creating a coin costs **0.50 SOL**, transferred directly to the protocol treasury during the on-chain Anchor instruction. Each creator is restricted to one active live coin at a time, and ticker symbols must be unique.
3. **Continuous Bonding Curve (`buy` / `sell`)**: Constant product AMM ($x \times y = k$).
   - **Trade Fee (1.00% Total in SOL)**:
     - `0.30%` -> Creator fee (accrued to `fee_vault` PDA)
     - `0.25%` -> Holder rewards (accrued to `fee_vault` PDA)
     - `0.15%` -> Referrer / Extra holder rewards
     - `0.30%` -> Protocol Treasury
   - **Token Burn**: `0.10%` of tokens out on every buy instruction are permanently burned on-chain.
4. **Rug-Proof Fee Claims (`claim`)**:
   - `claim_creator_fees` & `claim_holder_fees` pull accrued fee SOL **exclusively from `fee_vault` PDA**.
   - The bonding curve liquidity in `sol_vault` PDA **can NEVER be drained by claims**.

---

## 🧺 "Today's 5" Dynamic Bundles

"Today's 5" splits a single SOL purchase evenly across 5 eligible live Cession coins:
* **Eligibility Rules**:
  1. Has a real on-chain mint address.
  2. Bonding curve is active (not graduated).
  3. Recorded a trade within the last 48 hours.
  4. Creator holds less than 50% of supply (prevents creator farms).
* **Automatic Rotation**: As coins graduate, go inactive (no trades in 48h), or creator dumps, they drop out of the roster and the next eligible coin slides in automatically.

---

## ⚠️ Risk Disclosure

> *"Connect the wallet you already have. We list fewer coins. Price moves up on buys and down on sells. A cut of fees is paid in SOL to holders and creators. You can lose everything."*

---

## 🏗️ Solana Anchor Smart Contract & Deployment Command

* **Program ID**: `Epxb6TRhGwT1gQFj5xCLM6KtZUz9ajD7jZzkVrp3qBR9`
* **Program Source**: [`contracts/solana/programs/cession_bonding_curve/src/lib.rs`](file:///C:/Users/A6237/.gemini/antigravity/scratch/calabi-exchange/contracts/solana/programs/cession_bonding_curve/src/lib.rs)

### Founder CLI Deployment Command (For Founder)
```bash
cd contracts/solana
anchor build
solana program deploy target/deploy/cession_bonding_curve.so \
  --program-id target/deploy/cession_bonding_curve-keypair.json \
  --keypair ~/.config/solana/id.json \
  --url mainnet-beta
```

---

## ⚡ Quick Start (Local Development)

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

## 📋 Render.com Production Configuration

| Variable | Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Application Web Port |
| `NODE_ENV` | `production` | Production Environment Flag |
| `CESSION_PROGRAM_ID` | `Epxb6TRhGwT1gQFj5xCLM6KtZUz9ajD7jZzkVrp3qBR9` | Deployed Solana Anchor Program ID |
| `SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | Solana Mainnet RPC Endpoint |
| `TREASURY_SOL_ADDRESS` | `8cdpVXsrQQDf84H4KC9pfqEKxUV9ZJjZZbeueWmJCCvH` | Solana Protocol Fee Wallet |
| `TREASURY_EVM_ADDRESS` | `0xE409f28fb1D6C5C090b1feE164DB09C365c07011` | Ethereum Protocol Fee Wallet |
