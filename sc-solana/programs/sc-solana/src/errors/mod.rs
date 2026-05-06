//! Error codes for SupplyChainTracker program

use anchor_lang::prelude::*;

#[error_code]
pub enum SupplyChainError {
    #[msg("Caller is not authorized")]
    Unauthorized = 6000,
    #[msg("Invalid state transition")]
    InvalidStateTransition = 6001,
    #[msg("Netbook not found")]
    NetbookNotFound = 6002,
    #[msg("Invalid input")]
    InvalidInput = 6003,
    #[msg("Serial number already registered")]
    DuplicateSerial = 6004,
    #[msg("Array lengths do not match")]
    ArrayLengthMismatch = 6005,
    #[msg("Role already granted to this account")]
    RoleAlreadyGranted = 6006,
    #[msg("Role not found")]
    RoleNotFound = 6007,
    #[msg("Invalid signature")]
    InvalidSignature = 6008,
    #[msg("Serial number is empty")]
    EmptySerial = 6009,
    #[msg("String exceeds maximum length")]
    StringTooLong = 6010,
    #[msg("Maximum role holders reached for this role")]
    MaxRoleHoldersReached = 6011,
    #[msg("Account not found in role holders list")]
    RoleHolderNotFound = 6012,
}
