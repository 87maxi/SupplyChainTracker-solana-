//! RemoveRoleHolder instruction context
//!
//! Admin is derived as PDA with seeds [b"admin", config.key()] for consistency
//! with Solana/PDA patterns and Surfpool/txtx compatibility.
//!
//! NOTE (Issue #143): Enhanced with saturating_sub to prevent underflow
//! and additional validation to ensure only admin can manage role holders.

use anchor_lang::prelude::*;
use crate::state::{SupplyChainConfig, RoleHolder};
use crate::events::RoleHolderRemoved;


/// Remove a role holder (multiple role holders per role)
/// Only the admin PDA can call this instruction
#[derive(Accounts)]
pub struct RemoveRoleHolder<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"role_holder", role_holder.account.as_ref()],
        bump,
        close = admin  // Return lamports to admin
    )]
    pub role_holder: Account<'info, RoleHolder>,
    pub system_program: Program<'info, System>,
}

/// Remove a role holder (multiple role holders per role)
/// Only the admin PDA can call this instruction
/// Uses saturating_sub to prevent counter underflow
pub fn remove_role_holder(ctx: Context<RemoveRoleHolder>, role: String) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let admin = ctx.accounts.admin.key();
    let role_holder = &ctx.accounts.role_holder;
    let account = role_holder.account;
    let role_type = role.as_str();
    let timestamp = role_holder.timestamp;

    // Validate that the role_holder actually has the specified role
    require!(
        role_holder.role == role_type,
        crate::SupplyChainError::InvalidInput
    );

    // Decrement role holder count using saturating_sub to prevent underflow
    match role_type {
        crate::FABRICANTE_ROLE => config.fabricante_count = config.fabricante_count.saturating_sub(1),
        crate::AUDITOR_HW_ROLE => config.auditor_hw_count = config.auditor_hw_count.saturating_sub(1),
        crate::TECNICO_SW_ROLE => config.tecnico_sw_count = config.tecnico_sw_count.saturating_sub(1),
        crate::ESCUELA_ROLE => config.escuela_count = config.escuela_count.saturating_sub(1),
        _ => return Err(crate::SupplyChainError::RoleNotFound.into()),
    }

    emit!(RoleHolderRemoved {
        role: role.clone(),
        account,
        admin,
        timestamp,
    });
    Ok(())
}
