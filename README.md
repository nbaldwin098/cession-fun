# Cession

Non-custodial Solana fair-launch. We do not hold keys.

## Fees (locked)

- Create: **0.05 SOL** plus rent.
- On the curve (under $500k): **1.00%** = creator 0.50% / holders 0.25% / protocol 0.25%.
- After $500k on Cession: **0.40%** = 0.10 / 0.10 / 0.20.
- Later pool: **0.20%** protocol. Not live.
- Claims come only from `fee_vault`. `sol_vault` is liquidity only.

## Deploy

Do not mainnet-deploy until treasury is a real Phantom address and a create/buy/sell works on devnet.

Program id (if the keypair still exists):
`Epxb6TRhGwT1gQFj5xCLM6KtZUz9ajD7jZzkVrp3qBR9`

## Env

- ACCESS_CODE
- XAI_API_KEY
- TREASURY_SOL_ADDRESS (real wallet)
- SOLANA_RPC_URL
- CESSION_PROGRAM_ID
