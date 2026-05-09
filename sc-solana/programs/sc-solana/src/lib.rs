//! SupplyChainTracker - Solana/Anchor Implementation
//!
//! Migration from Ethereum (Solidity) to Solana (Anchor/Rust)
//! Program ID: 7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN
//!
//! # Module Structure
//!
//! This program uses glob re-exports (`pub use module::*`) for state, events,
//! instructions, and errors. This creates intentional ambiguity between modules
//! (e.g., `state::netbook` vs `instructions::netbook`) which is required for
//! Anchor's `#[program]` macro code generation. The ambiguity doesn't affect
//! runtime behavior as consumers use qualified paths.
#![allow(ambiguous_glob_reexports)]

use anchor_lang::prelude::*;

declare_id!("7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb");

// ==================== Constants ====================

/// Minimum time between role requests in seconds (60 seconds = 1 minute cooldown)
pub const ROLE_REQUEST_COOLDOWN: u64 = 60;

// ==================== Module Declarations ====================

pub mod state;
pub mod events;
pub mod instructions;
pub mod errors;

// ==================== Re-exports ====================
// Note: Glob re-exports create ambiguity between modules (e.g., state::netbook vs instructions::netbook)
// This is required for Anchor's #[program] macro to generate client accounts code correctly.
// The ambiguity is between module paths (state::netbook vs instructions::netbook) which don't
// conflict in practice since consumers use qualified paths. Removing this would require
// restructuring the entire module hierarchy, breaking the Anchor codegen pattern.
pub use state::*;
pub use events::*;
pub use instructions::*;
pub use errors::*;

// ==================== Program Module ====================

#[program]
pub mod sc_solana {
    use super::*;

    pub fn fund_deployer(ctx: Context<FundDeployer>, amount: u64) -> Result<()> {
        instructions::deployer::fund_deployer(ctx, amount)
    }

    pub fn close_deployer(ctx: Context<CloseDeployer>) -> Result<()> {
        instructions::deployer::close_deployer(ctx)
    }

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::initialize(ctx)
    }

    // NOTE (Issue #141): grant_role_no_signer removed - roles without recipient
    // signature are no longer allowed. grant_role maintained for admin-initiated
    // assignments with recipient consent (both admin PDA and recipient must sign).
    // Preferred flow: request_role → approve_role_request
    pub fn grant_role(ctx: Context<GrantRole>, role: String) -> Result<()> {
        instructions::role::grant::grant_role(ctx, role)
    }

    pub fn revoke_role(ctx: Context<RevokeRole>, role: String) -> Result<()> {
        instructions::role::revoke::revoke_role(ctx, role)
    }

    pub fn request_role(ctx: Context<RequestRole>, role: String) -> Result<()> {
        instructions::role::request::request_role(ctx, role)
    }

    pub fn approve_role_request(ctx: Context<ApproveRoleRequest>) -> Result<()> {
        instructions::role::request::approve_role_request(ctx)
    }

    pub fn reject_role_request(ctx: Context<RejectRoleRequest>) -> Result<()> {
        instructions::role::request::reject_role_request(ctx)
    }

    pub fn reset_role_request(ctx: Context<ResetRoleRequest>) -> Result<()> {
        instructions::role::request::reset_role_request(ctx)
    }

    pub fn add_role_holder(ctx: Context<AddRoleHolder>, role: String) -> Result<()> {
        instructions::role::holder_add::add_role_holder(ctx, role)
    }

    pub fn remove_role_holder(ctx: Context<RemoveRoleHolder>, role: String) -> Result<()> {
        instructions::role::holder_remove::remove_role_holder(ctx, role)
    }

    pub fn close_role_holder(ctx: Context<CloseRoleHolder>, role: String) -> Result<()> {
        instructions::role::revoke::close_role_holder(ctx, role)
    }

    pub fn transfer_admin(ctx: Context<TransferAdmin>) -> Result<()> {
        instructions::role::transfer_admin::transfer_admin(ctx)
    }

    pub fn register_netbook(
        ctx: Context<RegisterNetbook>,
        serial_number: String,
        batch_id: String,
        initial_model_specs: String,
    ) -> Result<()> {
        instructions::netbook::register::register_netbook(ctx, serial_number, batch_id, initial_model_specs)
    }

    pub fn register_netbooks_batch(
        ctx: Context<RegisterNetbooksBatch>,
        serial_numbers: Vec<String>,
        batch_ids: Vec<String>,
        model_specs: Vec<String>,
    ) -> Result<()> {
        instructions::netbook::register_batch::register_netbooks_batch(ctx, serial_numbers, batch_ids, model_specs)
    }

    pub fn audit_hardware(
        ctx: Context<AuditHardware>,
        serial: String,
        passed: bool,
        report_hash: [u8; 32],
    ) -> Result<()> {
        instructions::netbook::audit::audit_hardware(ctx, serial, passed, report_hash)
    }

    pub fn validate_software(
        ctx: Context<ValidateSoftware>,
        serial: String,
        os_version: String,
        passed: bool,
    ) -> Result<()> {
        instructions::netbook::validate::validate_software(ctx, serial, os_version, passed)
    }

    pub fn assign_to_student(
        ctx: Context<AssignToStudent>,
        serial: String,
        school_hash: [u8; 32],
        student_hash: [u8; 32],
    ) -> Result<()> {
        instructions::netbook::assign::assign_to_student(ctx, serial, school_hash, student_hash)
    }

    pub fn query_netbook_state(ctx: Context<QueryNetbookState>, _serial: String) -> Result<()> {
        instructions::query::netbook_state::query_netbook_state(ctx, _serial)
    }

    pub fn query_config(ctx: Context<QueryConfig>) -> Result<()> {
        instructions::query::config::query_config(ctx)
    }

    pub fn query_role(ctx: Context<QueryRole>, role: String) -> Result<()> {
        instructions::query::role::query_role(ctx, role)
    }
}

