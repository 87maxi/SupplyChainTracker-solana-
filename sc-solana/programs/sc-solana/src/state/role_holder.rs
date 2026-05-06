//! RoleHolder account structure

use anchor_lang::prelude::*;

/// Role holder account - stores individual role assignments for multiple holders per role
#[account]
#[derive(Debug)]
pub struct RoleHolder {
    pub id: u64,
    pub account: Pubkey,
    pub role: String,       // max 64 chars
    pub granted_by: Pubkey,
    pub timestamp: u64,
}

impl RoleHolder {
    pub const INIT_SPACE: usize = 8
        + 8   // id (u64)
        + 32  // account (Pubkey)
        + 4 + 64  // role (bounded string, max 64 chars)
        + 32  // granted_by (Pubkey)
        + 8;  // timestamp (u64)
    // Total: 8 + 152 = 160 bytes
}
