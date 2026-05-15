//! SupplyChainConfig account structure

use super::{AUDITOR_HW_ROLE, ESCUELA_ROLE, FABRICANTE_ROLE, TECNICO_SW_ROLE};
use anchor_lang::prelude::*;

/// Configuration account for the supply chain
/// Updated for multiple role holders per role
/// Note: Serial hash tracking moved to separate SerialHashRegistry account
#[account]
#[derive(Debug)]
pub struct SupplyChainConfig {
    pub admin: Pubkey,
    /// Deployer wallet address - the actual wallet that signed initialization (can act as ADMIN)
    pub deployer: Pubkey,
    // Legacy single-role fields maintained for backward compatibility
    pub fabricante: Pubkey,
    pub auditor_hw: Pubkey,
    pub tecnico_sw: Pubkey,
    pub escuela: Pubkey,
    pub admin_bump: u8,     // Bump seed for config PDA (seeds = [b"config"])
    pub admin_pda_bump: u8, // Bump seed for admin PDA (seeds = [b"admin", config.key()])
    pub next_token_id: u64,
    pub total_netbooks: u64,
    pub role_requests_count: u64,
    // New: Role holder counts per role type
    pub fabricante_count: u64,
    pub auditor_hw_count: u64,
    pub tecnico_sw_count: u64,
    pub escuela_count: u64,
}

impl SupplyChainConfig {
    pub const INIT_SPACE: usize = 8
        + 32  // admin
        + 32  // deployer (wallet address that can act as ADMIN)
        + 32  // fabricante
        + 32  // auditor_hw
        + 32  // tecnico_sw
        + 32  // escuela
        + 1   // admin_bump
        + 1   // admin_pda_bump (for admin PDA derivation)
        + 8   // next_token_id
        + 8   // total_netbooks
        + 8   // role_requests_count
        + 8   // fabricante_count
        + 8   // auditor_hw_count
        + 8   // tecnico_sw_count
        + 8; // escuela_count
              // Total: 8 + 313 = 321 bytes
}

impl SupplyChainConfig {
    /// Check if an account has a specific role (supports multiple holders)
    pub fn has_role(&self, role_type: &str, account: &Pubkey) -> bool {
        match role_type {
            FABRICANTE_ROLE => self.fabricante == *account,
            AUDITOR_HW_ROLE => self.auditor_hw == *account,
            TECNICO_SW_ROLE => self.tecnico_sw == *account,
            ESCUELA_ROLE => self.escuela == *account,
            _ => false,
        }
    }

    /// Get the role holder count for a specific role type
    pub fn get_role_holder_count(&self, role_type: &str) -> u64 {
        match role_type {
            FABRICANTE_ROLE => self.fabricante_count,
            AUDITOR_HW_ROLE => self.auditor_hw_count,
            TECNICO_SW_ROLE => self.tecnico_sw_count,
            ESCUELA_ROLE => self.escuela_count,
            _ => 0,
        }
    }
}
