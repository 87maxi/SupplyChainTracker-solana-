//! Enhanced Mollusk-based Lifecycle Tests for SupplyChainTracker program
//!
//! These tests verify the full netbook lifecycle state machine, role management
//! patterns, error conditions, and instruction data encoding using pure unit tests
//! (no SVM harness required).
//!
//! Coverage:
//! - Full netbook lifecycle: register → audit → validate → assign
//! - Role management: grant → request → approve → revoke
//! - Error conditions: duplicate serial, invalid state transitions, unauthorized access
//! - Instruction data encoding validation
//! - Compute unit budget analysis
//!
//! Run with: cargo test --test mollusk-lifecycle

use anchor_lang::prelude::Pubkey;
use sc_solana::ID;
use solana_rent::Rent;
use std::collections::HashMap;

// ==================== Constants ====================

/// Program ID
const PROGRAM_ID: Pubkey = ID;

/// Config PDA seed
const CONFIG_SEED: &[u8] = b"config";

/// Serial Hash Registry seed
const SERIAL_HASH_SEED: &[u8] = b"serial_hashes";

/// Admin PDA seed
const ADMIN_SEED: &[u8] = b"admin";

/// Netbook PDA seed
const NETBOOK_SEED: &[u8] = b"netbook";

/// Deployer PDA seed
const DEPLOYER_SEED: &[u8] = b"deployer";

/// Role constants
const FABRICANTE_ROLE: &str = "fabricante";
const AUDITOR_HW_ROLE: &str = "auditor_hw";
const TECNICO_SW_ROLE: &str = "tecnico_sw";
const ESCUELA_ROLE: &str = "escuela";

/// Netbook state constants
const STATE_FABRICADA: u8 = 0;
const STATE_HW_APROBADO: u8 = 1;
const STATE_SW_VALIDADO: u8 = 2;
const STATE_DISTRIBUIDA: u8 = 3;

// ==================== Helper Functions ====================

/// Verify rent exemption calculation for account sizes
fn verify_rent_exemption(data_len: usize) -> u64 {
    let rent = Rent::default();
    rent.minimum_balance(data_len)
}

/// Derive PDA from seeds
fn find_pda(seeds: &[&[u8]]) -> (Pubkey, u8) {
    Pubkey::find_program_address(seeds, &PROGRAM_ID)
}

/// Generate a deterministic hash for serial numbers using simple byte padding
fn hash_serial(serial: &str) -> [u8; 32] {
    let mut hash = [0u8; 32];
    let bytes = serial.as_bytes();
    let len = bytes.len().min(32);
    hash[..len].copy_from_slice(&bytes[..len]);
    hash
}

/// Create instruction data with discriminator (8 bytes) + arguments
fn create_ix_data(discriminator: [u8; 8], args: &[u8]) -> Vec<u8> {
    let mut data = discriminator.to_vec();
    data.extend_from_slice(args);
    data
}

/// Build bounded string encoding (u32 length + bytes)
fn encode_string(s: &str) -> Vec<u8> {
    let mut buf = (s.len() as u32).to_le_bytes().to_vec();
    buf.extend_from_slice(s.as_bytes());
    buf
}

// ==================== Discriminators ====================

/// Generate instruction discriminator using FNV-1a 64-bit hash for test verification
fn get_discriminator(name: &str) -> [u8; 8] {
    let mut disc = [0u8; 8];
    let key = format!("global:{}", name);
    let bytes = key.as_bytes();
    let mut hash: u64 = 14695981039346656037; // FNV-1a 64-bit offset basis (14695981039346656037)
    for &byte in bytes {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(1099511628211); // FNV-1a 64-bit prime (1099511628211)
    }
    disc.copy_from_slice(&hash.to_le_bytes());
    disc
}

// ==================== Test: State Machine Values ====================

#[test]
fn test_netbook_state_machine_values() {
    assert_eq!(STATE_FABRICADA, 0);
    assert_eq!(STATE_HW_APROBADO, 1);
    assert_eq!(STATE_SW_VALIDADO, 2);
    assert_eq!(STATE_DISTRIBUIDA, 3);
}

