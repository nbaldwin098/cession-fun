use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer};

declare_id!("Epxb6TRhGwT1gQFj5xCLM6KtZUz9ajD7jZzkVrp3qBR9");

// Protocol treasury: must match services/treasuryService.js and public/js/trading.js.
// Pinned on-chain so no signer can redirect the protocol fee to an arbitrary wallet.
pub const TREASURY_PUBKEY: Pubkey = pubkey!("9MeQ5XiESSZPUVNzqKQjB9JYEWZScH1shwsbQMfYUTRU");

const CREATE_FEE: u64 = 50_000_000;
const CREATOR_BPS: u64 = 50;
const HOLDER_BPS: u64 = 25;
const PROTOCOL_BPS: u64 = 25;

fn split_fee(amount: u64) -> (u64, u64, u64) {
    (
        amount * CREATOR_BPS / 10_000,
        amount * HOLDER_BPS / 10_000,
        amount * PROTOCOL_BPS / 10_000,
    )
}

fn open_pda<'info>(
    payer: AccountInfo<'info>,
    vault: AccountInfo<'info>,
    system: AccountInfo<'info>,
    seeds: &[&[u8]],
) -> Result<()> {
    if vault.lamports() > 0 {
        return Ok(());
    }
    let rent = Rent::get()?.minimum_balance(0);
    let ix = anchor_lang::solana_program::system_instruction::create_account(
        payer.key,
        vault.key,
        rent,
        0,
        &system_program::ID,
    );
    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[payer, vault, system],
        &[seeds],
    )?;
    Ok(())
}

#[program]
pub mod cession_bonding_curve {
    use super::*;

