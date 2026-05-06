//! AddRoleHolder instruction context

use anchor_lang::prelude::*;
use crate::state::{SupplyChainConfig, RoleHolder};
use crate::events::RoleHolderAdded;


/// Add a role holder (multiple role holders per role)
#[derive(Accounts)]
pub struct AddRoleHolder<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = RoleHolder::INIT_SPACE,
        seeds = [b"role_holder", account_to_add.key().as_ref()],
        bump
    )]
    pub role_holder: Account<'info, RoleHolder>,
    /// CHECK: Account being added to the role (validated via constraint in handler)
    pub account_to_add: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

/// Add a role holder (multiple role holders per role)
pub fn add_role_holder(ctx: Context<AddRoleHolder>, role: String) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let admin = ctx.accounts.admin.key();
    let account_to_add = ctx.accounts.account_to_add.key();

    // Validate role type
    let role_type = role.as_str();
    match role_type {
        crate::FABRICANTE_ROLE | crate::AUDITOR_HW_ROLE | crate::TECNICO_SW_ROLE | crate::ESCUELA_ROLE => {},
        _ => return Err(crate::SupplyChainError::RoleNotFound.into()),
    }

    // Check if account already has this role (as legacy single holder)
    match role_type {
        crate::FABRICANTE_ROLE if config.fabricante == account_to_add => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        crate::AUDITOR_HW_ROLE if config.auditor_hw == account_to_add => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        crate::TECNICO_SW_ROLE if config.tecnico_sw == account_to_add => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        crate::ESCUELA_ROLE if config.escuela == account_to_add => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        _ => {}
    }

    // Check maximum role holders limit
    let current_count = config.get_role_holder_count(role_type);
    if current_count >= crate::MAX_ROLE_HOLDERS as u64 {
        return Err(crate::SupplyChainError::MaxRoleHoldersReached.into());
    }

    // Initialize role holder account
    let rh = &mut ctx.accounts.role_holder;
    rh.id = current_count + 1;
    rh.account = account_to_add;
    rh.role = role.clone();
    rh.granted_by = admin;
    rh.timestamp = Clock::get()?.unix_timestamp as u64;

    // Increment role holder count
    match role_type {
        crate::FABRICANTE_ROLE => config.fabricante_count += 1,
        crate::AUDITOR_HW_ROLE => config.auditor_hw_count += 1,
        crate::TECNICO_SW_ROLE => config.tecnico_sw_count += 1,
        crate::ESCUELA_ROLE => config.escuela_count += 1,
        _ => unreachable!(),
    }

    emit!(RoleHolderAdded {
        role,
        account: account_to_add,
        admin,
        timestamp: rh.timestamp,
    });
    Ok(())
}