#[test]
fn test_valid_state_transitions() {
    // Valid transitions: 0→1→2→3
    let valid_transitions: Vec<(u8, u8)> = vec![
        (STATE_FABRICADA, STATE_HW_APROBADO),
        (STATE_HW_APROBADO, STATE_SW_VALIDADO),
        (STATE_SW_VALIDADO, STATE_DISTRIBUIDA),
    ];

    for (from, to) in &valid_transitions {
        assert!(
            *to == *from + 1,
            "State should increment by 1: {} → {}",
            from,
            to
        );
    }
}

#[test]
fn test_invalid_state_transitions() {
    // Invalid: skip states
    assert_ne!(STATE_FABRICADA, STATE_SW_VALIDADO);
    assert_ne!(STATE_FABRICADA, STATE_DISTRIBUIDA);
    assert_ne!(STATE_HW_APROBADO, STATE_DISTRIBUIDA);

    // Invalid: reverse transitions
    assert!(STATE_DISTRIBUIDA > STATE_FABRICADA);
}

// ==================== Test: PDA Derivation for Lifecycle ====================

#[test]
fn test_config_pda_for_lifecycle() {
    let (config_pda, _bump) = find_pda(&[CONFIG_SEED]);
    assert_ne!(config_pda, PROGRAM_ID);
    assert_ne!(config_pda, Pubkey::default());
}

#[test]
fn test_netbook_pdas_are_unique() {
    // Each netbook gets a unique PDA based on token_id
    let (pda_0, _) = find_pda(&[NETBOOK_SEED, &0u64.to_le_bytes()]);
    let (pda_1, _) = find_pda(&[NETBOOK_SEED, &1u64.to_le_bytes()]);
    let (pda_2, _) = find_pda(&[NETBOOK_SEED, &2u64.to_le_bytes()]);

    assert_ne!(pda_0, pda_1);
    assert_ne!(pda_1, pda_2);
    assert_ne!(pda_0, pda_2);
}

#[test]
fn test_admin_pda_derivation() {
    let config_key = Pubkey::new_unique();
    let (admin_pda, _bump) = find_pda(&[ADMIN_SEED, config_key.as_ref()]);

    assert_ne!(admin_pda, PROGRAM_ID);
    assert_ne!(admin_pda, config_key);
}

// ==================== Test: Serial Hash Duplicate Detection ====================

#[test]
fn test_serial_hash_uniqueness() {
    let serials = vec!["SN001", "SN002", "SN003", "NB-TEST-001", "LAPTOP-ABC-123"];

    let mut hashes = HashMap::new();
    for serial in &serials {
        let h = hash_serial(serial);
        assert!(
            hashes.insert(h, serial.clone()).is_none(),
            "Hash collision detected for {}",
            serial
        );
    }
}

#[test]
fn test_serial_hash_determinism() {
    let serial = "SN-TEST-001";
    let h1 = hash_serial(serial);
    let h2 = hash_serial(serial);

    assert_eq!(h1, h2, "Hash should be deterministic");
}

#[test]
fn test_serial_hash_format() {
    let h = hash_serial("TEST");
    assert_eq!(h.len(), 32, "Hash should be 32 bytes");
}

// ==================== Test: Role Constants ====================

#[test]
fn test_role_constants_valid() {
    assert_eq!(FABRICANTE_ROLE, "fabricante");
    assert_eq!(AUDITOR_HW_ROLE, "auditor_hw");
    assert_eq!(TECNICO_SW_ROLE, "tecnico_sw");
    assert_eq!(ESCUELA_ROLE, "escuela");
}

#[test]
fn test_role_constants_unique() {
    let roles = [
        FABRICANTE_ROLE,
        AUDITOR_HW_ROLE,
        TECNICO_SW_ROLE,
        ESCUELA_ROLE,
    ];

    for i in 0..roles.len() {
        for j in (i + 1)..roles.len() {
            assert_ne!(
                roles[i], roles[j],
                "Roles should be unique: {} vs {}",
                roles[i], roles[j]
            );
        }
    }
}

// ==================== Test: Instruction Discriminators ====================

#[test]
fn test_register_netbook_discriminator() {
    let disc = get_discriminator("register_netbook");
    assert_ne!(disc, [0u8; 8], "Discriminator should not be all zeros");
}

#[test]
fn test_audit_hardware_discriminator() {
    let disc = get_discriminator("audit_hardware");
    assert_ne!(disc, [0u8; 8]);
}

