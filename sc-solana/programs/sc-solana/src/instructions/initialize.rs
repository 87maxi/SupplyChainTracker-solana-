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
        payer = funder,
        space = SupplyChainConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(
        init,
        payer = funder,
        space = SerialHashRegistry::INIT_SPACE,
        seeds = [b"serial_hashes", config.key().as_ref()],
        bump
    )]
    pub serial_hash_registry: Account<'info, SerialHashRegistry>,
    /// Admin PDA - derived from config key using seeds [b"admin", config.key()]
    /// CHECK: This PDA will be set as admin once config is initialized
    #[account(
        seeds = [b"admin", config.key().as_ref()],
        bump
    )]
    pub admin: UncheckedAccount<'info>,
    /// Deployer PDA - provides funds for rent exemption
    #[account(
        mut,
        seeds = [DEPLOYER_SEED],
        bump
    )]
    pub deployer: Account<'info, DeployerState>,
    /// External wallet that funds the account creation
    #[account(mut)]
    pub funder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Initialize the supply chain configuration with PDA-based admin and deployer
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    // Derive admin PDA key and bump seed BEFORE mutating config
    let config_key = ctx.accounts.config.key();
    let (admin_pda_key, admin_pda_bump) = Pubkey::find_program_address(
        &[b"admin", config_key.as_ref()],
        ctx.program_id,
    );

    let config = &mut ctx.accounts.config;
    config.admin = admin_pda_key;
    config.admin_pda_bump = admin_pda_bump;
    config.fabricante = ctx.accounts.funder.key();
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
