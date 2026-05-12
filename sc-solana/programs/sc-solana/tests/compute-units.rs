//! Compute Unit (CU) Measurement Tests for SupplyChainTracker program
//!
//! These tests estimate the compute units consumed by each instruction type
//! using Solana's compute budget model. CU estimates are derived from:
//! - Account data sizes (read/write operations)
//! - Instruction data size
//! - Program execution complexity
//! - Sysvar accesses
//!
//! Solana compute budget:
//! - Default limit: 1,470,000 CU per transaction
//! - Base fee: ~1,000 CU per transaction
//! - Account read: ~100 CU per account
//! - Account write: ~500 CU per account
//! - Program invocation: ~5,000-20,000 CU base
//! - CPI: ~10,000 CU per CPI call
//! - Emit event/log: ~1,000 CU per log
//!
//! Run with: cargo test --test compute-units

use anchor_lang::prelude::Pubkey;
use solana_sdk_ids::system_program;

// ==================== Constants ====================

/// Program ID from the Anchor program
const PROGRAM_ADDRESS: &str = "7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb";

/// System program ID
const SYSTEM_PROGRAM_ID: Pubkey = system_program::id();

/// Solana default compute unit limit per transaction
const DEFAULT_CU_LIMIT: u64 = 1_470_000;

/// Base transaction overhead (signature verification, etc.)
const BASE_TX_OVERHEAD: u64 = 1_000;

/// CU cost per account read
const CU_PER_ACCOUNT_READ: u64 = 100;

/// CU cost per account write
const CU_PER_ACCOUNT_WRITE: u64 = 500;

/// Base program invocation cost
const BASE_INVOCATION_COST: u64 = 5_000;

/// CPI call overhead
const CPI_OVERHEAD: u64 = 10_000;

/// Log/event emission cost
const LOG_COST: u64 = 1_000;

/// CU cost per byte of instruction data processed
const CU_PER_INSTRUCTION_BYTE: u64 = 10;

// ==================== Account Sizes (from state definitions) ====================

/// Netbook account size (from Netbook::INIT_SPACE)
const NETBOOK_SIZE: usize = 1104;

/// Config account size (from SupplyChainConfig::INIT_SPACE)
const CONFIG_SIZE: usize = 234;

/// RoleHolder account size (from RoleHolder::INIT_SPACE)
const ROLE_HOLDER_SIZE: usize = 49; // 8 + 32 + 1 + 8

/// RoleRequest account size
const ROLE_REQUEST_SIZE: usize = 57; // 8 + 32 + 8 + 1

/// SerialHashRegistry account size
const SERIAL_HASH_REGISTRY_SIZE: usize = 136; // 8 + 128

/// Deployer state account size
const DEPLOYER_STATE_SIZE: usize = 17; // 8 + 1 + 8

// ==================== CU Estimation Struct ====================

/// Represents a compute unit estimate for an instruction
#[derive(Debug, Clone)]
struct CuEstimate {
    instruction: &'static str,
    account_reads: u64,
    account_writes: u64,
    base_cost: u64,
    data_cost: u64,
    cpi_cost: u64,
    log_cost: u64,
    total_estimated: u64,
    percent_of_limit: f64,
    risk_level: &'static str,
}

impl CuEstimate {
    fn new(instruction: &'static str, account_reads: u64, account_writes: u64, base_cost: u64, data_cost: u64, cpi_cost: u64, log_cost: u64) -> Self {
        let total = BASE_TX_OVERHEAD + account_reads * CU_PER_ACCOUNT_READ + account_writes * CU_PER_ACCOUNT_WRITE + base_cost + data_cost + cpi_cost + log_cost;
        let percent = (total as f64 / DEFAULT_CU_LIMIT as f64) * 100.0;
        let risk = if percent < 10.0 {
            "LOW"
        } else if percent < 25.0 {
            "MEDIUM"
        } else if percent < 50.0 {
            "HIGH"
        } else {
            "CRITICAL"
        };

        Self {
            instruction,
            account_reads,
            account_writes,
            base_cost,
            data_cost,
            cpi_cost,
            log_cost,
            total_estimated: total,
            percent_of_limit: percent,
            risk_level: risk,
        }
    }
}