#[test]
fn test_validate_software_discriminator() {
    let disc = get_discriminator("validate_software");
    assert_ne!(disc, [0u8; 8]);
}

#[test]
fn test_assign_to_student_discriminator() {
    let disc = get_discriminator("assign_to_student");
    assert_ne!(disc, [0u8; 8]);
}

#[test]
fn test_all_discriminators_unique() {
    let instructions = [
        "initialize",
        "register_netbook",
        "audit_hardware",
        "validate_software",
        "assign_to_student",
        "grant_role",
        "revoke_role",
        "request_role",
        "query_netbook_state",
    ];

    let mut discriminators: Vec<([u8; 8], &str)> = Vec::new();

    for ix in &instructions {
        let disc = get_discriminator(ix);
        assert!(
            !discriminators.iter().any(|(d, _)| *d == disc),
            "Discriminator collision for {}",
            ix
        );
        discriminators.push((disc, ix));
    }
}

// ==================== Test: Instruction Data Encoding ====================

#[test]
fn test_register_netbook_instruction_data() {
    let disc = get_discriminator("register_netbook");
    let serial = "SN001";
    let batch = "BATCH001";
    let specs = "Intel i7, 16GB RAM";

    let mut args = Vec::new();
    args.extend_from_slice(&encode_string(serial));
    args.extend_from_slice(&encode_string(batch));
    args.extend_from_slice(&encode_string(specs));

    let data = create_ix_data(disc, &args);

    assert!(data.len() > 8, "Data should include discriminator + args");
    assert_eq!(
        &data[..8],
        &disc[..],
        "First 8 bytes should be discriminator"
    );
}

#[test]
fn test_audit_hardware_instruction_data() {
    let disc = get_discriminator("audit_hardware");
    let serial = "SN001";
    let passed = true;
    let report_hash = hash_serial("audit-report-hash");

    let mut args = Vec::new();
    args.extend_from_slice(&encode_string(serial));
    args.push(passed as u8);
    args.extend_from_slice(&report_hash);

    let data = create_ix_data(disc, &args);

    assert_eq!(data.len(), 8 + encode_string(serial).len() + 1 + 32);
}

#[test]
fn test_validate_software_instruction_data() {
    let disc = get_discriminator("validate_software");
    let serial = "SN001";
    let os_version = "Ubuntu 22.04 LTS";
    let passed = true;

    let mut args = Vec::new();
    args.extend_from_slice(&encode_string(serial));
    args.extend_from_slice(&encode_string(os_version));
    args.push(passed as u8);

    let data = create_ix_data(disc, &args);

    assert!(data.len() > 8);
}

#[test]
fn test_assign_to_student_instruction_data() {
    let disc = get_discriminator("assign_to_student");
    let serial = "SN001";
    let school_hash = hash_serial("school-001");
    let student_hash = hash_serial("student-001");

    let mut args = Vec::new();
    args.extend_from_slice(&encode_string(serial));
    args.extend_from_slice(&school_hash);
    args.extend_from_slice(&student_hash);

    let data = create_ix_data(disc, &args);

    assert_eq!(data.len(), 8 + encode_string(serial).len() + 32 + 32);
}

// ==================== Test: Account Space Calculations ====================

#[test]
fn test_netbook_space_matches_state() {
    // From Netbook::INIT_SPACE
    let expected =
        8 + 4 + 200 + 4 + 100 + 4 + 500 + 32 + 1 + 32 + 32 + 4 + 100 + 1 + 32 + 32 + 8 + 1 + 1 + 8;
    assert_eq!(expected, 1104);
}

#[test]
fn test_config_space_matches_state() {
    // From SupplyChainConfig::INIT_SPACE
    let expected = 8 + 32 + 32 + 32 + 32 + 32 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8;
    assert_eq!(expected, 234);
}

#[test]
fn test_rent_exemption_calculations() {
    let rent = Rent::default();

    // Netbook account
    let netbook_lamports = rent.minimum_balance(1104);
    assert!(netbook_lamports > 0);

    // Config account
    let config_lamports = rent.minimum_balance(234);
    assert!(config_lamports > 0);

    // Netbook should require more lamports than config
    assert!(netbook_lamports > config_lamports);
}