// ==================== Tests ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_netbook_space() {
        assert_eq!(Netbook::INIT_SPACE, 8 + 4 + 200 + 4 + 100 + 4 + 500 + 32 + 1 + 32 + 32 + 4 + 100 + 1 + 32 + 32 + 8 + 1 + 1 + 8);
    }

    #[test]
    fn test_netbook_states() {
        assert_eq!(NetbookState::Fabricada as u8, 0);
        assert_eq!(NetbookState::HwAprobado as u8, 1);
        assert_eq!(NetbookState::SwValidado as u8, 2);
        assert_eq!(NetbookState::Distribuida as u8, 3);
    }

    #[test]
    fn test_request_status() {
        assert_eq!(RequestStatus::Pending as u8, 0);
        assert_eq!(RequestStatus::Approved as u8, 1);
        assert_eq!(RequestStatus::Rejected as u8, 2);
    }

    #[test]
    fn test_error_codes() {
        assert_eq!(SupplyChainError::Unauthorized as u32, 6000);
        assert_eq!(SupplyChainError::InvalidStateTransition as u32, 6001);
        assert_eq!(SupplyChainError::NetbookNotFound as u32, 6002);
        assert_eq!(SupplyChainError::InvalidRequestState as u32, 6013);
    }

    #[test]
    fn test_config_space() {
        // Updated: Added admin_pda_bump (1 byte)
        assert_eq!(SupplyChainConfig::INIT_SPACE, 8 + 32 + 32 + 32 + 32 + 32 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 8);
    }

    #[test]
    fn test_role_holder_space() {
        assert_eq!(RoleHolder::INIT_SPACE, 8 + 8 + 32 + 4 + 64 + 32 + 8);
    }



    #[test]
    fn test_role_holder_counts() {
        // Updated: Added admin_pda_bump field
        let config = SupplyChainConfig {
            admin: Pubkey::default(),
            fabricante: Pubkey::default(),
            auditor_hw: Pubkey::default(),
            tecnico_sw: Pubkey::default(),
            escuela: Pubkey::default(),
            admin_bump: 0,
            admin_pda_bump: 0, // NEW: PDA bump for admin derivation
            next_token_id: 0,
            total_netbooks: 0,
            role_requests_count: 0,
            fabricante_count: 0,
            auditor_hw_count: 0,
            tecnico_sw_count: 0,
            escuela_count: 0,
        };
        assert_eq!(config.get_role_holder_count("FABRICANTE"), 0);
        assert_eq!(config.get_role_holder_count("AUDITOR_HW"), 0);
    }


    #[test]
    fn test_max_role_holders() {
        assert_eq!(MAX_ROLE_HOLDERS, 100);
    }
}