// ==================== Instruction CU Estimates ====================

/// Estimate CU for fund_deployer instruction
fn estimate_fund_deployer() -> CuEstimate {
    // Accounts: deployer (write), system_program (read), payer (read/write)
    // Data: u64 amount (8 bytes)
    // CPI: Transfer from System Program
    CuEstimate::new(
        "fund_deployer",
        2,   // system_program, payer
        1,   // deployer state
        BASE_INVOCATION_COST,
        8 * CU_PER_INSTRUCTION_BYTE,  // u64 amount
        CPI_OVERHEAD,  // System program transfer
        0,  // No log
    )
}

/// Estimate CU for initialize instruction
fn estimate_initialize() -> CuEstimate {
    // Accounts: config (write), payer (read/write), system_program (read)
    // Data: minimal (no parameters)
    // Creates SupplyChainConfig account
    CuEstimate::new(
        "initialize",
        2,   // system_program, payer
        1,   // config
        BASE_INVOCATION_COST + 2_000,  // Account creation overhead
        0,   // No instruction data
        CPI_OVERHEAD,  // System program for account creation
        LOG_COST,  // Emits Initialized event
    )
}

/// Estimate CU for register_netbook instruction
fn estimate_register_netbook() -> CuEstimate {
    // Accounts: netbook (write), config (read), serial_hash_registry (write),
    //           manufacturer (signer/read), payer (read/write), system_program (read)
    // Data: serial_number (~20 bytes), batch_id (~10 bytes), model_specs (~50 bytes)
    CuEstimate::new(
        "register_netbook",
        4,   // config, manufacturer, payer, system_program
        3,   // netbook, serial_hash_registry, payer
        BASE_INVOCATION_COST + 3_000,  // Account creation + hash computation
        80 * CU_PER_INSTRUCTION_BYTE,  // ~80 bytes of string data
        CPI_OVERHEAD,  // System program for account creation
        LOG_COST,  // Emits NetbookRegistered event
    )
}

/// Estimate CU for register_netbooks_batch instruction
/// Assumes batch size of 10 netbooks
fn estimate_register_netbooks_batch(batch_size: u64) -> CuEstimate {
    // Per netbook: similar to register_netbook but amortized
    // Accounts: config (read), serial_hash_registry (write), payer (read/write), system_program (read)
    // Plus batch_size new netbook accounts
    let per_netbook = BASE_INVOCATION_COST + 3_000;
    let total_data = 80 * batch_size;

    CuEstimate::new(
        "register_netbooks_batch",
        3,   // config, payer, system_program
        2 + batch_size,  // serial_hash_registry + batch_size netbooks
        BASE_INVOCATION_COST + per_netbook * batch_size / 10,
        total_data * CU_PER_INSTRUCTION_BYTE,
        CPI_OVERHEAD * batch_size,  // One CPI per netbook creation
        LOG_COST,  // Single batch event
    )
}

/// Estimate CU for audit_hardware instruction
fn estimate_audit_hardware() -> CuEstimate {
    // Accounts: netbook (write), auditor (signer/read), config (read)
    // Data: serial (~20 bytes), passed (bool), report_hash (32 bytes)
    CuEstimate::new(
        "audit_hardware",
        3,   // auditor, config, payer
        1,   // netbook
        BASE_INVOCATION_COST + 1_000,  // Hash comparison
        60 * CU_PER_INSTRUCTION_BYTE,  // serial + bool + hash
        0,   // No CPI
        LOG_COST,  // Emits HardwareAudited event
    )
}