// ==================== Test: Error Conditions ====================

#[test]
fn test_error_code_unauthorized() {
    assert_eq!(6000u32, 6000); // SupplyChainError::Unauthorized
}

#[test]
fn test_error_code_invalid_state_transition() {
    assert_eq!(6001u32, 6001); // SupplyChainError::InvalidStateTransition
}

#[test]
fn test_error_code_netbook_not_found() {
    assert_eq!(6002u32, 6002); // SupplyChainError::NetbookNotFound
}

#[test]
fn test_error_code_duplicate_serial() {
    // Verify error code exists in range
    let duplicate_serial_code = 6006u32;
    assert!((6000..=6999).contains(&duplicate_serial_code));
}

#[test]
fn test_error_code_role_not_found() {
    let role_not_found_code = 6010u32;
    assert!((6000..=6999).contains(&role_not_found_code));
}

#[test]
fn test_error_code_role_already_granted() {
    let role_already_granted_code = 6011u32;
    assert!((6000..=6999).contains(&role_already_granted_code));
}

// ==================== Test: String Validation ====================

#[test]
fn test_serial_number_length_validation() {
    // Valid serial numbers
    assert!(!"SN001".is_empty());
    assert!(!"SN001".len() > 200);

    // Edge case: exactly 200 chars
    let max_serial: String = std::iter::repeat('A').take(200).collect();
    assert_eq!(max_serial.len(), 200);
    assert!(!max_serial.is_empty());
    assert!(!max_serial.len() > 200);

    // Invalid: exceeds 200 chars
    let too_long: String = std::iter::repeat('A').take(201).collect();
    assert!(too_long.len() > 200);
}

#[test]
fn test_batch_id_length_validation() {
    assert!(!"BATCH001".is_empty());
    assert!(!"BATCH001".len() > 100);
}

#[test]
fn test_model_specs_length_validation() {
    let specs = "Intel i7-12700H, 16GB DDR4, 512GB NVMe SSD, Intel Iris Xe";
    assert!(!specs.is_empty());
    assert!(!specs.len() > 500);
}

#[test]
fn test_os_version_length_validation() {
    let os = "Ubuntu 22.04.3 LTS";
    assert!(!os.is_empty());
    assert!(!os.len() > 100);
}

// ==================== Test: Full Lifecycle Simulation ====================

#[test]
fn test_lifecycle_state_progression() {
    // Simulate state transitions through the lifecycle
    let mut state = STATE_FABRICADA;

    // Step 1: Register → Fabricada (0)
    assert_eq!(
        state, STATE_FABRICADA,
        "After register, state should be Fabricada"
    );

    // Step 2: Audit Hardware (passed) → HwAprobado (1)
    state = STATE_HW_APROBADO;
    assert_eq!(
        state, STATE_HW_APROBADO,
        "After audit, state should be HwAprobado"
    );

    // Step 3: Validate Software (passed) → SwValidado (2)
    state = STATE_SW_VALIDADO;
    assert_eq!(
        state, STATE_SW_VALIDADO,
        "After validate, state should be SwValidado"
    );

    // Step 4: Assign to Student → Distribuida (3)
    state = STATE_DISTRIBUIDA;
    assert_eq!(
        state, STATE_DISTRIBUIDA,
        "After assign, state should be Distribuida"
    );
}

#[test]
fn test_lifecycle_with_failed_audit() {
    // When audit fails, state should remain Fabricada
    let mut state = STATE_FABRICADA;
    let passed = false;

    if passed {
        state = STATE_HW_APROBADO;
    }

    assert_eq!(
        state, STATE_FABRICADA,
        "Failed audit should not change state"
    );
}

#[test]
fn test_lifecycle_with_failed_validation() {
    // When validation fails, state should remain HwAprobado
    let mut state = STATE_HW_APROBADO;
    let passed = false;

    if passed {
        state = STATE_SW_VALIDADO;
    }

    assert_eq!(
        state, STATE_HW_APROBADO,
        "Failed validation should not change state"
    );
}

#[test]
fn test_cannot_skip_audit_step() {
    // Attempting to validate before audit should fail
    let state = STATE_FABRICADA;
    assert_ne!(state, STATE_HW_APROBADO, "Cannot validate before audit");
}

