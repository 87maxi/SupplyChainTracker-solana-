//! RegisterNetbooksBatch instruction context

use crate::events::NetbooksRegistered;
use crate::state::{SerialHashRegistry, SupplyChainConfig, MAX_BATCH_SIZE};
use anchor_lang::prelude::*;
use sha2::{Digest, Sha256};

/// Compute a cryptographic SHA-256 hash of the serial number
fn compute_serial_hash(serial_number: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(serial_number.as_bytes());
    hasher.finalize().into()
}

/// Batch register netbooks (creates individual PDAs via individual calls)
#[derive(Accounts)]
pub struct RegisterNetbooksBatch<'info> {
    #[account(mut)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(mut)]
    pub serial_hash_registry: AccountLoader<'info, SerialHashRegistry>,
    #[account(
        mut,
        constraint = config.fabricante == manufacturer.key() @ crate::errors::SupplyChainError::Unauthorized
    )]
    pub manufacturer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Batch register netbooks (validates and stores serial hashes for duplicate detection)
/// Note: Individual netbook PDAs should be created via register_netbook() calls
pub fn register_netbooks_batch(
    ctx: Context<RegisterNetbooksBatch>,
    serial_numbers: Vec<String>,
    batch_ids: Vec<String>,
    model_specs: Vec<String>,
) -> Result<()> {
    // Validate array lengths

    if serial_numbers.len() != batch_ids.len() {
        return Err(crate::SupplyChainError::ArrayLengthMismatch.into());
    }
    if serial_numbers.len() != model_specs.len() {
        return Err(crate::SupplyChainError::ArrayLengthMismatch.into());
    }

    let count = serial_numbers.len() as u64;
    if count == 0 || count > MAX_BATCH_SIZE as u64 {
        return Err(crate::SupplyChainError::InvalidInput.into());
    }

    let config = &mut ctx.accounts.config;
    let serial_registry = &mut ctx.accounts.serial_hash_registry.load_mut()?;
    let start_token_id = config.next_token_id;
    let timestamp = Clock::get()?.unix_timestamp as u64;

    // Validate all inputs and check for duplicates before processing
    for i in 0..count {
        let serial = &serial_numbers[i as usize];
        let batch = &batch_ids[i as usize];
        let specs = &model_specs[i as usize];

        if serial.is_empty() {
            return Err(crate::SupplyChainError::EmptySerial.into());
        }
        if serial.len() > 200 {
            return Err(crate::SupplyChainError::StringTooLong.into());
        }
        if batch.len() > 100 {
            return Err(crate::SupplyChainError::StringTooLong.into());
        }
        if specs.len() > 500 {
            return Err(crate::SupplyChainError::StringTooLong.into());
        }

        // Check for duplicate serial number using cryptographic hash
        let serial_hash = compute_serial_hash(serial);

        if serial_registry.is_serial_registered(&serial_hash) {
            return Err(crate::SupplyChainError::DuplicateSerial.into());
        }
    }

    // Store batch serial hashes for duplicate detection
    for i in 0..count {
        let serial = &serial_numbers[i as usize];
        let serial_hash = compute_serial_hash(serial);
        serial_registry.store_serial_hash(&serial_hash)?;
    }

    // Update config counters with overflow protection
    config.next_token_id = config
        .next_token_id
        .checked_add(count)
        .ok_or(crate::SupplyChainError::InvalidInput)?;
    config.total_netbooks = config
        .total_netbooks
        .checked_add(count)
        .ok_or(crate::SupplyChainError::InvalidInput)?;

    emit!(NetbooksRegistered {
        count,
        start_token_id,
        timestamp,
    });

    Ok(())
}
