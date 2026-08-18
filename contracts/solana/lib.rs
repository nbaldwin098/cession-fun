use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

declare_id!("Cess1onCurve11111111111111111111111111111111");

#[program]
pub mod cession_bonding_curve {
    use super::*;

    /// Instruction 1: create (Initializes mint, token_vault, sol_vault, curve_state)
    pub fn create(
        ctx: Context<CreateToken>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        let curve = &mut ctx.accounts.curve_state;
        curve.creator = ctx.accounts.signer.key();
        curve.mint = ctx.accounts.mint.key();
        curve.token_vault = ctx.accounts.token_vault.key();
        curve.sol_vault = ctx.accounts.sol_vault.key();
        curve.virtual_sol_reserves = 30_000_000_000; // 30 SOL
        curve.virtual_token_reserves = 1_073_000_000_000_000; // 1.073B tokens
        curve.real_sol_reserves = 0;
        curve.real_token_reserves = 800_000_000_000_000; // 800M tokens
        curve.complete = false;

        let bump = ctx.bumps.curve_state;
        let mint_key = ctx.accounts.mint.key();
        let seeds = &[b"curve", mint_key.as_ref(), &[bump]];
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
            1_000_000_000_000_000,
        )?;

        emit!(TokenCreatedEvent {
            mint: ctx.accounts.mint.key(),
            creator: ctx.accounts.signer.key(),
            name,
            symbol,
            uri,
        });

        Ok(())
    }

    /// Instruction 2: buy (Deposits SOL into SOL Vault, transfers tokens to Buyer ATA)
    pub fn buy(ctx: Context<BuyTokens>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.curve_state;
        require!(!curve.complete, ErrorCode::CurveComplete);
        require!(sol_amount > 0, ErrorCode::InvalidAmount);

        let fee = sol_amount * 50 / 10000; // 0.5% fee
        let sol_in_net = sol_amount - fee;

        let tokens_out = (curve.virtual_token_reserves as u128)
            .checked_mul(sol_in_net as u128)
            .unwrap()
            .checked_div((curve.virtual_sol_reserves as u128) + (sol_in_net as u128))
            .unwrap() as u64;

        require!(tokens_out >= min_tokens_out, ErrorCode::SlippageExceeded);

        if fee > 0 {
            anchor_lang::solana_program::program::invoke(
                &anchor_lang::solana_program::system_instruction::transfer(
                    &ctx.accounts.signer.key(),
                    &ctx.accounts.treasury.key(),
                    fee,
                ),
                &[
                    ctx.accounts.signer.to_account_info(),
                    ctx.accounts.treasury.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }

        anchor_lang::solana_program::program::invoke(
            &anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.signer.key(),
                &ctx.accounts.sol_vault.key(),
                sol_in_net,
            ),
            &[
                ctx.accounts.signer.to_account_info(),
                ctx.accounts.sol_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let bump = ctx.bumps.curve_state;
        let mint_key = ctx.accounts.mint.key();
        let seeds = &[b"curve", mint_key.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

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
            tokens_out,
        )?;

        curve.virtual_sol_reserves += sol_in_net;
        curve.real_sol_reserves += sol_in_net;
        curve.virtual_token_reserves -= tokens_out;
        curve.real_token_reserves -= tokens_out;

        if curve.real_sol_reserves >= 85_000_000_000 {
            curve.complete = true;
        }

        emit!(TradeEvent {
            mint: ctx.accounts.mint.key(),
            trader: ctx.accounts.signer.key(),
            is_buy: true,
            sol_amount,
            token_amount: tokens_out,
        });

        Ok(())
    }

    /// Instruction 3: sell (Transfers tokens from Seller ATA to Token Vault, releases SOL from SOL Vault)
    pub fn sell(ctx: Context<SellTokens>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.curve_state;
        require!(!curve.complete, ErrorCode::CurveComplete);
        require!(token_amount > 0, ErrorCode::InvalidAmount);

        let sol_out_gross = (curve.virtual_sol_reserves as u128)
            .checked_mul(token_amount as u128)
            .unwrap()
            .checked_div((curve.virtual_token_reserves as u128) + (token_amount as u128))
            .unwrap() as u64;

        let fee = sol_out_gross * 50 / 10000;
        let sol_out_net = sol_out_gross - fee;

        require!(sol_out_net >= min_sol_out, ErrorCode::SlippageExceeded);

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

        **ctx.accounts.sol_vault.sub_lamports(sol_out_gross)? = ();
        **ctx.accounts.signer.add_lamports(sol_out_net)? = ();
        **ctx.accounts.treasury.add_lamports(fee)? = ();

        curve.virtual_sol_reserves -= sol_out_gross;
        curve.real_sol_reserves -= sol_out_gross;
        curve.virtual_token_reserves += token_amount;
        curve.real_token_reserves += token_amount;

        emit!(TradeEvent {
            mint: ctx.accounts.mint.key(),
            trader: ctx.accounts.signer.key(),
            is_buy: false,
            sol_amount: sol_out_net,
            token_amount,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        mint::decimals = 6,
        mint::authority = curve_state,
        mint::freeze_authority = curve_state
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = curve_state
    )]
    pub token_vault: Account<'info, TokenAccount>,
    /// CHECK: SOL Vault PDA
    #[account(
        mut,
        seeds = [b"sol_vault", mint.key().as_ref()],
        bump
    )]
    pub sol_vault: AccountInfo<'info>,
    #[account(
        init,
        payer = signer,
        space = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 1,
        seeds = [b"curve", mint.key().as_ref()],
        bump
    )]
    pub curve_state: Account<'info, CurveState>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_vault: Account<'info, TokenAccount>,
    /// CHECK: SOL Vault PDA
    #[account(mut, seeds = [b"sol_vault", mint.key().as_ref()], bump)]
    pub sol_vault: AccountInfo<'info>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    /// CHECK: Cession Protocol Treasury
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    #[account(mut, seeds = [b"curve", mint.key().as_ref()], bump)]
    pub curve_state: Account<'info, CurveState>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_vault: Account<'info, TokenAccount>,
    /// CHECK: SOL Vault PDA
    #[account(mut, seeds = [b"sol_vault", mint.key().as_ref()], bump)]
    pub sol_vault: AccountInfo<'info>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    /// CHECK: Cession Protocol Treasury
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    #[account(mut, seeds = [b"curve", mint.key().as_ref()], bump)]
    pub curve_state: Account<'info, CurveState>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct CurveState {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub token_vault: Pubkey,
    pub sol_vault: Pubkey,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub complete: bool,
}

#[event]
pub struct TokenCreatedEvent {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
}

#[event]
pub struct TradeEvent {
    pub mint: Pubkey,
    pub trader: Pubkey,
    pub is_buy: bool,
    pub sol_amount: u64,
    pub token_amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Bonding curve is already complete and graduated.")]
    CurveComplete,
    #[msg("Invalid token or SOL amount.")]
    InvalidAmount,
    #[msg("Slippage tolerance exceeded.")]
    SlippageExceeded,
}