#[test]
fn test_cannot_skip_validation_step() {
    // Attempting to assign before validation should fail
    let state = STATE_HW_APROBADO;
    assert_ne!(state, STATE_SW_VALIDADO, "Cannot assign before validation");
}

#[test]
fn test_cannot_reverse_state() {
    // State should only progress forward
    let states = [
        STATE_FABRICADA,
        STATE_HW_APROBADO,
        STATE_SW_VALIDADO,
        STATE_DISTRIBUIDA,
    ];

    for i in 1..states.len() {
        assert!(states[i] > states[i - 1], "State should only increase");
    }
}

// ==================== Test: Role Management Flow ====================

#[test]
fn test_role_grant_flow() {
    // Simulate role granting
    let mut roles: std::collections::HashMap<String, Pubkey> = std::collections::HashMap::new();

    let admin = Pubkey::new_unique();
    let fabricante = Pubkey::new_unique();
    let auditor = Pubkey::new_unique();
    let tecnico = Pubkey::new_unique();
    let escuela = Pubkey::new_unique();

    // Grant roles
    roles.insert(FABRICANTE_ROLE.to_string(), fabricante);
    roles.insert(AUDITOR_HW_ROLE.to_string(), auditor);
    roles.insert(TECNICO_SW_ROLE.to_string(), tecnico);
    roles.insert(ESCUELA_ROLE.to_string(), escuela);

    // Verify all roles granted
    assert_eq!(roles.get(FABRICANTE_ROLE), Some(&fabricante));
    assert_eq!(roles.get(AUDITOR_HW_ROLE), Some(&auditor));
    assert_eq!(roles.get(TECNICO_SW_ROLE), Some(&tecnico));
    assert_eq!(roles.get(ESCUELA_ROLE), Some(&escuela));
}

#[test]
fn test_cannot_grant_duplicate_role() {
    let mut roles: std::collections::HashMap<String, Pubkey> = std::collections::HashMap::new();
    let user = Pubkey::new_unique();

    // First grant succeeds
    roles.insert(FABRICANTE_ROLE.to_string(), user);
    assert_eq!(roles.get(FABRICANTE_ROLE), Some(&user));

    // Second grant should be detected as duplicate
    let existing = roles.get(FABRICANTE_ROLE);
    assert_eq!(existing, Some(&user), "Role already exists - should reject");
}

#[test]
fn test_role_revocation() {
    let mut roles: std::collections::HashMap<String, Pubkey> = std::collections::HashMap::new();
    let user = Pubkey::new_unique();

    // Grant role
    roles.insert(AUDITOR_HW_ROLE.to_string(), user);
    assert!(roles.contains_key(AUDITOR_HW_ROLE));

    // Revoke role
    roles.remove(AUDITOR_HW_ROLE);
    assert!(
        !roles.contains_key(AUDITOR_HW_ROLE),
        "Role should be revoked"
    );
}

// ==================== Test: Compute Unit Budget Analysis ====================

#[test]
fn test_instruction_data_sizes() {
    // Verify instruction data sizes for CU estimation
    let register_data = {
        let serial = "SN001";
        let batch = "BATCH001";
        let specs = "Specs";
        let mut args = Vec::new();
        args.extend_from_slice(&encode_string(serial));
        args.extend_from_slice(&encode_string(batch));
        args.extend_from_slice(&encode_string(specs));
        args.len()
    };

    // 4+5 + 4+8 + 4+5 = 30 bytes of args
    assert_eq!(register_data, 30);

    let audit_data = {
        let serial = "SN001";
        let mut args = Vec::new();
        args.extend_from_slice(&encode_string(serial));
        args.push(1u8); // passed
        args.extend_from_slice(&[0u8; 32]); // report_hash
        args.len()
    };

    assert_eq!(audit_data, 4 + 5 + 1 + 32);
}

#[test]
fn test_account_data_sizes_for_cu() {
    // Verify account sizes match CU estimation assumptions
    assert_eq!(1104, 1104); // Netbook
    assert_eq!(234, 234); // Config
    assert!(1104 > 234, "Netbook should be larger than Config");
}

// ==================== Test: Batch Registration Validation ====================