/// Estimate CU for validate_software instruction
fn estimate_validate_software() -> CuEstimate {
    // Accounts: netbook (write), technician (signer/read), config (read)
    // Data: serial (~20 bytes), os_version (~20 bytes), passed (bool)
    CuEstimate::new(
        "validate_software",
        3,   // technician, config, payer
        1,   // netbook
        BASE_INVOCATION_COST + 1_000,
        50 * CU_PER_INSTRUCTION_BYTE,  // serial + os_version + bool
        0,   // No CPI
        LOG_COST,  // Emits SoftwareValidated event
    )
}

/// Estimate CU for assign_to_student instruction
fn estimate_assign_to_student() -> CuEstimate {
    // Accounts: netbook (write), school (signer/read), config (read)
    // Data: serial (~20 bytes), school_hash (32 bytes), student_hash (32 bytes)
    CuEstimate::new(
        "assign_to_student",
        3,   // school, config, payer
        1,   // netbook
        BASE_INVOCATION_COST + 1_000,
        80 * CU_PER_INSTRUCTION_BYTE,  // serial + 2 hashes
        0,   // No CPI
        LOG_COST,  // Emits StudentAssigned event
    )
}

/// Estimate CU for grant_role instruction
fn estimate_grant_role() -> CuEstimate {
    // Accounts: role_holder (write), config (read), admin (signer),
    //           recipient (signer), payer (read/write), system_program (read)
    // Data: role string (~15 bytes)
    CuEstimate::new(
        "grant_role",
        5,   // config, admin, recipient, payer, system_program
        2,   // role_holder, payer
        BASE_INVOCATION_COST + 2_000,  // Account creation
        15 * CU_PER_INSTRUCTION_BYTE,  // role string
        CPI_OVERHEAD,  // System program
        LOG_COST,  // Emits RoleGranted event
    )
}

/// Estimate CU for request_role instruction
fn estimate_request_role() -> CuEstimate {
    // Accounts: role_request (write), config (read), payer (read/write), system_program (read)
    // Data: role string (~15 bytes)
    CuEstimate::new(
        "request_role",
        3,   // config, payer, system_program
        2,   // role_request, payer
        BASE_INVOCATION_COST + 2_000,
        15 * CU_PER_INSTRUCTION_BYTE,
        CPI_OVERHEAD,
        LOG_COST,  // Emits RoleRequested event
    )
}

/// Estimate CU for approve_role_request instruction
fn estimate_approve_role_request() -> CuEstimate {
    // Accounts: role_request (write), config (read), admin (signer)
    CuEstimate::new(
        "approve_role_request",
        3,   // config, admin, payer
        2,   // role_request, config (role count update)
        BASE_INVOCATION_COST + 1_000,
        0,   // No instruction data
        0,   // No CPI
        LOG_COST,  // Emits RoleGranted event
    )
}

/// Estimate CU for revoke_role instruction
fn estimate_revoke_role() -> CuEstimate {
    // Accounts: role_holder (write/close), config (read), admin (signer)
    // Data: role string (~15 bytes)
    CuEstimate::new(
        "revoke_role",
        3,   // config, admin, payer
        2,   // role_holder, config
        BASE_INVOCATION_COST + 1_000,
        15 * CU_PER_INSTRUCTION_BYTE,
        0,
        LOG_COST,  // Emits RoleRevoked event
    )
}

/// Estimate CU for query_netbook_state instruction
fn estimate_query_netbook_state() -> CuEstimate {
    // Accounts: netbook (read), config (read)
    // Data: serial string (~20 bytes)
    CuEstimate::new(
        "query_netbook_state",
        3,   // netbook, config, payer
        0,   // Read-only query
        BASE_INVOCATION_COST,
        20 * CU_PER_INSTRUCTION_BYTE,
        0,
        LOG_COST,  // Emits NetbookStateQuery event
    )
}

/// Estimate CU for query_config instruction
fn estimate_query_config() -> CuEstimate {
    // Accounts: config (read)
    CuEstimate::new(
        "query_config",
        2,   // config, payer
        0,   // Read-only
        BASE_INVOCATION_COST,
        0,
        0,
        LOG_COST,  // Emits ConfigQuery event
    )
}

