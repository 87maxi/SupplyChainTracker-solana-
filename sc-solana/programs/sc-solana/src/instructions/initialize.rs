//! Initialize instruction
//!
//! This instruction initializes the supply chain configuration with PDA-based admin.
//! The admin account is derived as a PDA with seeds [b"admin", config.key()] to ensure
//! consistency with Solana/PDA patterns and compatibility with Surfpool/txtx runbooks.

use anchor_lang::prelude::*;
use crate::state::{SupplyChainConfig, SerialHashRegistry, MAX_SERIAL_HASHES};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = initializer,
        space = SupplyChainConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(
        init,
        payer = initializer,
        space = SerialHashRegistry::INIT_SPACE,
        seeds = [b"serial_hashes", config.key().as_ref()],
        bump
    )]
    pub serial_hash_registry: Account<'info, SerialHashRegistry>,
    /// CHECK: Admin PDA - derived from config key using seeds [b"admin", config.key()]
    /// This PDA pattern ensures consistency with Solana/PDA patterns and Surfpool compatibility
    #[account(
        seeds = [b"admin", config.key().as_ref()],
        bump
    )]
    pub admin: Signer<'info>,
    #[account(mut)]
    /// Initial signer who creates the config and admin PDAs
    pub initializer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Initialize the supply chain configuration with PDA-based admin
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    // Set admin to the PDA key (not the initializer)
    config.admin = ctx.accounts.admin.key();
    config.fabricante = ctx.accounts.admin.key();
    config.auditor_hw = Pubkey::default();
    config.tecnico_sw = Pubkey::default();
    config.escuela = Pubkey::default();
    config.admin_bump = ctx.bumps.config;
    config.admin_pda_bump = ctx.bumps.admin; // Store the admin PDA bump seed
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
