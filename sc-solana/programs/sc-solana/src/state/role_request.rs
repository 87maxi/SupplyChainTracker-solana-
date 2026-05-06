//! RoleRequest account structure

use anchor_lang::prelude::*;

/// Role request account
#[account]
#[derive(Debug)]
pub struct RoleRequest {
    pub id: u64,
    pub user: Pubkey,
    pub role: String,       // max 256 chars
    pub status: u8,
    pub timestamp: u64,
}
