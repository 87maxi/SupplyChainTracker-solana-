//! RemoveRoleHolder instruction context

use anchor_lang::prelude::*;
use crate::state::{SupplyChainConfig, RoleHolder};
use crate::SupplyChainError;
use crate::events::RoleHolderRemoved;


/// Remove a role holder (multiple role holders per role)
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
pub fn remove_role_holder(ctx: Context<RemoveRoleHolder>, role: String) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let admin = ctx.accounts.admin.key();
    let role_holder = &ctx.accounts.role_holder;
    let account = role_holder.account;
    let role_type = role.as_str();
    let timestamp = role_holder.timestamp;

    // Decrement role holder count
    match role_type {
        crate::FABRICANTE_ROLE => config.fabricante_count -= 1,
        crate::AUDITOR_HW_ROLE => config.auditor_hw_count -= 1,
        crate::TECNICO_SW_ROLE => config.tecnico_sw_count -= 1,
        crate::ESCUELA_ROLE => config.escuela_count -= 1,
        _ => return Err(crate::SupplyChainError::RoleNotFound.into()),
    }

    emit!(RoleHolderRemoved {
        role,
        account,
        admin,
        timestamp,
    });
    Ok(())
}
