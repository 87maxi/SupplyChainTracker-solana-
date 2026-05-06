//! QueryConfig instruction context

use anchor_lang::prelude::*;
use crate::state::SupplyChainConfig;
use crate::events::ConfigQuery;


#[derive(Accounts)]
pub struct QueryConfig<'info> {
    pub config: Account<'info, SupplyChainConfig>,
}

/// Query config data (view function for client-side data access)
pub fn query_config(ctx: Context<QueryConfig>) -> Result<()> {
    let config = &ctx.accounts.config;
    emit!(ConfigQuery {
        admin: config.admin,
        fabricante: config.fabricante,
        auditor_hw: config.auditor_hw,
        tecnico_sw: config.tecnico_sw,
        escuela: config.escuela,
        next_token_id: config.next_token_id,
        total_netbooks: config.total_netbooks,
        role_requests_count: config.role_requests_count,
        // Role holder counts
        fabricante_count: config.fabricante_count,
        auditor_hw_count: config.auditor_hw_count,
        tecnico_sw_count: config.tecnico_sw_count,
        escuela_count: config.escuela_count,
    });
    Ok(())
}