    pub fn create(ctx: Context<Create>, name: String, symbol: String, uri: String) -> Result<()> {
        require!(name.len() <= 32, CessionError::NameTooLong);
        require!(symbol.len() <= 12, CessionError::SymbolTooLong);
        require!(uri.len() <= 200, CessionError::UriTooLong);

        let registry = &mut ctx.accounts.creator_registry;
        require!(!registry.is_active, CessionError::ActiveCurveExists);
        registry.creator = ctx.accounts.signer.key();
        registry.mint = ctx.accounts.mint.key();
        registry.is_active = true;

        let sym_registry = &mut ctx.accounts.symbol_registry;
        sym_registry.symbol = symbol.clone();
        sym_registry.mint = ctx.accounts.mint.key();

        let mint_key = ctx.accounts.mint.key();
        let sol_bump = ctx.bumps.sol_vault;
        let fee_bump = ctx.bumps.fee_vault;
        let sol_seeds: &[&[u8]] = &[b"sol_vault", mint_key.as_ref(), &[sol_bump]];
        let fee_seeds: &[&[u8]] = &[b"fee_vault", mint_key.as_ref(), &[fee_bump]];
        open_pda(
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.sol_vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            sol_seeds,
        )?;
        open_pda(
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.fee_vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            fee_seeds,
        )?;

        let curve = &mut ctx.accounts.curve_state;
        curve.creator = ctx.accounts.signer.key();
        curve.mint = mint_key;
        curve.token_vault = ctx.accounts.token_vault.key();
        curve.sol_vault = ctx.accounts.sol_vault.key();
        curve.fee_vault = ctx.accounts.fee_vault.key();
        curve.name = name;
        curve.symbol = symbol;
        curve.uri = uri;
        curve.virtual_sol_reserves = 30_000_000_000;
        curve.virtual_token_reserves = 1_000_000_000_000_000;
        curve.total_supply = 1_000_000_000_000_000;
        curve.creator_fees_accrued = 0;
        curve.holder_fees_accrued = 0;
        curve.fee_bps = 100;
        curve.is_graduated = false;

        let create_fee_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.signer.key(),
            &ctx.accounts.treasury.key(),
            CREATE_FEE,
        );
        anchor_lang::solana_program::program::invoke(
            &create_fee_ix,
            &[
                ctx.accounts.signer.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let seeds = &[b"curve".as_ref(), mint_key.as_ref(), &[ctx.bumps.curve_state]];
        let signer_seeds = &[&seeds[..]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.curve_state.to_account_info(),
                },
                signer_seeds,
            ),
            curve.total_supply,
        )?;
        Ok(())
    }

    pub fn buy(ctx: Context<Buy>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.curve_state;
        require!(!curve.is_graduated, CessionError::CurveGraduated);
        require!(sol_amount > 0, CessionError::InvalidAmount);

        let (creator_fee, holder_fee, treasury_fee) = split_fee(sol_amount);
        let total_fee = creator_fee + holder_fee + treasury_fee;
        let sol_to_vault = sol_amount - total_fee;

        let treasury_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.signer.key(),
            &ctx.accounts.treasury.key(),
            treasury_fee,
        );
        anchor_lang::solana_program::program::invoke(
            &treasury_ix,
            &[
                ctx.accounts.signer.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let fee_vault_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.signer.key(),
            &ctx.accounts.fee_vault.key(),
            creator_fee + holder_fee,
        );
        anchor_lang::solana_program::program::invoke(
            &fee_vault_ix,
            &[
                ctx.accounts.signer.to_account_info(),
                ctx.accounts.fee_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let vault_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.signer.key(),
            &ctx.accounts.sol_vault.key(),
            sol_to_vault,
        );
        anchor_lang::solana_program::program::invoke(
            &vault_ix,
            &[
                ctx.accounts.signer.to_account_info(),
                ctx.accounts.sol_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        curve.creator_fees_accrued += creator_fee;
        curve.holder_fees_accrued += holder_fee;

        let new_sol_reserves = curve.virtual_sol_reserves + sol_to_vault;
        let k = (curve.virtual_sol_reserves as u128) * (curve.virtual_token_reserves as u128);
        let new_token_reserves = (k / (new_sol_reserves as u128)) as u64;
        let gross_tokens_out = curve.virtual_token_reserves - new_token_reserves;
        let burn_amount = gross_tokens_out * 10 / 10_000;
        let net_tokens_out = gross_tokens_out - burn_amount;
        require!(net_tokens_out >= min_tokens_out, CessionError::SlippageExceeded);

        curve.virtual_sol_reserves = new_sol_reserves;
        curve.virtual_token_reserves = new_token_reserves;

        let mint_key = ctx.accounts.mint.key();
        let seeds = &[b"curve".as_ref(), mint_key.as_ref(), &[ctx.bumps.curve_state]];
        let signer_seeds = &[&seeds[..]];

        if burn_amount > 0 {
            token::burn(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Burn {
                        mint: ctx.accounts.mint.to_account_info(),
                        from: ctx.accounts.token_vault.to_account_info(),
                        authority: ctx.accounts.curve_state.to_account_info(),
                    },
                    signer_seeds,
                ),
                burn_amount,
            )?;
        }

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.token_vault.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.curve_state.to_account_info(),
                },
                signer_seeds,
            ),
            net_tokens_out,
        )?;
        Ok(())
    }

    pub fn sell(ctx: Context<Sell>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.curve_state;
        require!(!curve.is_graduated, CessionError::CurveGraduated);
        require!(token_amount > 0, CessionError::InvalidAmount);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.seller_token_account.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            token_amount,
        )?;

        let new_token_reserves = curve.virtual_token_reserves + token_amount;
        let k = (curve.virtual_sol_reserves as u128) * (curve.virtual_token_reserves as u128);
        let new_sol_reserves = (k / (new_token_reserves as u128)) as u64;
        let gross_sol_out = curve.virtual_sol_reserves - new_sol_reserves;
        let (creator_fee, holder_fee, treasury_fee) = split_fee(gross_sol_out);
        let total_fee = creator_fee + holder_fee + treasury_fee;
        let net_sol_out = gross_sol_out - total_fee;
        require!(net_sol_out >= min_sol_out, CessionError::SlippageExceeded);

        curve.virtual_token_reserves = new_token_reserves;
        curve.virtual_sol_reserves = new_sol_reserves;
        curve.creator_fees_accrued += creator_fee;
        curve.holder_fees_accrued += holder_fee;

        **ctx.accounts.sol_vault.try_borrow_mut_lamports()? -= net_sol_out + total_fee;
        **ctx.accounts.signer.try_borrow_mut_lamports()? += net_sol_out;
        **ctx.accounts.treasury.try_borrow_mut_lamports()? += treasury_fee;
        **ctx.accounts.fee_vault.try_borrow_mut_lamports()? += creator_fee + holder_fee;
        Ok(())
    }

    pub fn claim_creator_fees(ctx: Context<ClaimCreatorFees>) -> Result<()> {
        let curve = &mut ctx.accounts.curve_state;
        require!(ctx.accounts.signer.key() == curve.creator, CessionError::UnauthorizedClaim);
        let claimable = curve.creator_fees_accrued;
        require!(claimable > 0, CessionError::NoFeesToClaim);
        curve.creator_fees_accrued = 0;
        **ctx.accounts.fee_vault.try_borrow_mut_lamports()? -= claimable;
        **ctx.accounts.signer.try_borrow_mut_lamports()? += claimable;
        Ok(())
    }

    pub fn claim_holder_fees(ctx: Context<ClaimHolderFees>) -> Result<()> {
        let curve = &mut ctx.accounts.curve_state;
        let holder_tokens = ctx.accounts.holder_token_account.amount;
        require!(holder_tokens > 0, CessionError::NoTokensHeld);
        let lifetime = curve.holder_fees_accrued;
        require!(lifetime > 0, CessionError::NoFeesToClaim);
        let circulating = curve.total_supply.saturating_sub(ctx.accounts.token_vault.amount);
        require!(circulating > 0, CessionError::NoTokensHeld);
        let entitled = ((holder_tokens as u128) * (lifetime as u128) / (circulating as u128)) as u64;
        let already = ctx.accounts.holder_claim.claimed;
        let payout = entitled.saturating_sub(already);
        require!(payout > 0, CessionError::NoFeesToClaim);
        ctx.accounts.holder_claim.holder = ctx.accounts.signer.key();
        ctx.accounts.holder_claim.mint = ctx.accounts.mint.key();
        ctx.accounts.holder_claim.claimed = already + payout;
        **ctx.accounts.fee_vault.try_borrow_mut_lamports()? -= payout;
        **ctx.accounts.signer.try_borrow_mut_lamports()? += payout;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String)]
