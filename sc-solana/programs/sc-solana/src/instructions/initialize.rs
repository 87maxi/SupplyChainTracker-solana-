//! Initialize instruction
//!
//! This instruction initializes the supply chain configuration using the Deployer PDA
//! as the payer for account creation. All accounts are now PDA-derivable from the IDL,
//! making this instruction fully compatible with Surfpool/txtx runbooks using
//! `program_idl + instruction_name` encoding.
//!
//! Flow:
//! 1. Fund deployer PDA via `fund_deployer` instruction (external wallet)
//! 2. Call `initialize` with deployer PDA as payer (all PDAs, IDL-derivable)
//! 3. Surfpool runbook can now use `program_idl + instruction_name`

use anchor_lang::prelude::*;
use crate::state::{SupplyChainConfig, SerialHashRegistry, MAX_SERIAL_HASHES};
use crate::instructions::deployer::{DeployerState, DEPLOYER_SEED};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = deployer,
        space = SupplyChainConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(
        init,
        payer = deployer,
        space = SerialHashRegistry::INIT_SPACE,
        seeds = [b"serial_hashes", config.key().as_ref()],
        bump
    )]
    pub serial_hash_registry: Account<'info, SerialHashRegistry>,
    /// CHECK: Admin PDA - derived from config key using seeds [b"admin", config.key()]
    #[account(
        seeds = [b"admin", config.key().as_ref()],
        bump
    )]
    pub admin: Signer<'info>,
    /// Deployer PDA - funded payer for account creation
    #[account(
        mut,
        signer,
        seeds = [DEPLOYER_SEED],
        bump
    )]
    pub deployer: Account<'info, DeployerState>,
    pub system_program: Program<'info, System>,
}

/// Initialize the supply chain configuration with PDA-based admin and deployer
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let config = &mut ctx.accounts.config;

    // Set admin to the PDA key (not the initializer)
    config.admin = ctx.accounts.admin.key();
    config.fabricante = ctx.accounts.admin.key();
    config.auditor_hw = Pubkey::default();
    config.tecnico_sw = Pubkey::default();
    config.escuela = Pubkey::default();
    config.admin_bump = ctx.bumps.config;
    config.admin_pda_bump = ctx.bumps.admin;
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
