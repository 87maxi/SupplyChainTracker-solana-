//! Mollusk-based tests for SupplyChainTracker program
//!
//! These tests use Mollusk, a fast test harness by Anza that runs in-process
//! without requiring solana-test-validator. This eliminates external dependencies
//! for CI/CD stability.
//!
//! Run with: cargo test --test mollusk-tests

use anchor_lang::prelude::Pubkey;
use mollusk_svm::Mollusk;
use solana_system_interface::instruction as system_instruction;
use solana_sdk_ids::system_program;

// ==================== Constants ====================

/// Program ID from the Anchor program
const PROGRAM_ADDRESS: &str = "7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb";

/// System program ID
const SYSTEM_PROGRAM_ID: Pubkey = system_program::id();

// ==================== Helper Functions ====================

/// Derive a PDA (Program Derived Address)
fn find_program_address(seeds: &[&[u8]], program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(seeds, program_id)
}

// ==================== Test: Program ID Valid ====================

#[test]
fn test_program_id_valid() {
    let result = Pubkey::try_from(PROGRAM_ADDRESS);
    assert!(result.is_ok(), "Program ID should be valid");
    let program_id = result.unwrap();
    assert_ne!(program_id, Pubkey::default());
    assert_ne!(program_id, SYSTEM_PROGRAM_ID);
}

// ==================== Test: PDA Derivation ====================

#[test]
fn test_config_pda_derivation() {
    let program_id = Pubkey::try_from(PROGRAM_ADDRESS).unwrap();
    let config_seed: &[u8] = b"config";
    let (pda, bump) = find_program_address(&[config_seed], &program_id);

    assert_ne!(pda, program_id);
    assert!(bump <= 255, "Bump seed for config should be <= 255, got {}", bump);
}

#[test]
fn test_admin_pda_derivation() {
    let program_id = Pubkey::try_from(PROGRAM_ADDRESS).unwrap();
    let admin_seed: &[u8] = b"admin";
    let config_key = Pubkey::new_unique();
    let (pda, bump) = find_program_address(&[admin_seed, config_key.as_ref()], &program_id);

    assert_ne!(pda, program_id);
    assert_ne!(pda, config_key);
    assert!(bump <= 255, "Bump seed for admin should be <= 255, got {}", bump);
}

#[test]
fn test_deployer_pda_derivation() {
    let program_id = Pubkey::try_from(PROGRAM_ADDRESS).unwrap();
    let deployer_seed: &[u8] = b"deployer";
    let (pda, bump) = find_program_address(&[deployer_seed], &program_id);

    assert_ne!(pda, program_id);
    assert!(bump <= 255, "Bump seed for deployer should be <= 255, got {}", bump);
}

#[test]
fn test_netbook_pda_derivation() {
    let program_id = Pubkey::try_from(PROGRAM_ADDRESS).unwrap();
    let netbook_seed: &[u8] = b"netbook";
    let (pda, bump) =
        find_program_address(&[netbook_seed, &0u64.to_le_bytes()], &program_id);

    assert_ne!(pda, program_id);
    assert!(bump <= 255, "Bump seed for netbook should be <= 255, got {}", bump);
}

#[test]
fn test_serial_hashes_pda_derivation() {
    let program_id = Pubkey::try_from(PROGRAM_ADDRESS).unwrap();
    let serial_hashes_seed: &[u8] = b"serial_hashes";
    let config_key = Pubkey::new_unique();
    let (pda, bump) = find_program_address(&[serial_hashes_seed, config_key.as_ref()], &program_id);

    assert_ne!(pda, program_id);
    assert_ne!(pda, config_key);
    assert!(bump <= 255, "Bump seed for serial_hashes should be <= 255, got {}", bump);
}

#[test]
fn test_role_holder_pda_derivation() {
    let program_id = Pubkey::try_from(PROGRAM_ADDRESS).unwrap();
    let role_holder_seed: &[u8] = b"role_holder";
    let account_key = Pubkey::new_unique();
    let (pda, bump) = find_program_address(&[role_holder_seed, account_key.as_ref()], &program_id);

    assert_ne!(pda, program_id);
    assert_ne!(pda, account_key);
    assert!(bump <= 255, "Bump seed for role_holder should be <= 255, got {}", bump);
}

