//! Role-related events

use anchor_lang::prelude::*;

#[event]
pub struct RoleRequested {
    pub id: u64,
    pub user: Pubkey,
    pub role: String,
}

#[event]
pub struct RoleRequestUpdated {
    pub id: u64,
    pub status: u8,
}

#[event]
pub struct RoleGranted {
    pub role: String,
    pub account: Pubkey,
    pub admin: Pubkey,
    pub timestamp: u64,
}

#[event]
pub struct RoleRevoked {
    pub role: String,
    pub account: Pubkey,
}

#[event]
pub struct RoleHolderAdded {
    pub role: String,
    pub account: Pubkey,
    pub admin: Pubkey,
    pub timestamp: u64,
}

#[event]
pub struct RoleHolderRemoved {
    pub role: String,
    pub account: Pubkey,
    pub admin: Pubkey,
    pub timestamp: u64,
}
