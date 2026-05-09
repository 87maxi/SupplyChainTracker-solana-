//! Deployer PDA instructions
//!
//! The Deployer PDA is a program-derived address that acts as the central payer
//! for account creation. This eliminates the need for external wallet signers in
//! instructions, making all accounts PDA-derivable from the IDL for Surfpool/txtx compatibility.
//!
//! Pattern:
//! 1. `fund_deployer` - Create/fund the deployer PDA from external wallet
//! 2. Use deployer PDA as payer in `initialize` and other instructions
//! 3. `close_deployer` - Recover remaining SOL from deployer PDA

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::errors::SupplyChainError;
use crate::state::SupplyChainConfig;

/// Deployer PDA seeds
pub const DEPLOYER_SEED: &[u8] = b"deployer";

/// Minimum deployer balance to pay for Config + SerialHashRegistry accounts
/// Config: ~289 bytes, SerialHashRegistry: ~360 bytes
/// Rent exemption for both + discriminator overhead
pub const MIN_DEPLOYER_BALANCE: u64 = 10_000_000_000; // ~0.01 SOL (generous estimate)

/// Deployer state account - thin wrapper for PDA ownership
#[account]
#[derive(Debug)]
pub struct DeployerState {
    /// Bump seed for the deployer PDA
    pub bump: u8,
    /// Total lamports received
    pub total_funded: u64,
}

impl DeployerState {
    pub const INIT_SPACE: usize = 8 + 1 + 8; // discriminator + bump + total_funded
}

/// Fund the deployer PDA
///
/// This instruction creates (or top-ups) the deployer PDA with SOL from an
/// external wallet. The deployer PDA is then used as the payer for account
/// creation in other instructions.
///
/// IMPORTANT: This is the ONLY instruction that requires an external wallet
/// (`funder`). All other instructions use PDA accounts exclusively.
#[derive(Accounts)]
pub struct FundDeployer<'info> {
    #[account(
        init_if_needed,
        payer = funder,
        space = DeployerState::INIT_SPACE,
        seeds = [DEPLOYER_SEED],
        bump
    )]
    pub deployer: Account<'info, DeployerState>,
    #[account(mut)]
    pub funder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Fund the deployer PDA with the specified amount of lamports
pub fn fund_deployer(ctx: Context<FundDeployer>, amount: u64) -> Result<()> {
    require!(
        amount >= MIN_DEPLOYER_BALANCE,
        SupplyChainError::InvalidInput
    );

    // Update deployer state
    let deployer = &mut ctx.accounts.deployer;
    deployer.bump = ctx.bumps.deployer;
    deployer.total_funded += amount;

    // Transfer lamports from funder to deployer PDA
    // Note: The `init` constraint already handles rent exemption.
    // Additional lamports are added via CPI transfer.
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.funder.to_account_info(),
            to: ctx.accounts.deployer.to_account_info(),
        },
    );
    system_program::transfer(cpi_ctx, amount)?;

    Ok(())
}

/// Close the deployer PDA and recover remaining SOL
///
/// Transfers all remaining lamports from the deployer PDA back to the admin.
/// This is useful for cleanup after testing or migration.
#[derive(Accounts)]
pub struct CloseDeployer<'info> {
    #[account(mut)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    /// Deployer PDA to close - returns lamports to admin
    #[account(
        mut,
        seeds = [DEPLOYER_SEED],
        bump,
        close = admin
    )]
    pub deployer: Account<'info, DeployerState>,
    pub system_program: Program<'info, System>,
}

/// Close the deployer PDA
pub fn close_deployer(_ctx: Context<CloseDeployer>) -> Result<()> {
    // Lamports are automatically transferred to `admin` via `close` constraint
    Ok(())
}