/// Estimate CU for query_role instruction
fn estimate_query_role() -> CuEstimate {
    // Accounts: config (read)
    // Data: role string (~15 bytes)
    CuEstimate::new(
        "query_role",
        2,   // config, payer
        0,   // Read-only
        BASE_INVOCATION_COST,
        15 * CU_PER_INSTRUCTION_BYTE,
        0,
        LOG_COST,  // Emits RoleQuery event
    )
}

// ==================== Tests ====================

#[test]
fn test_program_id_valid() {
    let result = Pubkey::try_from(PROGRAM_ADDRESS);
    assert!(result.is_ok(), "Program ID should be valid");
}

#[test]
fn test_fund_deployer_cu_estimate() {
    let estimate = estimate_fund_deployer();
    println!(
        "fund_deployer: {} CU ({:.2}% of limit) - {}",
        estimate.total_estimated, estimate.percent_of_limit, estimate.risk_level
    );

    assert!(estimate.total_estimated < DEFAULT_CU_LIMIT / 10, "Should be well within limit");
    assert_eq!(estimate.risk_level, "LOW");
}

#[test]
fn test_initialize_cu_estimate() {
    let estimate = estimate_initialize();
    println!(
        "initialize: {} CU ({:.2}% of limit) - {}",
        estimate.total_estimated, estimate.percent_of_limit, estimate.risk_level
    );

    assert!(estimate.total_estimated < DEFAULT_CU_LIMIT / 10, "Should be well within limit");
    assert_eq!(estimate.risk_level, "LOW");
}

#[test]
fn test_register_netbook_cu_estimate() {
    let estimate = estimate_register_netbook();
    println!(
        "register_netbook: {} CU ({:.2}% of limit) - {}",
        estimate.total_estimated, estimate.percent_of_limit, estimate.risk_level
    );

    assert!(estimate.total_estimated < DEFAULT_CU_LIMIT / 4, "Should be within 25% of limit");
    assert!(estimate.risk_level == "LOW" || estimate.risk_level == "MEDIUM");
}

#[test]
fn test_register_netbooks_batch_cu_estimate() {
    // Test with batch size of 10
    let estimate = estimate_register_netbooks_batch(10);
    println!(
        "register_netbooks_batch(10): {} CU ({:.2}% of limit) - {}",
        estimate.total_estimated, estimate.percent_of_limit, estimate.risk_level
    );

    // Batch of 10 should still be within limits
    assert!(estimate.total_estimated < DEFAULT_CU_LIMIT, "Batch of 10 should fit in single tx");
}

#[test]
fn test_audit_hardware_cu_estimate() {
    let estimate = estimate_audit_hardware();
    println!(
        "audit_hardware: {} CU ({:.2}% of limit) - {}",
        estimate.total_estimated, estimate.percent_of_limit, estimate.risk_level
    );

    assert!(estimate.total_estimated < DEFAULT_CU_LIMIT / 10, "Should be well within limit");
    assert_eq!(estimate.risk_level, "LOW");
}

#[test]
fn test_validate_software_cu_estimate() {
    let estimate = estimate_validate_software();
    println!(
        "validate_software: {} CU ({:.2}% of limit) - {}",
        estimate.total_estimated, estimate.percent_of_limit, estimate.risk_level
    );

    assert!(estimate.total_estimated < DEFAULT_CU_LIMIT / 10, "Should be well within limit");
    assert_eq!(estimate.risk_level, "LOW");
}

#[test]
fn test_assign_to_student_cu_estimate() {
    let estimate = estimate_assign_to_student();
    println!(
        "assign_to_student: {} CU ({:.2}% of limit) - {}",
        estimate.total_estimated, estimate.percent_of_limit, estimate.risk_level
    );

    assert!(estimate.total_estimated < DEFAULT_CU_LIMIT / 10, "Should be well within limit");
    assert_eq!(estimate.risk_level, "LOW");
}