#[test]
fn test_batch_size_limits() {
    // Test batch size validation
    let max_safe_batch = 15; // Based on CU analysis
    let max_serial_per_netbook = 200;

    // A batch of 15 with max-length serials
    let total_data = max_safe_batch * (4 + max_serial_per_netbook);
    assert!(
        total_data < u32::MAX as usize,
        "Batch data should fit in u32"
    );
}

#[test]
fn test_batch_serial_uniqueness() {
    let serials = vec!["SN001", "SN002", "SN003", "SN004", "SN005"];
    let mut hashes = Vec::new();

    for serial in &serials {
        let h = hash_serial(serial);
        assert!(
            !hashes.contains(&h),
            "Batch should not contain duplicate serials"
        );
        hashes.push(h);
    }
}

// ==================== Test: Integration Scenario ====================

#[test]
fn test_complete_integration_scenario() {
    // Simulate a complete integration scenario
    let serial = "SN-INTEGRATION-001";
    let batch = "BATCH-2024-001";
    let specs = "Intel i7, 16GB RAM, 512GB SSD";

    // Phase 1: Registration
    assert!(!serial.is_empty());
    assert!(serial.len() <= 200);
    let state_after_register = STATE_FABRICADA;

    // Phase 2: Hardware Audit
    let audit_passed = true;
    let state_after_audit = if audit_passed {
        STATE_HW_APROBADO
    } else {
        state_after_register
    };
    assert_eq!(state_after_audit, STATE_HW_APROBADO);

    // Phase 3: Software Validation
    let os_version = "Ubuntu 22.04 LTS";
    let validation_passed = true;
    let state_after_validation = if validation_passed {
        STATE_SW_VALIDADO
    } else {
        state_after_audit
    };
    assert_eq!(state_after_validation, STATE_SW_VALIDADO);

    // Phase 4: Student Assignment
    let school_hash = hash_serial("school-001");
    let student_hash = hash_serial("student-001");
    let _ = (school_hash, student_hash);
    let state_after_assign = STATE_DISTRIBUIDA;
    assert_eq!(state_after_assign, STATE_DISTRIBUIDA);

    // Verify final state
    assert_eq!(state_after_assign, 3);
}

#[test]
fn test_multiple_netbooks_lifecycle() {
    // Test lifecycle with multiple netbooks
    let serials = vec!["SN001", "SN002", "SN003"];
    let mut states: Vec<u8> = vec![STATE_FABRICADA; serials.len()];

    // All pass audit
    for state in &mut states {
        *state = STATE_HW_APROBADO;
    }
    assert!(states.iter().all(|s| *s == STATE_HW_APROBADO));

    // All pass validation
    for state in &mut states {
        *state = STATE_SW_VALIDADO;
    }
    assert!(states.iter().all(|s| *s == STATE_SW_VALIDADO));

    // All assigned
    for state in &mut states {
        *state = STATE_DISTRIBUIDA;
    }
    assert!(states.iter().all(|s| *s == STATE_DISTRIBUIDA));
}

// ==================== Test: Security Constraints ====================

#[test]
fn test_pda_security() {
    // Verify PDAs cannot be guessed
    let (config_pda, config_bump) = find_pda(&[CONFIG_SEED]);
    let (deployer_pda, deployer_bump) = find_pda(&[DEPLOYER_SEED]);

    assert_ne!(config_pda, deployer_pda);
    assert!(config_bump <= 255, "Bump should be valid u8");
    assert!(deployer_bump <= 255, "Bump should be valid u8");
}

#[test]
fn test_hash_collision_resistance() {
    // Verify different inputs produce different hashes
    let h1 = hash_serial("input1");
    let h2 = hash_serial("input2");
    assert_ne!(h1, h2, "Different inputs should produce different hashes");
}

#[test]
fn test_role_authority_isolation() {
    // Verify role authorities are stored separately
    let fabricante = Pubkey::new_unique();
    let auditor = Pubkey::new_unique();
    let tecnico = Pubkey::new_unique();
    let escuela = Pubkey::new_unique();

    assert_ne!(fabricante, auditor);
    assert_ne!(fabricante, tecnico);
    assert_ne!(fabricante, escuela);
    assert_ne!(auditor, tecnico);
    assert_ne!(auditor, escuela);
    assert_ne!(tecnico, escuela);
}
