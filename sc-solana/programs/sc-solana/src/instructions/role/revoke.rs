//! RevokeRole instruction context

use anchor_lang::prelude::*;
use crate::state::SupplyChainConfig;
use crate::events::RoleRevoked;


#[derive(Accounts)]
pub struct RevokeRole<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub account_to_revoke: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Revoke a role from an account
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
