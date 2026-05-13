//! SerialHashRegistry account for duplicate detection
//!
//! NOTE: MAX_SERIAL_HASHES reduced from 1000 to 100 to fit within SBF stack limits (4KB).
//! The Anchor deserialization copies the entire account onto the program stack.
//! For production with 1000+ serials, migrate to zero_copy with flattened [u8; 32000] array.

use super::MAX_SERIAL_HASHES;
use crate::errors::SupplyChainError;
use anchor_lang::prelude::*;

/// Serial hash registry account for duplicate detection
/// Separate account to avoid stack overflow from large array in SupplyChainConfig
#[account]
#[derive(Debug)]
pub struct SerialHashRegistry {
    pub config_bump: u8,
    pub serial_hash_count: u64,
    pub registered_serial_hashes: [[u8; 32]; MAX_SERIAL_HASHES],
}

impl SerialHashRegistry {
    pub const INIT_SPACE: usize = 8
        + 1   // config_bump
        + 8   // serial_hash_count
        + 32 * MAX_SERIAL_HASHES; // registered_serial_hashes
                                  // Total: 8 + 1 + 8 + 3200 = 3217 bytes (fits SBF stack)
}

impl SerialHashRegistry {
    /// Check if a serial number hash is already registered
    pub fn is_serial_registered(&self, serial_hash: &[u8; 32]) -> bool {
        let count = self.serial_hash_count as usize;
        if count > MAX_SERIAL_HASHES {
            return false;
        }
        for i in 0..count {
            if self.registered_serial_hashes[i] == *serial_hash {
                return true;
            }
        }
        false
    }

    /// Store a serial number hash
    pub fn store_serial_hash(&mut self, serial_hash: &[u8; 32]) -> Result<()> {
        if self.serial_hash_count as usize >= MAX_SERIAL_HASHES {
            return Err(SupplyChainError::InvalidInput.into());
        }
        let idx = self.serial_hash_count as usize;
        self.registered_serial_hashes[idx] = *serial_hash;
        self.serial_hash_count += 1;
        Ok(())
    }
}