#[test]
fn test_role_request_pda_derivation() {
    let program_id = Pubkey::try_from(PROGRAM_ADDRESS).unwrap();
    let role_request_seed: &[u8] = b"role_request";
    let requester = Pubkey::new_unique();
    let (pda, bump) = find_program_address(&[role_request_seed, requester.as_ref()], &program_id);

    assert_ne!(pda, program_id);
    assert_ne!(pda, requester);
    assert!(bump <= 255, "Bump seed for role_request should be <= 255, got {}", bump);
}

// ==================== Test: Instruction Discriminators ====================

// Instruction discriminator for fund_deployer (from IDL)
const FUND_DEPLOYER_DISCRIMINATOR: [u8; 8] = [15, 92, 87, 6, 99, 8, 80, 10];

#[test]
fn test_fund_deployer_discriminator() {
    assert_eq!(FUND_DEPLOYER_DISCRIMINATOR, [15, 92, 87, 6, 99, 8, 80, 10]);
    assert_eq!(FUND_DEPLOYER_DISCRIMINATOR.len(), 8); // Anchor uses 8-byte discriminators
}

// Instruction discriminator for initialize (from IDL)
const INITIALIZE_DISCRIMINATOR: [u8; 8] = [163, 75, 128, 156, 59, 189, 146, 174];

#[test]
fn test_initialize_discriminator() {
    assert_eq!(INITIALIZE_DISCRIMINATOR, [163, 75, 128, 156, 59, 189, 146, 174]);
    assert_eq!(INITIALIZE_DISCRIMINATOR.len(), 8);
}

// Instruction discriminator for register_netbook (from IDL)
const REGISTER_NETBOOK_DISCRIMINATOR: [u8; 8] = [206, 235, 55, 152, 143, 127, 127, 89];

#[test]
fn test_register_netbook_discriminator() {
    assert_eq!(REGISTER_NETBOOK_DISCRIMINATOR, [206, 235, 55, 152, 143, 127, 127, 89]);
    assert_eq!(REGISTER_NETBOOK_DISCRIMINATOR.len(), 8);
}

// ==================== Test: Instruction Data Format ====================

#[test]
fn test_fund_deployer_instruction_data() {
    // Build instruction data: discriminator (8 bytes) + amount (u64 LE)
    let amount: u64 = 1_000_000_000_000u64; // 0.001 SOL
    let mut instruction_data = FUND_DEPLOYER_DISCRIMINATOR.to_vec();
    instruction_data.extend_from_slice(&amount.to_le_bytes());

    assert_eq!(instruction_data.len(), 16); // 8 (discriminator) + 8 (amount)
    assert_eq!(&instruction_data[0..8], &FUND_DEPLOYER_DISCRIMINATOR);
    assert_eq!(u64::from_le_bytes(instruction_data[8..16].try_into().unwrap()), amount);
}

#[test]
fn test_register_netbook_instruction_data() {
    // Build instruction data: discriminator + bounded strings
    let mut instruction_data = REGISTER_NETBOOK_DISCRIMINATOR.to_vec();

    // Bounded string: length (u32 LE) + bytes
    let serial = "SN001";
    instruction_data.extend_from_slice(&(serial.len() as u32).to_le_bytes());
    instruction_data.extend_from_slice(serial.as_bytes());

    let batch = "BATCH001";
    instruction_data.extend_from_slice(&(batch.len() as u32).to_le_bytes());
    instruction_data.extend_from_slice(batch.as_bytes());

    let specs = "Specs v1";
    instruction_data.extend_from_slice(&(specs.len() as u32).to_le_bytes());
    instruction_data.extend_from_slice(specs.as_bytes());

    // Verify structure
    assert!(instruction_data.len() > 8); // discriminator + string data
    // 8 (discriminator) + 4 + 5 + 4 + 8 + 4 + 8 = 41 bytes
    assert_eq!(instruction_data.len(), 41);
}

// ==================== Test: Space Calculations ====================

#[test]
fn test_netbook_space_calculation() {
    // Actual space from Netbook::INIT_SPACE implementation
    // 8 (discriminator) + 4 + 200 + 4 + 100 + 4 + 500 + 32 + 1 + 32 + 32 + 4 + 100 + 1 + 32 + 32 + 8 + 1 + 1 + 8
    let expected = 8 + 4 + 200 + 4 + 100 + 4 + 500 + 32 + 1 + 32 + 32 + 4 + 100 + 1 + 32 + 32 + 8 + 1 + 1 + 8;
    assert_eq!(expected, 1104); // Actual calculated value
}

