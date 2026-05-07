//! TransferAdmin instruction context

use anchor_lang::prelude::*;
use crate::state::SupplyChainConfig;
use crate::events::AdminTransferred;
use crate::SupplyChainError;

/// Transfer admin ownership to a new account
/// Requires signatures from both current admin and new admin (acceptance)
#[derive(Accounts)]
pub struct TransferAdmin<'info> {
    #[account(mut)]
    pub config: Account<'info, SupplyChainConfig>,
    /// Current admin must sign to initiate transfer
    #[account(mut)]
    pub current_admin: Signer<'info>,
    /// New admin must sign to accept the transfer
    pub new_admin: Signer<'info>,
}

/// Transfer admin role to a new account
/// Both current admin and new admin must sign (consent-based transfer)
pub fn transfer_admin(ctx: Context<TransferAdmin>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let current_admin = ctx.accounts.current_admin.key();
    let new_admin = ctx.accounts.new_admin.key();

    // Verify current admin is the actual admin
    require!(
        config.admin == current_admin,
        SupplyChainError::Unauthorized
    );

    // Prevent transferring to the same admin
    require!(
        current_admin != new_admin,
        SupplyChainError::InvalidInput
    );

    let previous_admin = config.admin;
    config.admin = new_admin;

    let timestamp = Clock::get()?.unix_timestamp as u64;
    emit!(AdminTransferred {
        previous_admin,
        new_admin,
        timestamp,
    });
    Ok(())
}