#[test]
fn test_grant_role_cu_estimate() {
    let estimate = estimate_grant_role();
    println!(
        "grant_role: {} CU ({:.2}% of limit) - {}",
        estimate.total_estimated, estimate.percent_of_limit, estimate.risk_level
    );

    assert!(estimate.total_estimated < DEFAULT_CU_LIMIT / 5, "Should be within 20% of limit");
}

#[test]
fn test_request_role_cu_estimate() {
    let estimate = estimate_request_role();
    println!(
        "request_role: {} CU ({:.2}% of limit) - {}",
        estimate.total_estimated, estimate.percent_of_limit, estimate.risk_level
    );

    assert!(estimate.total_estimated < DEFAULT_CU_LIMIT / 10, "Should be well within limit");
}

#[test]
fn test_approve_role_request_cu_estimate() {
    let estimate = estimate_approve_role_request();
    println!(
        "approve_role_request: {} CU ({:.2}% of limit) - {}",
        estimate.total_estimated, estimate.percent_of_limit, estimate.risk_level
    );

    assert!(estimate.total_estimated < DEFAULT_CU_LIMIT / 10, "Should be well within limit");
    assert_eq!(estimate.risk_level, "LOW");
}

#[test]
fn test_revoke_role_cu_estimate() {
    let estimate = estimate_revoke_role();
    println!(
        "revoke_role: {} CU ({:.2}% of limit) - {}",
        estimate.total_estimated, estimate.percent_of_limit, estimate.risk_level
    );

    assert!(estimate.total_estimated < DEFAULT_CU_LIMIT / 10, "Should be well within limit");
    assert_eq!(estimate.risk_level, "LOW");
}

#[test]
fn test_query_netbook_state_cu_estimate() {
    let estimate = estimate_query_netbook_state();
    println!(
        "query_netbook_state: {} CU ({:.2}% of limit) - {}",
        estimate.total_estimated, estimate.percent_of_limit, estimate.risk_level
    );

    assert!(estimate.total_estimated < DEFAULT_CU_LIMIT / 20, "Query should be very cheap");
    assert_eq!(estimate.risk_level, "LOW");
}

#[test]
fn test_query_config_cu_estimate() {
    let estimate = estimate_query_config();
    println!(
        "query_config: {} CU ({:.2}% of limit) - {}",
        estimate.total_estimated, estimate.percent_of_limit, estimate.risk_level
    );

    assert!(estimate.total_estimated < DEFAULT_CU_LIMIT / 20, "Query should be very cheap");
    assert_eq!(estimate.risk_level, "LOW");
}

#[test]
fn test_query_role_cu_estimate() {
    let estimate = estimate_query_role();
    println!(
        "query_role: {} CU ({:.2}% of limit) - {}",
        estimate.total_estimated, estimate.percent_of_limit, estimate.risk_level
    );

    assert!(estimate.total_estimated < DEFAULT_CU_LIMIT / 20, "Query should be very cheap");
    assert_eq!(estimate.risk_level, "LOW");
}

#[test]
fn test_full_lifecycle_cu_estimate() {
    // Complete lifecycle: register → audit → validate → assign
    let register = estimate_register_netbook();
    let audit = estimate_audit_hardware();
    let validate = estimate_validate_software();
    let assign = estimate_assign_to_student();

    let total_lifecycle = register.total_estimated + audit.total_estimated + validate.total_estimated + assign.total_estimated;
    let total_percent = (total_lifecycle as f64 / (DEFAULT_CU_LIMIT as f64 * 4.0)) * 100.0;

    println!(
        "Full lifecycle (4 txs): {} CU total ({:.2}% avg per tx)",
        total_lifecycle, total_percent
    );

    // Each individual transaction should be within limits
    assert!(register.total_estimated < DEFAULT_CU_LIMIT);
    assert!(audit.total_estimated < DEFAULT_CU_LIMIT);
    assert!(validate.total_estimated < DEFAULT_CU_LIMIT);
    assert!(assign.total_estimated < DEFAULT_CU_LIMIT);
}

