//! Netbook-related events

use anchor_lang::prelude::*;

#[event]
pub struct NetbookRegistered {
    pub serial_number: String,
    pub batch_id: String,
    pub token_id: u64,
}

#[event]
pub struct HardwareAudited {
    pub serial_number: String,
    pub passed: bool,
}

#[event]
pub struct SoftwareValidated {
    pub serial_number: String,
    pub os_version: String,
    pub passed: bool,
}

#[event]
pub struct NetbookAssigned {
    pub serial_number: String,
}

#[event]
pub struct NetbooksRegistered {
    pub count: u64,
    pub start_token_id: u64,
    pub timestamp: u64,
}