pub struct Create<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        mint::decimals = 6,
        mint::authority = curve_state,
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = curve_state,
    )]
    pub token_vault: Account<'info, TokenAccount>,
    /// CHECK: SOL vault PDA
    #[account(mut, seeds = [b"sol_vault", mint.key().as_ref()], bump)]
    pub sol_vault: AccountInfo<'info>,
    /// CHECK: Fee vault PDA
    #[account(mut, seeds = [b"fee_vault", mint.key().as_ref()], bump)]
    pub fee_vault: AccountInfo<'info>,
    /// CHECK: Protocol treasury, pinned to TREASURY_PUBKEY below.
    #[account(mut, address = TREASURY_PUBKEY @ CessionError::InvalidTreasury)]
    pub treasury: AccountInfo<'info>,
    #[account(
        init,
        payer = signer,
        space = 8 + 32 + 32 + 32 + 32 + 32 + (4 + 32) + (4 + 12) + (4 + 200) + 8 + 8 + 8 + 8 + 8 + 2 + 1,
        seeds = [b"curve", mint.key().as_ref()],
        bump
    )]
    pub curve_state: Account<'info, CurveState>,
    #[account(
        init_if_needed,
        payer = signer,
        space = 8 + 32 + 32 + 1,
        seeds = [b"creator_registry", signer.key().as_ref()],
        bump
    )]
    pub creator_registry: Account<'info, CreatorRegistry>,
    #[account(
        init,
        payer = signer,
        space = 8 + (4 + 12) + 32,
        seeds = [b"symbol_registry", symbol.as_bytes()],
        bump
    )]
    pub symbol_registry: Account<'info, SymbolRegistry>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut, has_one = mint, constraint = token_vault.key() == curve_state.token_vault @ CessionError::InvalidVault)]
    pub token_vault: Account<'info, TokenAccount>,
    /// CHECK: SOL vault
    #[account(mut, seeds = [b"sol_vault", mint.key().as_ref()], bump, constraint = sol_vault.key() == curve_state.sol_vault @ CessionError::InvalidVault)]
    pub sol_vault: AccountInfo<'info>,
    /// CHECK: Fee vault
    #[account(mut, seeds = [b"fee_vault", mint.key().as_ref()], bump, constraint = fee_vault.key() == curve_state.fee_vault @ CessionError::InvalidVault)]
    pub fee_vault: AccountInfo<'info>,
    #[account(mut, has_one = mint)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    /// CHECK: Treasury, pinned to TREASURY_PUBKEY below.
    #[account(mut, address = TREASURY_PUBKEY @ CessionError::InvalidTreasury)]
    pub treasury: AccountInfo<'info>,
    #[account(mut, seeds = [b"curve", mint.key().as_ref()], bump)]
    pub curve_state: Account<'info, CurveState>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut, has_one = mint, constraint = token_vault.key() == curve_state.token_vault @ CessionError::InvalidVault)]
    pub token_vault: Account<'info, TokenAccount>,
    /// CHECK: SOL vault
    #[account(mut, seeds = [b"sol_vault", mint.key().as_ref()], bump, constraint = sol_vault.key() == curve_state.sol_vault @ CessionError::InvalidVault)]
    pub sol_vault: AccountInfo<'info>,
    /// CHECK: Fee vault
    #[account(mut, seeds = [b"fee_vault", mint.key().as_ref()], bump, constraint = fee_vault.key() == curve_state.fee_vault @ CessionError::InvalidVault)]
    pub fee_vault: AccountInfo<'info>,
    #[account(mut, has_one = mint)]
    pub seller_token_account: Account<'info, TokenAccount>,
    /// CHECK: Treasury, pinned to TREASURY_PUBKEY below.
    #[account(mut, address = TREASURY_PUBKEY @ CessionError::InvalidTreasury)]
    pub treasury: AccountInfo<'info>,
    #[account(mut, seeds = [b"curve", mint.key().as_ref()], bump)]
    pub curve_state: Account<'info, CurveState>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimCreatorFees<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    /// CHECK: Fee vault
    #[account(mut, seeds = [b"fee_vault", mint.key().as_ref()], bump, constraint = fee_vault.key() == curve_state.fee_vault @ CessionError::InvalidVault)]
    pub fee_vault: AccountInfo<'info>,
    #[account(mut, seeds = [b"curve", mint.key().as_ref()], bump)]
    pub curve_state: Account<'info, CurveState>,
}