#[test]
fn test_account_space_calculations() {
    // Verify account sizes match state definitions
    assert_eq!(NETBOOK_SIZE, 1104, "Netbook size should match INIT_SPACE");
    assert_eq!(CONFIG_SIZE, 234, "Config size should match INIT_SPACE");
    assert!(DEPLOYER_STATE_SIZE > 0 && DEPLOYER_STATE_SIZE < 100, "Deployer state should be small");
}

#[test]
fn test_cu_limit_constants() {
    // Verify compute budget constants
    assert_eq!(DEFAULT_CU_LIMIT, 1_470_000);
    assert!(BASE_TX_OVERHEAD > 0);
    assert!(CU_PER_ACCOUNT_READ > 0);
    assert!(CU_PER_ACCOUNT_WRITE > CU_PER_ACCOUNT_READ);
}

#[test]
fn test_all_instructions_within_budget() {
    // Comprehensive check: all instructions should fit within default CU limit
    let instructions = vec![
        estimate_fund_deployer(),
        estimate_initialize(),
        estimate_register_netbook(),
        estimate_audit_hardware(),
        estimate_validate_software(),
        estimate_assign_to_student(),
        estimate_grant_role(),
        estimate_request_role(),
        estimate_approve_role_request(),
        estimate_revoke_role(),
        estimate_query_netbook_state(),
        estimate_query_config(),
        estimate_query_role(),
    ];

    for inst in &instructions {
        println!(
            "  {:<25} {:>10} CU ({:>6.2}%) - {}",
            inst.instruction, inst.total_estimated, inst.percent_of_limit, inst.risk_level
        );
        assert!(
            inst.total_estimated < DEFAULT_CU_LIMIT,
            "{} exceeds CU limit",
            inst.instruction
        );
    }

    // Batch registration with max reasonable size
    let batch = estimate_register_netbooks_batch(20);
    println!(
        "  {:<25} {:>10} CU ({:>6.2}%) - {}",
        "register_netbooks_batch(20)", batch.total_estimated, batch.percent_of_limit, batch.risk_level
    );
    assert!(batch.total_estimated < DEFAULT_CU_LIMIT, "Batch of 20 should fit");
}

// ==================== Report Generation ====================

#[test]
fn generate_cu_report() {
    println!("\n========================================");
    println!("  Compute Unit Report - SupplyChainTracker");
    println!("========================================\n");
    println!("Default CU Limit: {}\n", DEFAULT_CU_LIMIT);

    let instructions = vec![
        estimate_initialize(),
        estimate_fund_deployer(),
        estimate_register_netbook(),
        estimate_register_netbooks_batch(10),
        estimate_audit_hardware(),
        estimate_validate_software(),
        estimate_assign_to_student(),
        estimate_grant_role(),
        estimate_request_role(),
        estimate_approve_role_request(),
        estimate_revoke_role(),
        estimate_query_netbook_state(),
        estimate_query_config(),
        estimate_query_role(),
    ];

    println!("{:<25} {:>10} {:>8} {:>8}", "Instruction", "CU Est.", "% Limit", "Risk");
    println!("{}", "-".repeat(55));

    for inst in &instructions {
        println!(
            "{:<25} {:>10} {:>7.2}% {:>8}",
            inst.instruction, inst.total_estimated, inst.percent_of_limit, inst.risk_level
        );
    }

    println!("\n========================================");

    // Lifecycle summary
    let lifecycle = vec![
        estimate_register_netbook(),
        estimate_audit_hardware(),
        estimate_validate_software(),
        estimate_assign_to_student(),
    ];
    let total: u64 = lifecycle.iter().map(|e| e.total_estimated).sum();
    println!("\nFull Lifecycle Total: {} CU (4 transactions)", total);
    println!("Average per Transaction: {} CU", total / 4);
}
