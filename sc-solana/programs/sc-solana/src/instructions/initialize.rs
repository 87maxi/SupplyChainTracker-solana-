//! Initialize instruction

use anchor_lang::prelude::*;
use crate::state::{SupplyChainConfig, SerialHashRegistry, MAX_SERIAL_HASHES};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = SupplyChainConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(
        init,
        payer = admin,
        space = SerialHashRegistry::INIT_SPACE,
        seeds = [b"serial_hashes", config.key().as_ref()],
        bump
    )]
    pub serial_hash_registry: Account<'info, SerialHashRegistry>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Initialize the supply chain configuration
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.fabricante = ctx.accounts.admin.key();
    config.auditor_hw = Pubkey::default();
    config.tecnico_sw = Pubkey::default();
    config.escuela = Pubkey::default();
    config.admin_bump = ctx.bumps.config;
    config.next_token_id = 1;
    config.total_netbooks = 0;
    config.role_requests_count = 0;
    // Initialize role holder counts
    config.fabricante_count = 0;
    config.auditor_hw_count = 0;
    config.tecnico_sw_count = 0;
    config.escuela_count = 0;
    
    // Initialize serial hash registry
    let serial_registry = &mut ctx.accounts.serial_hash_registry;
    serial_registry.config_bump = ctx.bumps.serial_hash_registry;
    serial_registry.serial_hash_count = 0;
    for i in 0..MAX_SERIAL_HASHES {
        serial_registry.registered_serial_hashes[i] = [0u8; 32];
    }
    Ok(())
}
