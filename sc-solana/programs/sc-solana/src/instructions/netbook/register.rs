//! RegisterNetbook instruction context

use crate::events::NetbookRegistered;
use crate::state::{Netbook, NetbookState, SerialHashRegistry, SupplyChainConfig};
use anchor_lang::prelude::*;

/// Register a single netbook with PDA based on token_id
/// Uses config.next_token_id as part of PDA seed to ensure unique PDAs per netbook
#[derive(Accounts)]
pub struct RegisterNetbook<'info> {
    #[account(mut)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(mut)]
    pub serial_hash_registry: Account<'info, SerialHashRegistry>,
    #[account(
        mut,
        constraint = config.fabricante == manufacturer.key() @ crate::errors::SupplyChainError::Unauthorized
    )]
    pub manufacturer: Signer<'info>,
    #[account(
        init,
        payer = manufacturer,
        space = Netbook::INIT_SPACE,
        seeds = [b"netbook", config.next_token_id.to_le_bytes().as_ref()],
        bump
    )]
    pub netbook: Account<'info, Netbook>,
    pub system_program: Program<'info, System>,
}

/// Register a single netbook with PDA based on token_id
pub fn register_netbook(
    ctx: Context<RegisterNetbook>,
    serial_number: String,
    batch_id: String,
    initial_model_specs: String,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    let serial_registry = &mut ctx.accounts.serial_hash_registry;
    let _manufacturer = ctx.accounts.manufacturer.key();

    // Validate input lengths
    if serial_number.is_empty() {
        return Err(crate::SupplyChainError::EmptySerial.into());
    }
    if serial_number.len() > 200 {
        return Err(crate::SupplyChainError::StringTooLong.into());
    }
    if batch_id.len() > 100 {
        return Err(crate::SupplyChainError::StringTooLong.into());
    }
    if initial_model_specs.len() > 500 {
        return Err(crate::SupplyChainError::StringTooLong.into());
    }

    // Compute serial hash and check for duplicates
    let mut serial_hash = [0u8; 32];
    let serial_bytes = serial_number.as_bytes();
    if serial_bytes.len() <= 32 {
        for (i, byte) in serial_bytes.iter().enumerate() {
            serial_hash[i] = *byte;
        }
    } else {
        serial_hash[..16].copy_from_slice(&serial_bytes[..16]);
        serial_hash[16..].copy_from_slice(&serial_bytes[serial_bytes.len() - 16..]);
    }

    if serial_registry.is_serial_registered(&serial_hash) {
        return Err(crate::SupplyChainError::DuplicateSerial.into());
    }

    // Store serial hash
    serial_registry.store_serial_hash(&serial_hash)?;

    // Get next token ID and increment counter
    let token_id = config.next_token_id;
    config.next_token_id += 1;
    config.total_netbooks += 1;

    // Initialize netbook account
    let netbook = &mut ctx.accounts.netbook;
    netbook.serial_number = serial_number.clone();
    netbook.batch_id = batch_id.clone();

    netbook.initial_model_specs = initial_model_specs;
    netbook.hw_auditor = Pubkey::default();
    netbook.hw_integrity_passed = false;
    netbook.hw_report_hash = [0u8; 32];
    netbook.sw_technician = Pubkey::default();
    netbook.os_version = String::default();
    netbook.sw_validation_passed = false;
    netbook.destination_school_hash = [0u8; 32];
    netbook.student_id_hash = [0u8; 32];
    netbook.distribution_timestamp = 0;
    netbook.state = NetbookState::Fabricada as u8;

    netbook.exists = true;
    netbook.token_id = token_id;

    emit!(NetbookRegistered {
        serial_number,
        batch_id,
        token_id,
    });
    Ok(())
}