#[derive(Accounts)]
pub struct ClaimHolderFees<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    /// CHECK: Fee vault
    #[account(mut, seeds = [b"fee_vault", mint.key().as_ref()], bump, constraint = fee_vault.key() == curve_state.fee_vault @ CessionError::InvalidVault)]
    pub fee_vault: AccountInfo<'info>,
    #[account(mut, has_one = mint, constraint = token_vault.key() == curve_state.token_vault @ CessionError::InvalidVault)]
    pub token_vault: Account<'info, TokenAccount>,
    #[account(has_one = mint, constraint = holder_token_account.owner == signer.key() @ CessionError::UnauthorizedClaim)]
    pub holder_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = signer,
        space = 8 + 32 + 32 + 8,
        seeds = [b"holder_claim", mint.key().as_ref(), signer.key().as_ref()],
        bump
    )]
    pub holder_claim: Account<'info, HolderClaim>,
    #[account(mut, seeds = [b"curve", mint.key().as_ref()], bump)]
    pub curve_state: Account<'info, CurveState>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct CurveState {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub token_vault: Pubkey,
    pub sol_vault: Pubkey,
    pub fee_vault: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub total_supply: u64,
    pub creator_fees_accrued: u64,
    pub holder_fees_accrued: u64,
    pub fee_bps: u16,
    pub is_graduated: bool,
}

#[account]
pub struct CreatorRegistry {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub is_active: bool,
}

#[account]
pub struct SymbolRegistry {
    pub symbol: String,
    pub mint: Pubkey,
}

#[account]
pub struct HolderClaim {
    pub holder: Pubkey,
    pub mint: Pubkey,
    pub claimed: u64,
}

#[error_code]
pub enum CessionError {
    #[msg("Amount must be greater than zero.")]
    InvalidAmount,
    #[msg("Bonding curve has already graduated to DEX pool.")]
    CurveGraduated,
    #[msg("Slippage tolerance exceeded.")]
    SlippageExceeded,
    #[msg("Unauthorized to claim fees from this bonding curve.")]
    UnauthorizedClaim,
    #[msg("No accumulated fees available to claim.")]
    NoFeesToClaim,
    #[msg("No tokens held in wallet.")]
    NoTokensHeld,
    #[msg("Token name exceeds 32 characters limit.")]
    NameTooLong,
    #[msg("Token symbol exceeds 12 characters limit.")]
    SymbolTooLong,
    #[msg("Token URI exceeds 200 characters limit.")]
    UriTooLong,
    #[msg("Creator already has an active live bonding curve.")]
    ActiveCurveExists,
    #[msg("Invalid vault account supplied.")]
    InvalidVault,
    #[msg("Treasury account does not match the protocol treasury.")]
    InvalidTreasury,
}
