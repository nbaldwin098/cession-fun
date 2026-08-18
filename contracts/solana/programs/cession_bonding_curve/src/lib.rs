use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

declare_id!("Epxb6TRhGwT1gQFj5xCLM6KtZUz9ajD7jZzkVrp3qBR9");

#[program]
pub mod cession_bonding_curve {
    use super::*;

    pub fn create(
        ctx: Context<Create>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        let curve = &mut ctx.accounts.curve_state;
        curve.creator = ctx.accounts.signer.key();
        curve.mint = ctx.accounts.mint.key();
        curve.token_vault = ctx.accounts.token_vault.key();
        curve.sol_vault = ctx.accounts.sol_vault.key();
        curve.symbol = symbol;
        curve.name = name;
        curve.uri = uri;
        curve.virtual_sol_reserves = 30_000_000_000; // 30 SOL virtual reserve
        curve.virtual_token_reserves = 1_000_000_000_000_000; // 1,000,000,000 tokens (6 decimals)
        curve.total_supply = 1_000_000_000_000_000;
        curve.fee_bps = 50; // 0.50% total trade fee (0.25% treasury, 0.25% curve reserve)
        curve.is_graduated = false;

        // 1. Transfer 0.10 SOL creation fee from signer to treasury (or system)
        let create_fee = 100_000_000; // 0.10 SOL
        let create_fee_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.signer.key(),
            &ctx.accounts.sol_vault.key(),
            create_fee,
        );
        anchor_lang::solana_program::program::invoke(
            &create_fee_ix,
            &[
                ctx.accounts.signer.to_account_info(),
                ctx.accounts.sol_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // 2. Mint entire 1,000,000,000 token supply to token_vault
        let mint_key = ctx.accounts.mint.key();
        let seeds = &[
            b"curve",
            mint_key.as_ref(),
            &[ctx.bumps.curve_state],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_vault.to_account_info(),
            authority: ctx.accounts.curve_state.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::mint_to(cpi_ctx, curve.total_supply)?;

        Ok(())
    }

    pub fn buy(
        ctx: Context<Buy>,
        sol_amount: u64,
        min_tokens_out: u64,
    ) -> Result<()> {
        let curve = &mut ctx.accounts.curve_state;
        require!(!curve.is_graduated, CessionError::CurveGraduated);
        require!(sol_amount > 0, CessionError::InvalidAmount);

        // 0.50% total fee (0.25% treasury, 0.25% curve reserve)
        let fee = sol_amount * 50 / 10_000;
        let treasury_fee = fee / 2;
        let sol_to_vault = sol_amount - treasury_fee;

        // 1. Transfer SOL fee to treasury
        let fee_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.signer.key(),
            &ctx.accounts.treasury.key(),
            treasury_fee,
        );
        anchor_lang::solana_program::program::invoke(
            &fee_ix,
            &[
                ctx.accounts.signer.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // 2. Transfer net SOL to sol_vault
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

        // 3. Constant-product bonding curve math: (x * y = k)
        let sol_in = sol_to_vault;
        let new_sol_reserves = curve.virtual_sol_reserves + sol_in;
        let k = (curve.virtual_sol_reserves as u128) * (curve.virtual_token_reserves as u128);
        let new_token_reserves = (k / (new_sol_reserves as u128)) as u64;
        let tokens_out = curve.virtual_token_reserves - new_token_reserves;

        require!(tokens_out >= min_tokens_out, CessionError::SlippageExceeded);

        curve.virtual_sol_reserves = new_sol_reserves;
        curve.virtual_token_reserves = new_token_reserves;

        // 4. PDA signs token transfer from token_vault -> buyer_token_account
        let mint_key = ctx.accounts.mint.key();
        let seeds = &[
            b"curve",
            mint_key.as_ref(),
            &[ctx.bumps.curve_state],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.token_vault.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.curve_state.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, tokens_out)?;

        Ok(())
    }

    pub fn sell(
        ctx: Context<Sell>,
        token_amount: u64,
        min_sol_out: u64,
    ) -> Result<()> {
        let curve = &mut ctx.accounts.curve_state;
        require!(!curve.is_graduated, CessionError::CurveGraduated);
        require!(token_amount > 0, CessionError::InvalidAmount);

        // 1. Transfer tokens from seller_token_account -> token_vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.seller_token_account.to_account_info(),
            to: ctx.accounts.token_vault.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, token_amount)?;

        // 2. Constant-product bonding curve math: (x * y = k)
        let new_token_reserves = curve.virtual_token_reserves + token_amount;
        let k = (curve.virtual_sol_reserves as u128) * (curve.virtual_token_reserves as u128);
        let new_sol_reserves = (k / (new_token_reserves as u128)) as u64;
        let gross_sol_out = curve.virtual_sol_reserves - new_sol_reserves;

        // 0.50% total fee (0.25% treasury, 0.25% curve reserve)
        let fee = gross_sol_out * 50 / 10_000;
        let treasury_fee = fee / 2;
        let net_sol_out = gross_sol_out - fee;

        require!(net_sol_out >= min_sol_out, CessionError::SlippageExceeded);

        curve.virtual_token_reserves = new_token_reserves;
        curve.virtual_sol_reserves = new_sol_reserves;

        // 3. Release SOL from sol_vault PDA to seller and treasury
        **ctx.accounts.sol_vault.sub_lamports(net_sol_out + treasury_fee)?;
        **ctx.accounts.signer.add_lamports(net_sol_out)?;
        **ctx.accounts.treasury.add_lamports(treasury_fee)?;

        Ok(())
    }

    pub fn claim(
        ctx: Context<Claim>,
        amount: u64,
    ) -> Result<()> {
        let curve = &mut ctx.accounts.curve_state;
        require!(
            ctx.accounts.signer.key() == curve.creator || ctx.accounts.signer.key() == ctx.accounts.treasury.key(),
            CessionError::UnauthorizedClaim
        );

        let sol_balance = ctx.accounts.sol_vault.lamports();
        let rent = Rent::get()?;
        let min_rent = rent.minimum_balance(0);
        let claimable = if sol_balance > min_rent { sol_balance - min_rent } else { 0 };
        
        let to_transfer = if amount > 0 && amount <= claimable { amount } else { claimable };
        require!(to_transfer > 0, CessionError::InvalidAmount);

        **ctx.accounts.sol_vault.sub_lamports(to_transfer)?;
        **ctx.accounts.recipient.add_lamports(to_transfer)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String)]
pub struct Create<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = curve_state,
    )]
    pub token_vault: Account<'info, TokenAccount>,
    /// CHECK: SOL vault PDA
    #[account(
        mut,
        seeds = [b"sol_vault", mint.key().as_ref()],
        bump
    )]
    pub sol_vault: AccountInfo<'info>,
    #[account(
        init,
        payer = signer,
        space = 8 + 32 + 32 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 2 + 1,
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
pub struct Buy<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_vault: Account<'info, TokenAccount>,
    /// CHECK: SOL vault PDA
    #[account(
        mut,
        seeds = [b"sol_vault", mint.key().as_ref()],
        bump
    )]
    pub sol_vault: AccountInfo<'info>,
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    /// CHECK: Protocol Treasury account
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"curve", mint.key().as_ref()],
        bump
    )]
    pub curve_state: Account<'info, CurveState>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_vault: Account<'info, TokenAccount>,
    /// CHECK: SOL vault PDA
    #[account(
        mut,
        seeds = [b"sol_vault", mint.key().as_ref()],
        bump
    )]
    pub sol_vault: AccountInfo<'info>,
    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,
    /// CHECK: Protocol Treasury account
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"curve", mint.key().as_ref()],
        bump
    )]
    pub curve_state: Account<'info, CurveState>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    /// CHECK: SOL vault PDA
    #[account(
        mut,
        seeds = [b"sol_vault", mint.key().as_ref()],
        bump
    )]
    pub sol_vault: AccountInfo<'info>,
    /// CHECK: Recipient account for claimed SOL
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    /// CHECK: Protocol Treasury account
    pub treasury: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"curve", mint.key().as_ref()],
        bump
    )]
    pub curve_state: Account<'info, CurveState>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct CurveState {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub token_vault: Pubkey,
    pub sol_vault: Pubkey,
    pub symbol: String,
    pub name: String,
    pub uri: String,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub total_supply: u64,
    pub fee_bps: u16,
    pub is_graduated: bool,
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
}
