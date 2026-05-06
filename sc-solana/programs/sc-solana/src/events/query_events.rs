//! Query-related events

use anchor_lang::prelude::*;

#[event]
pub struct NetbookStateQuery {
    pub serial_number: String,
    pub state: u8,
    pub token_id: u64,
    pub exists: bool,
}

#[event]
pub struct ConfigQuery {
    pub admin: Pubkey,
    pub fabricante: Pubkey,
    pub auditor_hw: Pubkey,
    pub tecnico_sw: Pubkey,
    pub escuela: Pubkey,
    pub next_token_id: u64,
    pub total_netbooks: u64,
    pub role_requests_count: u64,
    // Role holder counts
    pub fabricante_count: u64,
    pub auditor_hw_count: u64,
    pub tecnico_sw_count: u64,
    pub escuela_count: u64,
}

#[event]
pub struct RoleQuery {
    pub account: Pubkey,
    pub role: String,
    pub has_role: bool,
}
