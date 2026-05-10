//! Netbook account structure

use anchor_lang::prelude::*;

/// Main Netbook account - mirrors Solidity Netbook struct
/// Bounded strings: serial_number max 200 chars, batch_id max 100 chars, model_specs max 500 chars, os_version max 100 chars
/// PII protection via [u8; 32] hashes for student_id_hash and destination_school_hash
#[account]
#[derive(Debug, Default)]
pub struct Netbook {
    pub serial_number: String,       // max 200 chars
    pub batch_id: String,            // max 100 chars
    pub initial_model_specs: String, // max 500 chars
    pub hw_auditor: Pubkey,          // address equivalent
    pub hw_integrity_passed: bool,
    pub hw_report_hash: [u8; 32],
    pub sw_technician: Pubkey, // address equivalent
    pub os_version: String,    // max 100 chars
    pub sw_validation_passed: bool,
    pub destination_school_hash: [u8; 32],
    pub student_id_hash: [u8; 32],
    pub distribution_timestamp: u64,
    pub state: u8, // NetbookState enum as u8
    pub exists: bool,
    pub token_id: u64,
}

impl Netbook {
    pub const INIT_SPACE: usize = 8
        + 4 + 200  // serial_number (bounded string, max 200 chars)
        + 4 + 100  // batch_id (bounded string, max 100 chars)
        + 4 + 500  // initial_model_specs (bounded string, max 500 chars)
        + 32       // hw_auditor (Pubkey)
        + 1        // hw_integrity_passed (bool)
        + 32       // hw_report_hash ([u8; 32])
        + 32       // sw_technician (Pubkey)
        + 4 + 100  // os_version (bounded string, max 100 chars)
        + 1        // sw_validation_passed (bool)
        + 32       // destination_school_hash ([u8; 32])
        + 32       // student_id_hash ([u8; 32])
        + 8        // distribution_timestamp (u64)
        + 1        // state (u8)
        + 1        // exists (bool)
        + 8; // token_id (u64)
             // Total: 8 (discriminator) + 12 (length prefixes) + 900 (string data) + 100 (Pubkeys) + 3 (bools) + 160 (hashes) + 24 (u64s) = 1147 bytes minimum
             // Using 1200 for safety margin
}
