//! RevokeRole instruction context
//!
//! Admin is derived as PDA with seeds [b"admin", config.key()] for consistency
//! with Solana/PDA patterns and Surfpool/txtx compatibility.

use anchor_lang::prelude::*;
use crate::state::{SupplyChainConfig, RoleHolder};
use crate::events::RoleRevoked;


#[derive(Accounts)]
pub struct RevokeRole<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, SupplyChainConfig>,
    /// Admin PDA - derived from config key using seeds [b"admin", config.key()]
    #[account(
        seeds = [b"admin", config.key().as_ref()],
        bump
    )]
    pub admin: Signer<'info>,
    pub account_to_revoke: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Revoke a role from an account (clears config fields)
/// For roles created via approve_role_request, also call close_role_holder
/// to clean up the RoleHolder account and return lamports.
pub fn revoke_role(ctx: Context<RevokeRole>, role: String) -> Result<()> {
    let config = &mut ctx.accounts.config;

    // Clear role authority
    match role.as_str() {
        crate::FABRICANTE_ROLE => config.fabricante = Pubkey::default(),
        crate::AUDITOR_HW_ROLE => config.auditor_hw = Pubkey::default(),
        crate::TECNICO_SW_ROLE => config.tecnico_sw = Pubkey::default(),
        crate::ESCUELA_ROLE => config.escuela = Pubkey::default(),
        _ => return Err(crate::SupplyChainError::RoleNotFound.into()),
    }

    emit!(RoleRevoked {
        role,
        account: ctx.accounts.account_to_revoke.key(),
    });
    Ok(())
}

/// Close a RoleHolder account and return lamports to the admin
/// Use this after revoke_role to clean up RoleHolder accounts
/// created by approve_role_request
/// Admin is derived as PDA with seeds [b"admin", config.key()]
#[derive(Accounts)]
pub struct CloseRoleHolder<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, SupplyChainConfig>,
    /// Admin PDA - derived from config key using seeds [b"admin", config.key()]
    #[account(
        seeds = [b"admin", config.key().as_ref()],
        bump
    )]
    pub admin: Signer<'info>,
    /// RoleHolder account to close - returns lamports to admin
    /// Seeds derived from the stored account field (same pattern as holder_remove)
    #[account(
        mut,
        seeds = [b"role_holder", role_holder.account.as_ref()],
        bump,
        close = admin
    )]
    pub role_holder: Account<'info, RoleHolder>,
    pub system_program: Program<'info, System>,
}

/// Close a RoleHolder account and return lamports to admin
pub fn close_role_holder(ctx: Context<CloseRoleHolder>, role: String) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let role_holder = &ctx.accounts.role_holder;
    let account = role_holder.account;
    let _timestamp = role_holder.timestamp;

    // Decrement role holder count
    match role.as_str() {
        crate::FABRICANTE_ROLE => config.fabricante_count = config.fabricante_count.saturating_sub(1),
        crate::AUDITOR_HW_ROLE => config.auditor_hw_count = config.auditor_hw_count.saturating_sub(1),
        crate::TECNICO_SW_ROLE => config.tecnico_sw_count = config.tecnico_sw_count.saturating_sub(1),
        crate::ESCUELA_ROLE => config.escuela_count = config.escuela_count.saturating_sub(1),
        _ => return Err(crate::SupplyChainError::RoleNotFound.into()),
    }

    emit!(RoleRevoked {
        role,
        account,
    });
    Ok(())
}
