//! QueryRole instruction context

use crate::events::RoleQuery;
use crate::state::SupplyChainConfig;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct QueryRole<'info> {
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, SupplyChainConfig>,
    /// CHECK: This account is only read for role checking, not mutated
    pub account_to_check: UncheckedAccount<'info>,
}

/// Check if an account has a specific role (view function)
pub fn query_role(ctx: Context<QueryRole>, role: String) -> Result<()> {
    let config = &ctx.accounts.config;
    let account = ctx.accounts.account_to_check.key();
    let has_role = config.has_role(&role, &account);
    emit!(RoleQuery {
        account,
        role,
        has_role,
    });
    Ok(())
}
