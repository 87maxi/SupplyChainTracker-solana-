//! RevokeRole instruction context
//!
//! Admin is derived as PDA with seeds [b"admin", config.key()] for consistency
//! with Solana/PDA patterns and Surfpool/txtx compatibility.
//!
//! NOTE (Issue #142): Enhanced with additional validation to ensure:
//! - Only admin PDA can revoke roles
//! - The account being revoked actually holds the role
//! - Proper validation of role existence before revocation
//!
//! NOTE (Issue #186): Admin is now UncheckedAccount with seed verification
//! instead of Signer, since PDAs cannot sign transactions.

use anchor_lang::prelude::*;
use crate::state::{SupplyChainConfig, RoleHolder};
use crate::events::RoleRevoked;


#[derive(Accounts)]
pub struct RevokeRole<'info> {
    #[account(mut)]
    pub config: Account<'info, SupplyChainConfig>,
    /// CHECK: Admin PDA verified via seeds [b"admin", config.key()] with bump from config
    #[account(
        seeds = [b"admin", config.key().as_ref()],
        bump = config.admin_pda_bump
    )]
    pub admin: UncheckedAccount<'info>,
    /// CHECK: Account to revoke role from - must sign to consent
    pub account_to_revoke: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Revoke a role from an account (clears config fields)
/// Only the admin PDA can call this instruction
/// The account being revoked must also sign (consent-based revocation)
/// For roles created via approve_role_request, also call close_role_holder
/// to clean up the RoleHolder account and return lamports.
pub fn revoke_role(ctx: Context<RevokeRole>, role: String) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let account_to_revoke = ctx.accounts.account_to_revoke.key();

    // Validate that the account actually holds the role before revoking
    // This prevents unnecessary revocations and ensures data consistency
    let holds_role = match role.as_str() {
        crate::FABRICANTE_ROLE => config.fabricante == account_to_revoke,
        crate::AUDITOR_HW_ROLE => config.auditor_hw == account_to_revoke,
        crate::TECNICO_SW_ROLE => config.tecnico_sw == account_to_revoke,
        crate::ESCUELA_ROLE => config.escuela == account_to_revoke,
        _ => false,
    };

    // If account doesn't hold the role, check if it's already revoked
    if !holds_role {
        // Check if role is valid but already empty (already revoked)
        match role.as_str() {
            crate::FABRICANTE_ROLE | crate::AUDITOR_HW_ROLE |
            crate::TECNICO_SW_ROLE | crate::ESCUELA_ROLE => {
                // Role is valid but not held by this account - return error
                return Err(crate::SupplyChainError::RoleHolderNotFound.into());
            }
            _ => return Err(crate::SupplyChainError::RoleNotFound.into()),
        }
    }

    // Clear role authority
    match role.as_str() {
        crate::FABRICANTE_ROLE => config.fabricante = Pubkey::default(),
        crate::AUDITOR_HW_ROLE => config.auditor_hw = Pubkey::default(),
        crate::TECNICO_SW_ROLE => config.tecnico_sw = Pubkey::default(),
        crate::ESCUELA_ROLE => config.escuela = Pubkey::default(),
        _ => unreachable!(), // Already validated above
    }

    emit!(RoleRevoked {
        role,
        account: account_to_revoke,
    });
    Ok(())
}

/// Close a RoleHolder account and return lamports to the admin
/// Use this after revoke_role to clean up RoleHolder accounts
/// created by approve_role_request
/// Admin is derived as PDA with seeds [b"admin", config.key()]
/// NOTE (Issue #186): Admin is now UncheckedAccount with seed verification
#[derive(Accounts)]
pub struct CloseRoleHolder<'info> {
    #[account(mut)]
    pub config: Account<'info, SupplyChainConfig>,
    /// CHECK: Admin PDA verified via seeds [b"admin", config.key()] with bump from config
    #[account(
        seeds = [b"admin", config.key().as_ref()],
        bump = config.admin_pda_bump
    )]
    pub admin: UncheckedAccount<'info>,
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
