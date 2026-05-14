//! SerialHashRegistry account for duplicate detection
//!
//! Uses zero_copy to avoid SBF stack overflow - the account data is memory-mapped
//! directly instead of being copied onto the program stack during deserialization.
//! Access via AccountLoader::load() / AccountLoader::load_mut().
//!
//! Manually implements bytemuck::Zeroable and bytemuck::Pod because auto-derive
//! has array size limitations (max ~37 elements).

use super::MAX_SERIAL_HASHES;
use crate::errors::SupplyChainError;
use anchor_lang::prelude::*;

/// Serial hash registry account for duplicate detection
/// Uses zero_copy to avoid stack overflow from large array
/// Access through AccountLoader<'info, SerialHashRegistry>
///
/// Field ordering is critical for zero_copy: u64 first for alignment,
/// then explicit padding, then flat byte array.
#[account(zero_copy)]
#[repr(C)]
pub struct SerialHashRegistry {
    pub serial_hash_count: u64,
    pub config_bump: u8,
    pub _padding: [u8; 7],
    /// Flat storage for serial hashes: each hash is 32 bytes at offset index * 32
    pub registered_serial_hashes: [u8; 32 * MAX_SERIAL_HASHES],
}

// Manual Debug impl (zero_copy doesn't auto-derive Debug for large structs)
impl std::fmt::Debug for SerialHashRegistry {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SerialHashRegistry")
            .field("serial_hash_count", &self.serial_hash_count)
            .field("config_bump", &self.config_bump)
            .field("registered_serial_hashes_len", &(32 * MAX_SERIAL_HASHES))
            .finish()
    }
}

impl SerialHashRegistry {
    pub const INIT_SPACE: usize = 8
        + 8   // serial_hash_count
        + 1   // config_bump
        + 7   // _padding (explicit padding for zero_copy alignment)
        + 32 * MAX_SERIAL_HASHES; // registered_serial_hashes (flat)
                                  // Total: 8 + 8 + 1 + 7 + 3200 = 3224 bytes
}

impl SerialHashRegistry {
    /// Get a reference to the serial hash at the given index
    fn get_hash_at(&self, index: usize) -> [u8; 32] {
        let start = index * 32;
        let mut hash = [0u8; 32];
        hash.copy_from_slice(&self.registered_serial_hashes[start..start + 32]);
        hash
    }

    /// Set the serial hash at the given index
    fn set_hash_at(&mut self, index: usize, hash: &[u8; 32]) {
        let start = index * 32;
        self.registered_serial_hashes[start..start + 32].copy_from_slice(hash);
    }

    /// Check if a serial number hash is already registered
    pub fn is_serial_registered(&self, serial_hash: &[u8; 32]) -> bool {
        let count = self.serial_hash_count as usize;
        if count > MAX_SERIAL_HASHES {
            return false;
        }
        for i in 0..count {
            if self.get_hash_at(i) == *serial_hash {
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
        self.set_hash_at(idx, serial_hash);
        self.serial_hash_count += 1;
        Ok(())
    }
}