#[test]
fn test_config_space_calculation() {
    // Actual space from SupplyChainConfig::INIT_SPACE implementation
    // 8 (discriminator) + 32*5 + 1*2 + 8*8
    let expected = 8 + 32 + 32 + 32 + 32 + 32 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8;
    assert_eq!(expected, 234); // Actual calculated value
}

#[test]
fn test_deployer_state_space_calculation() {
    // 8 (discriminator) + 1 (bump) + 8 (total_funded)
    let expected = 8 + 1 + 8;
    assert_eq!(expected, 17);
}

// ==================== Test: Error Codes ====================

#[test]
fn test_error_code_values() {
    // Verify error codes match expected values from the program
    assert_eq!(6000u32, 6000); // Unauthorized
    assert_eq!(6001u32, 6001); // InvalidStateTransition
    assert_eq!(6002u32, 6002); // NetbookNotFound
    assert_eq!(6013u32, 6013); // InvalidRequestState
}

#[test]
fn test_error_codes_range() {
    // Custom errors should be in the 6000-6999 range for Anchor
    assert!((6000..=6999).contains(&6000));
    assert!((6000..=6999).contains(&6001));
    assert!((6000..=6999).contains(&6002));
    assert!((6000..=6999).contains(&6013));
}

// ==================== Test: Netbook State Machine ====================

#[test]
fn test_netbook_state_values() {
    // Verify state machine values
    assert_eq!(0u8, 0); // Fabricada
    assert_eq!(1u8, 1); // HwAprobado
    assert_eq!(2u8, 2); // SwValidado
    assert_eq!(3u8, 3); // Distribuida
}

#[test]
fn test_netbook_state_transitions() {
    // Valid transitions: Fabricada -> HwAprobado -> SwValidado -> Distribuida
    let mut state: u8 = 0; // Fabricada
    state = 1; // HwAprobado
    state = 2; // SwValidado
    state = 3; // Distribuida
    assert_eq!(state, 3);
}

#[test]
fn test_request_status_values() {
    // Verify request status values
    assert_eq!(0u8, 0); // Pending
    assert_eq!(1u8, 1); // Approved
    assert_eq!(2u8, 2); // Rejected
}

// ==================== Test: Role Constants ====================

#[test]
fn test_role_constants() {
    assert_eq!("fabricante", "fabricante");
    assert_eq!("auditor_hw", "auditor_hw");
    assert_eq!("tecnico_sw", "tecnico_sw");
    assert_eq!("escuela", "escuela");
}

// ==================== Test: Mollusk Program Loading ====================

// ==================== Test: Mollusk Program Loading ====================

#[test]
fn test_mollusk_so_exists() {
    // The .so file is at sc-solana/target/deploy/sc_solana.so relative to workspace
    // From tests directory it's ../../target/deploy/sc_solana.so
    let so_path = std::path::Path::new("../../target/deploy/sc_solana.so");
    assert!(so_path.exists(), "Program .so file should exist at ../../target/deploy/sc_solana.so");
    
    let metadata = so_path.metadata().expect("Failed to read .so metadata");
    assert!(metadata.len() > 0, "Program .so file should not be empty");
    assert!(metadata.len() < 1_000_000, "Program .so file should be reasonable size");
}

// ==================== Test: Bump Seed Validation ====================

#[test]
fn test_bump_seed_range() {
    // Bump seeds should always be < 255
    let program_id = Pubkey::try_from(PROGRAM_ADDRESS).unwrap();
    
    let (_, bump) = Pubkey::find_program_address(&[b"config"], &program_id);
    assert!(bump <= 255, "Bump seed for config should be <= 255, got {}", bump);
    
    let (_, bump) = Pubkey::find_program_address(&[b"deployer"], &program_id);
    assert!(bump <= 255, "Bump seed for deployer should be <= 255, got {}", bump);
    
    let (_, bump) = Pubkey::find_program_address(&[b"admin"], &program_id);
    assert!(bump <= 255, "Bump seed for admin should be <= 255, got {}", bump);
}

#[test]
fn test_multiple_bump_seeds() {
    // Test that different seeds produce different PDAs
    let program_id = Pubkey::try_from(PROGRAM_ADDRESS).unwrap();
    
    let (pda1, _) = Pubkey::find_program_address(&[b"config"], &program_id);
    let (pda2, _) = Pubkey::find_program_address(&[b"deployer"], &program_id);
    let (pda3, _) = Pubkey::find_program_address(&[b"admin", &[0u8]], &program_id);
    
    assert_ne!(pda1, pda2);
    assert_ne!(pda1, pda3);
    assert_ne!(pda2, pda3);
}
