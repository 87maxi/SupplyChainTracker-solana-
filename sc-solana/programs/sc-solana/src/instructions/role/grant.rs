//! GrantRole instruction context

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

/// Grant a role without requiring the recipient's signature
/// Only admin can use this instruction (for emergencies, automated onboarding)
#[derive(Accounts)]
pub struct GrantRoleNoSigner<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: Account to grant role to - does not need to sign
    pub account_to_grant: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

/// Grant a role without requiring the recipient's signature
/// Only admin can use this instruction (for emergencies, automated onboarding)
pub fn grant_role_no_signer(ctx: Context<GrantRoleNoSigner>, role: String) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let admin = ctx.accounts.admin.key();
    let account_to_grant = ctx.accounts.account_to_grant.key();

    // Check if role already granted
    match role.as_str() {
        crate::FABRICANTE_ROLE if config.fabricante == account_to_grant => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        crate::AUDITOR_HW_ROLE if config.auditor_hw == account_to_grant => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        crate::TECNICO_SW_ROLE if config.tecnico_sw == account_to_grant => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        crate::ESCUELA_ROLE if config.escuela == account_to_grant => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        _ => {}
    }

    // Store role authority
    match role.as_str() {
        crate::FABRICANTE_ROLE => config.fabricante = account_to_grant,
        crate::AUDITOR_HW_ROLE => config.auditor_hw = account_to_grant,
        crate::TECNICO_SW_ROLE => config.tecnico_sw = account_to_grant,
        crate::ESCUELA_ROLE => config.escuela = account_to_grant,
        _ => return Err(crate::SupplyChainError::RoleNotFound.into()),
    }

    let timestamp = Clock::get()?.unix_timestamp as u64;
    emit!(RoleGranted {
        role,
        account: account_to_grant,
        admin,
        timestamp,
    });
    Ok(())
}
