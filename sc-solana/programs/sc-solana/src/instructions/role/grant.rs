//! GrantRole instruction context
//!
//! Admin is derived as PDA with seeds [b"admin", config.key()] for consistency
//! with Solana/PDA patterns and Surfpool/txtx compatibility.
//!
//! NOTE (Issue #141): `grant_role_no_signer` has been removed.
//! Roles should ideally be granted through the request-approval flow:
//! request_role → approve_role_request
//! This function is maintained for admin-initiated role assignments
//! where direct granting is necessary (e.g., initial setup, emergencies).

use anchor_lang::prelude::*;
use crate::state::SupplyChainConfig;
use crate::events::RoleGranted;


#[derive(Accounts)]
pub struct GrantRole<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub account_to_grant: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Grant a role to an account
/// Only the admin PDA can call this instruction
/// The recipient must also sign (consent-based granting)
pub fn grant_role(ctx: Context<GrantRole>, role: String) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let admin = ctx.accounts.admin.key();

    // Check if role already granted
    match role.as_str() {
        crate::FABRICANTE_ROLE if config.fabricante == ctx.accounts.account_to_grant.key() => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        crate::AUDITOR_HW_ROLE if config.auditor_hw == ctx.accounts.account_to_grant.key() => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        crate::TECNICO_SW_ROLE if config.tecnico_sw == ctx.accounts.account_to_grant.key() => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        crate::ESCUELA_ROLE if config.escuela == ctx.accounts.account_to_grant.key() => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        _ => {}
    }

    // Store role authority
    match role.as_str() {
        crate::FABRICANTE_ROLE => config.fabricante = ctx.accounts.account_to_grant.key(),
        crate::AUDITOR_HW_ROLE => config.auditor_hw = ctx.accounts.account_to_grant.key(),
        crate::TECNICO_SW_ROLE => config.tecnico_sw = ctx.accounts.account_to_grant.key(),
        crate::ESCUELA_ROLE => config.escuela = ctx.accounts.account_to_grant.key(),
        _ => return Err(crate::SupplyChainError::RoleNotFound.into()),
    }

    let timestamp = Clock::get()?.unix_timestamp as u64;
    emit!(RoleGranted {
        role,
        account: ctx.accounts.account_to_grant.key(),
        admin,
        timestamp,
    });
    Ok(())
}
