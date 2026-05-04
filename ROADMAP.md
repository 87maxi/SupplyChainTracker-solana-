# SupplyChainTracker - Ethereum to Solana/Anchor Migration Roadmap

## Overview

This document outlines the complete migration plan for transforming the SupplyChainTracker smart contract from Ethereum/Solidity to Solana/Anchor. The original implementation tracks netbook lifecycle in a supply chain with role-based access control.

**Source Contract:** [`sc/src/SupplyChainTracker.sol`](sc/src/SupplyChainTracker.sol)  
**Target Project:** [`sc-solana/`](sc-solana/)  
**Program ID:** `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS`  
**Total Estimated Effort:** ~52 hours  
**Issues Created:** 16 (see tracking table below)

## Quick Links - All Migration Issues

| Phase | Issue | Priority |
|-------|-------|----------|
| Phase 1 | [Analysis & Planning](https://github.com/87maxi/SupplyChainTracker-solana-/issues/1) | P0 |
| Phase 2 | [Anchor Program Core Structure](https://github.com/87maxi/SupplyChainTracker-solana-/issues/1) | P0 |
| Phase 3 | [State & Data Structures](https://github.com/87maxi/SupplyChainTracker-solana-/issues/2) | P0 |
| Phase 4 | [Role Management](https://github.com/87maxi/SupplyChainTracker-solana-/issues/3) | P0 |
| Phase 5 | [Netbook Registration](https://github.com/87maxi/SupplyChainTracker-solana-/issues/4) | P0 |
| Phase 6 | [Hardware Audit](https://github.com/87maxi/SupplyChainTracker-solana-/issues/5) | P1 |
| Phase 7 | [Software Validation](https://github.com/87maxi/SupplyChainTracker-solana-/issues/6) | P1 |
| Phase 8 | [Student Assignment](https://github.com/87maxi/SupplyChainTracker-solana-/issues/7) | P1 |
| Phase 9 | [View/Query Instructions](https://github.com/87maxi/SupplyChainTracker-solana-/issues/8) | P2 |
| Phase 10 | [Testing Framework](https://github.com/87maxi/SupplyChainTracker-solana-/issues/9) | P0 |
| Phase 11 | [Integration Tests](https://github.com/87maxi/SupplyChainTracker-solana-/issues/10) | P0 |
| Phase 12 | [Security & Edge Case Tests](https://github.com/87maxi/SupplyChainTracker-solana-/issues/11) | P1 |
| Phase 13 | [Deployment Scripts](https://github.com/87maxi/SupplyChainTracker-solana-/issues/12) | P1 |
| Phase 14 | [Complete Migration](https://github.com/87maxi/SupplyChainTracker-solana-/issues/13) | P0 |
| Phase 15 | [README & Documentation](https://github.com/87maxi/SupplyChainTracker-solana-/issues/14) | P2 |
| Phase 16 | [CI/CD Pipeline](https://github.com/87maxi/SupplyChainTracker-solana-/issues/15) | P2 |
| Phase 17 | [IDL & Client Types](https://github.com/87maxi/SupplyChainTracker-solana-/issues/16) | P2 |

---

## Original Solidity Implementation Analysis

### Core Features

| Feature | Description |
|---------|-------------|
| **Role-Based Access Control** | OpenZeppelin AccessControl with 4 custom roles |
| **State Machine** | 4-state lifecycle: FABRICADA → HW_APROBADO → SW_VALIDADO → DISTRIBUIDA |
| **Batch Operations** | Array-based netbook registration |
| **Role Requests** | Decentralized role request/approval workflow |
| **Metadata Storage** | JSON metadata for netbooks, hardware reports, software validation |
| **PII Privacy** | Hash-based student ID and school storage |
| **Token ID Mapping** | Serial numbers mapped to ERC-1155 token IDs |

### Role Definitions

| Role | Name | Permissions |
|------|------|-------------|
| `FABRICANTE_ROLE` | Manufacturer | Register netbooks |
| `AUDITOR_HW_ROLE` | Hardware Auditor | Approve hardware integrity |
| `TECNICO_SW_ROLE` | Software Technician | Validate software |
| `ESCUELA_ROLE` | School | Receive assigned netbooks |

### State Machine

```
FABRICADA ──→ HW_APROBADO ──→ SW_VALIDADO ──→ DISTRIBUIDA
  (1)           (2)              (3)             (4)
```

### Key Functions

| Function | Role Required | Description |
|----------|---------------|-------------|
| `registerNetbooks()` | FABRICANTE_ROLE | Batch register netbooks with serial numbers, batch IDs, model specs |
| `auditHardware()` | AUDITOR_HW_ROLE | Hardware integrity check with hash report |
| `validateSoftware()` | TECNICO_SW_ROLE | OS version validation |
| `assignToStudent()` | ESCUELA_ROLE | Assign netbook to student with PII hashing |
| `grantRole()` | DEFAULT_ADMIN_ROLE | Grant role to address |
| `revokeRole()` | DEFAULT_ADMIN_ROLE | Revoke role from address |
| `requestRole()` | Any user | Request a role with signature |
| `approveRoleRequest()` | DEFAULT_ADMIN_ROLE | Approve pending role request |
| `rejectRoleRequest()` | DEFAULT ADMIN_ROLE | Reject pending role request |

---

## Migration Phases

### Phase 1: Analysis & Planning ✅

**Status:** Complete  
**Deliverables:**
- [x] Full analysis of Solidity contract (578 lines)
- [x] Test suite analysis (6 test files, ~1,200+ lines)
- [x] Anchor project structure review
- [x] Role and state mapping documentation

---

### Phase 2: Anchor Program Core Structure

**GitHub Issue:** [#1 - Anchor Program Core Structure](https://github.com/87maxi/SupplyChainTracker-solana-/issues/1)  
**Priority:** P0 - Critical  
**Estimated Effort:** 2 hours

**Tasks:**
1. Create module structure in `sc-solana/programs/sc-solana/src/`:
   - `lib.rs` - Main program entry point
   - `accounts.rs` - Account structs
   - `instructions.rs` - Instruction handlers
   - `errors.rs` - Custom error types
   - `state.rs` - On-chain state definitions
   - `constants.rs` - Role constants and configuration

2. Define program ID and module exports

3. Set up instruction dispatching

**Solidity Reference:** [`SupplyChainTracker.sol`](sc/src/SupplyChainTracker.sol:1)

---

### Phase 3: State & Data Structures (Accounts)

**GitHub Issue:** [#2 - State & Data Structures (Accounts)](https://github.com/87maxi/SupplyChainTracker-solana-/issues/2)  
**Priority:** P0 - Critical  
**Estimated Effort:** 4 hours

**Tasks:**
1. Implement `Netbook` struct mapping:
   ```rust
   #[account]
   #[derive(Debug)]
   pub struct Netbook {
       pub serial_number: String,      // Up to 200 chars
       pub batch_id: String,           // Up to 100 chars
       pub initial_model_specs: String, // Up to 500 chars
       pub hw_auditor: Pubkey,
       pub hw_integrity_passed: bool,
       pub hw_report_hash: [u8; 32],
       pub sw_technician: Pubkey,
       pub os_version: String,         // Up to 100 chars
       pub sw_validation_passed: bool,
       pub destination_school_hash: [u8; 32],
       pub student_id_hash: [u8; 32],
       pub distribution_timestamp: u64,
       pub state: NetbookState,
       pub token_id: u64,
   }
   ```

2. Implement `NetbookState` enum (ANCHOR ENUM REQUIRES 8 VARS MAX):
   ```rust
   #[derive AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
   pub enum NetbookState {
       Fabricada = 0,
       HwAprobado = 1,
       SwValidado = 2,
       Distribuida = 3,
   }
   ```

3. Create PDA account for `SupplyChainConfig` (global state):
   - `fabricante` pubkey
   - `next_token_id` counter
   - `total_netbooks` counter
   - `role_requests_count` counter

4. Implement `RoleRequest` struct as separate PDA accounts

**Solidity Reference:** [`SupplyChainTracker.sol:86-121`](sc/src/SupplyChainTracker.sol:86)

---

### Phase 4: Role Management Implementation

**GitHub Issue:** [#3 - Role Management Implementation](https://github.com/87maxi/SupplyChainTracker-solana-/issues/3)  
**Priority:** P0 - Critical  
**Estimated Effort:** 6 hours

**Tasks:**
1. Create role storage in `SupplyChainConfig`:
   - `fabricante_role: Pubkey`
   - `auditor_hw_role: Pubkey`
   - `tecnico_sw_role: Pubkey`
   - `escuela_role: Pubkey`
   - `role_members: HashMap<Pubkey, HashSet<Pubkey>>`

2. Implement instructions:
   - `InitializeRoles` - Set up role definitions
   - `GrantRole` - Grant role to signer
   - `RevokeRole` - Revoke role from signer
   - `RequestRole` - User requests role with signature
   - `ApproveRoleRequest` - Admin approves request
   - `RejectRoleRequest` - Admin rejects request

3. Role constants:
   ```rust
   pub const FABRICANTE_ROLE_STR: &str = "FABRICANTE";
   pub const AUDITOR_HW_ROLE_STR: &str = "AUDITOR_HW";
   pub const TECNICO_SW_ROLE_STR: &str = "TECNICO_SW";
   pub const ESCUELA_ROLE_STR: &str = "ESCUELA";
   ```

4. Role request tracking:
   ```rust
   pub struct RoleRequest {
       pub requester: Pubkey,
       pub role_type: String,
       pub signature: Vec<u8>,
       pub status: RoleRequestStatus,
       pub timestamp: u64,
   }
   ```

**Solidity Reference:** [`SupplyChainTracker.sol:230-306`](sc/src/SupplyChainTracker.sol:230)

---

### Phase 5: Netbook Registration Instruction

**GitHub Issue:** [#4 - Netbook Registration Instruction](https://github.com/87maxi/SupplyChainTracker-solana-/issues/4)  
**Priority:** P0 - Critical  
**Estimated Effort:** 4 hours

**Tasks:**
1. Implement `RegisterNetbooks` instruction:
   - Validate caller has FABRICANTE_ROLE
   - Accept arrays: serial_numbers, batch_ids, model_specs
   - Check for duplicate serial numbers
   - Create Netbook accounts via PDAs
   - Assign incremental token IDs
   - Emit `NetbooksRegistered` event

2. PCA derivation for Netbook accounts:
   ```rust
   pub fn netbook_pda(serial_number: &str) -> (Pubkey, u8) {
       Pubkey::find_program_address(
           &[b"netbook", serial_number.as_bytes()],
           &program_id
       )
   }
   ```

3. Input validation:
   - Array length matching
   - String length limits
   - Empty string checks

4. Events:
   ```rust
   pub struct NetbooksRegistered {
       pub count: u64,
       pub token_ids: Vec<u64>,
       pub timestamp: u64,
   }
   ```

**Solidity Reference:** [`SupplyChainTracker.sol:333-388`](sc/src/SupplyChainTracker.sol:333)

---

### Phase 6: Hardware Audit Instruction

**GitHub Issue:** [#5 - Hardware Audit Instruction](https://github.com/87maxi/SupplyChainTracker-solana-/issues/5)  
**Priority:** P1 - High  
**Estimated Effort:** 3 hours

**Tasks:**
1. Implement `AuditHardware` instruction:
   - Validate caller has AUDITOR_HW_ROLE
   - Look up netbook by serial number (PDA)
   - Verify state is FABRICADA
   - Update netbook state to HW_APROBADO
   - Store auditor pubkey, passed flag, report hash
   - Emit `HardwareAudited` event

2. State transition validation:
   ```rust
   pub fn validate_state_transition(current: NetbookState, new: NetbookState) -> Result<()> {
       match (current, new) {
           (NetbookState::Fabricada, NetbookState::HwAprobado) => Ok(()),
           _ => Err(ProgramError::InvalidState),
       }
   }
   ```

3. Events:
   ```rust
   pub struct HardwareAudited {
       pub serial_number: String,
       pub passed: bool,
       pub auditor: Pubkey,
       pub timestamp: u64,
   }
   ```

**Solidity Reference:** [`SupplyChainTracker.sol:403-425`](sc/src/SupplyChainTracker.sol:403)

---

### Phase 7: Software Validation Instruction

**GitHub Issue:** [#6 - Software Validation Instruction](https://github.com/87maxi/SupplyChainTracker-solana-/issues/6)  
**Priority:** P1 - High  
**Estimated Effort:** 3 hours

**Tasks:**
1. Implement `ValidateSoftware` instruction:
   - Validate caller has TECNICO_SW_ROLE
   - Look up netbook by serial number
   - Verify state is HW_APROBADO
   - Update netbook state to SW_VALIDADO
   - Store OS version, technician pubkey, validation flag
   - Emit `SoftwareValidated` event

2. Events:
   ```rust
   pub struct SoftwareValidated {
       pub serial_number: String,
       pub os_version: String,
       pub passed: bool,
       pub technician: Pubkey,
       pub timestamp: u64,
   }
   ```

**Solidity Reference:** [`SupplyChainTracker.sol:439-463`](sc/src/SupplyChainTracker.sol:439)

---

### Phase 8: Student Assignment Instruction

**GitHub Issue:** [#7 - Student Assignment Instruction](https://github.com/87maxi/SupplyChainTracker-solana-/issues/7)  
**Priority:** P1 - High  
**Estimated Effort:** 3 hours

**Tasks:**
1. Implement `AssignToStudent` instruction:
   - Validate caller has ESCUELA_ROLE
   - Look up netbook by serial number
   - Verify state is SW_VALIDADO
   - Store hashed school and student IDs (PII protection)
   - Update state to DISTRIBUIDA
   - Set distribution timestamp
   - Emit `NetbookAssigned` event

2. Events:
   ```rust
   pub struct NetbookAssigned {
       pub serial_number: String,
       pub destination_school_hash: [u8; 32],
       pub student_id_hash: [u8; 32],
       pub school: Pubkey,
       pub timestamp: u64,
   }
   ```

**Solidity Reference:** [`SupplyChainTracker.sol:477-501`](sc/src/SupplyChainTracker.sol:477)

---

### Phase 9: View/Query Instructions

**GitHub Issue:** [#8 - View/Query Instructions](https://github.com/87maxi/SupplyChainTracker-solana-/issues/8)  
**Priority:** P2 - Medium  
**Estimated Effort:** 4 hours

**Tasks:**
1. Implement view functions as Anchor `#[view]` or client-side queries:
   - `getNetbookState(serial)` → NetbookState
   - `getNetbookReport(serial)` → Full Netbook struct
   - `getAllSerialNumbers()` → Vec<String>
   - `getNetbooksByState(state)` → Vec<String>
   - `getRoleMembers(role)` → Vec<Pubkey>
   - `totalNetbooks()` → u64
   - `getRoleByName(role_type)` → Pubkey

2. Create index accounts for efficient querying:
   - `SerialNumberIndex` - Maps serial → netbook PDA
   - `StateIndex` - Maps state → Vec<serial>

3. Client-side query helpers in TypeScript

**Solidity Reference:** [`SupplyChainTracker.sol:509-576`](sc/src/SupplyChainTracker.sol:509)

---

### Phase 10: Testing Framework Setup

**GitHub Issue:** [#9 - Testing Framework Setup](https://github.com/87maxi/SupplyChainTracker-solana-/issues/9)  
**Priority:** P0 - Critical  
**Estimated Effort:** 3 hours

**Tasks:**
1. Set up Anchor test framework in `sc-solana/tests/`:
   - Configure TypeScript/Node.js test environment
   - Add helper utilities for account creation
   - Set up role management test helpers

2. Create test constants:
   ```typescript
   const ROLES = {
     FABRICANTE: 'FABRICANTE',
     AUDITOR_HW: 'AUDITOR_HW',
     TECNICO_SW: 'TECNICO_SW',
     ESCUELA: 'ESCUELA',
   };
   ```

3. Test utility functions:
   - `createSigner()` - Generate test keys
   - `grantRole()` - Helper for role grants
   - `advanceTime()` - Solana clock manipulation

4. Configure test network (localnet/ANVIL)

---

### Phase 11: Integration Tests (Full Lifecycle)

**GitHub Issue:** [#10 - Integration Tests (Full Lifecycle)](https://github.com/87maxi/SupplyChainTracker-solana-/issues/10)  
**Priority:** P0 - Critical  
**Estimated Effort:** 6 hours

**Test Cases (mapped from Solidity tests):**

| # | Test Case | Solidity Source |
|---|-----------|-----------------|
| 1 | Full lifecycle: register → audit → validate → assign | [`Functional.t.sol:77-137`](sc/test/SupplyChainTracker/Functional.t.sol:77) |
| 2 | Batch registration success | [`Functional.t.sol:124-148`](sc/test/SupplyChainTracker/Functional.t.sol:124) |
| 3 | State transition: skip audit not allowed | [`Exhaustive.t.sol:234-258`](sc/test/SupplyChainTracker/Exhaustive.t.sol:234) |
| 4 | State transition: skip validation not allowed | [`Exhaustive.t.sol:259-285`](sc/test/SupplyChainTracker/Exhaustive.t.sol:259) |
| 5 | Query netbooks by state | [`Exhaustive.t.sol:287-319`](sc/test/SupplyChainTracker/Exhaustive.t.sol:287) |
| 6 | Role request full flow | [`Exhaustive.t.sol:335-375`](sc/test/SupplyChainTracker/Exhaustive.t.sol:335) |

---

### Phase 12: Security & Edge Case Tests

**GitHub Issue:** [#11 - Security & Edge Case Tests](https://github.com/87maxi/SupplyChainTracker-solana-/issues/11)  
**Priority:** P1 - High  
**Estimated Effort:** 5 hours

**Test Cases:**

| # | Test Case | Solidity Source |
|---|-----------|-----------------|
| 1 | Unauthorized role grant rejected | [`Security.t.sol:60-72`](sc/test/SupplyChainTracker/Security.t.sol:60) |
| 2 | Unauthorized role revoke rejected | [`Security.t.sol:74-86`](sc/test/SupplyChainTracker/Security.t.sol:74) |
| 3 | Unauthorized registration rejected | [`Security.t.sol:88-107`](sc/test/SupplyChainTracker/Security.t.sol:88) |
| 4 | Unauthorized audit rejected | [`Security.t.sol:109-132`](sc/test/SupplyChainTracker/Security.t.sol:109) |
| 5 | Duplicate serial number rejected | [`EdgeCases.t.sol:78-98`](sc/test/SupplyChainTracker/EdgeCases.t.sol:78) |
| 6 | Empty serial rejected | [`EdgeCases.t.sol:60-76`](sc/test/SupplyChainTracker/EdgeCases.t.sol:60) |
| 7 | Audit before registration rejected | [`EdgeCases.t.sol:123-129`](sc/test/SupplyChainTracker/EdgeCases.t.sol:123) |
| 8 | Invalid state transition rejected | [`EdgeCases.t.sol:131-164`](sc/test/SupplyChainTracker/EdgeCases.t.sol:131) |
| 9 | Array mismatch in registration | [`Fuzzing.t.sol:118-139`](sc/test/SupplyChainTracker/Fuzzing.t.sol:118) |
| 10 | Fuzzing: full lifecycle with random serial | [`Fuzzing.t.sol:56-98`](sc/test/SupplyChainTracker/Fuzzing.t.sol:56) |

---

### Phase 13: Deployment Scripts & Migration

**GitHub Issue:** [#12 - Deployment Scripts & Migration](https://github.com/87maxi/SupplyChainTracker-solana-/issues/12)  
**Priority:** P1 - High  
**Estimated Effort:** 3 hours

**Tasks:**
1. Update `sc-solana/Anchor.toml`:
   ```toml
   [programs.devnet]
   sc_solana = "CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS"
   
   [programs.mainnet]
   sc_solana = "CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS"
   
   [provider]
   cluster = "devnet"
   wallet = "~/.config/solana/id.json"
   ```

2. Update migration script `sc-solana/migrations/deploy.ts`:
   - Initialize program
   - Set up initial roles
   - Verify deployment

3. Create deployment verification script

4. Update `package.json` with deployment scripts:
   ```json
   {
     "scripts": {
       "build": "anchor build",
       "test": "anchor test",
       "deploy:localnet": "anchor deploy --provider.cluster localnet",
       "deploy:devnet": "anchor deploy --provider.cluster devnet",
       "verify": "anchor run verify"
     }
   }
   ```

---

### Phase 14: Complete Migration Implementation & Integration

**GitHub Issue:** [#13 - Complete Migration Implementation](https://github.com/87maxi/SupplyChainTracker-solana-/issues/13)  
**Priority:** P0 - Critical  
**Estimated Effort:** Full project (~52 hours)

This is the umbrella issue for the entire Ethereum to Solana migration. It encompasses all phases and serves as the master tracking issue.

---

## File Structure Target

```
sc-solana/
├── Anchor.toml                    # Anchor configuration
├── Cargo.toml                     # Workspace dependencies
├── package.json                   # Node.js dependencies & scripts
├── rust-toolchain.toml            # Rust toolchain version
├── tsconfig.json                  # TypeScript configuration
├── README.md                      # Project documentation
├── ROADMAP.md                     # This file
│
├── programs/
│   └── sc-solana/
│       ├── Cargo.toml             # Program dependencies
│       └── src/
│           ├── lib.rs             # Main program entry
│           ├── accounts.rs        # Account structs
│           ├── instructions.rs    # Instruction handlers
│           ├── state.rs           # On-chain state
│           ├── errors.rs          # Custom errors
│           └── constants.rs       # Role constants
│
├── tests/
│   ├── sc-solana.ts               # Main test file
│   ├── test-helpers.ts            # Test utilities
│   ├── lifecycle.test.ts          # Full lifecycle tests
│   ├── security.test.ts           # Security tests
│   ├── edge-cases.test.ts         # Edge case tests
│   └── fuzzing.test.ts            # Fuzzing tests (if using anchor-test)
│
├── migrations/
│   └── deploy.ts                  # Deployment migration
│
├── idl/                           # Interface definitions
│   └── sc_solana.json
│
└── target/                        # Build artifacts
```

---

## Error Mapping (Solidity → Anchor)

| Solidity Error | Anchor Error |
|----------------|--------------|
| `Unauthorized()` | `ErrorCode::Unauthorized` |
| `DuplicateSerial()` | `ErrorCode::DuplicateSerial` |
| `NetbookNotFound()` | `ErrorCode::NetbookNotFound` |
| `InvalidStateTransition()` | `ErrorCode::InvalidStateTransition` |
| `ArrayLengthMismatch()` | `ErrorCode::ArrayLengthMismatch` |
| `RoleAlreadyGranted()` | `ErrorCode::RoleAlreadyGranted` |
| `RoleNotFound()` | `ErrorCode::RoleNotFound` |
| `InvalidSignature()` | `ErrorCode::InvalidSignature` |

---

## Testing Coverage Goals

| Category | Solidity Tests | Target Solana Tests |
|----------|---------------|---------------------|
| Functional | [`Functional.t.sol`](sc/test/SupplyChainTracker/Functional.t.sol) (138 lines) | `lifecycle.test.ts` |
| Security | [`Security.t.sol`](sc/test/SupplyChainTracker/Security.t.sol) (133 lines) | `security.test.ts` |
| Security Advanced | [`SecurityAdvanced.t.sol`](sc/test/SupplyChainTracker/SecurityAdvanced.t.sol) (99 lines) | `security.test.ts` |
| Edge Cases | [`EdgeCases.t.sol`](sc/test/SupplyChainTracker/EdgeCases.t.sol) (191 lines) | `edge-cases.test.ts` |
| Exhaustive | [`Exhaustive.t.sol`](sc/test/SupplyChainTracker/Exhaustive.t.sol) (377 lines) | `lifecycle.test.ts` |
| Fuzzing | [`Fuzzing.t.sol`](sc/test/SupplyChainTracker/Fuzzing.t.sol) (140 lines) | `fuzzing.test.ts` |

**Total Target:** ~1,078 lines of test code

---

## Key Differences: Ethereum → Solana

| Aspect | Ethereum/Solidity | Solana/Anchor |
|--------|-------------------|---------------|
| **Storage** | SSTORE/SLOAD | PDA accounts with borsh serialization |
| **State** | Contract storage variables | Separate account structs |
| **Access Control** | OpenZeppelin AccessControl | Custom role checks in instructions |
| **Events** | Solidity events | Anchor events (for off-chain indexing) |
| **Execution** | EVM bytecode | BPF bytecode |
| **Transaction Cost** | Gas (ETH) | Lamports (SOL) |
| **Finality** | Probabilistic (~12-15 sec block) | Deterministic (~400 ms block) |
| **Data Size Limit** | ~128 KB per block | ~10 KB per transaction |
| **Randomness** | Not available on-chain | Clock program for timestamps |

---

## Dependencies

```toml
[dependencies]
anchor-lang = "0.32.1"
anchor-spl = "0.32.1"
sha3 = "0.10"
```

---

## Timeline Estimate

| Phase | Estimated Time | Cumulative |
|-------|---------------|------------|
| Phase 2: Core Structure | 2h | 2h |
| Phase 3: State & Data | 4h | 6h |
| Phase 4: Role Management | 6h | 12h |
| Phase 5: Registration | 4h | 16h |
| Phase 6: Hardware Audit | 3h | 19h |
| Phase 7: Software Validation | 3h | 22h |
| Phase 8: Student Assignment | 3h | 25h |
| Phase 9: View/Query | 4h | 29h |
| Phase 10: Test Framework | 3h | 32h |
| Phase 11: Integration Tests | 6h | 38h |
| Phase 12: Security Tests | 5h | 43h |
| Phase 13: Deployment | 3h | 46h |
| Phase 14: Complete Migration | - | - |
| Phase 15: Documentation | 2h | 48h |
| Phase 16: CI/CD Pipeline | 2h | 50h |
| Phase 17: IDL & Client Types | 2h | 52h |
| **Total** | | **~52 hours** |

---

## Notes

1. **String Limits:** Solana has strict account size limits. All strings must be bounded:
   - `serial_number`: max 200 chars
   - `batch_id`: max 100 chars
   - `model_specs`: max 500 chars
   - `os_version`: max 100 chars

2. **PII Protection:** Student IDs and school hashes stored as `[u8; 32]` (SHA-256)

3. **State Machine:** Must enforce strict state transitions in each instruction

4. **Role System:** Unlike Ethereum addresses, Solana uses Pubkeys. Role membership stored as `HashMap<Pubkey, HashSet<Pubkey>>`

5. **Token IDs:** Sequential counter in config account (no ERC-1155, just incremental u64)

---

## Issue Tracking Summary

| Issue | Phase | Description | Priority | Status |
|-------|-------|-------------|----------|--------|
| [#1](https://github.com/87maxi/SupplyChainTracker-solana-/issues/1) | Phase 2 | Anchor Program Core Structure | P0 | Open |
| [#2](https://github.com/87maxi/SupplyChainTracker-solana-/issues/2) | Phase 3 | State & Data Structures (Accounts) | P0 | Open |
| [#3](https://github.com/87maxi/SupplyChainTracker-solana-/issues/3) | Phase 4 | Role Management Implementation | P0 | Open |
| [#4](https://github.com/87maxi/SupplyChainTracker-solana-/issues/4) | Phase 5 | Netbook Registration Instruction | P0 | Open |
| [#5](https://github.com/87maxi/SupplyChainTracker-solana-/issues/5) | Phase 6 | Hardware Audit Instruction | P1 | Open |
| [#6](https://github.com/87maxi/SupplyChainTracker-solana-/issues/6) | Phase 7 | Software Validation Instruction | P1 | Open |
| [#7](https://github.com/87maxi/SupplyChainTracker-solana-/issues/7) | Phase 8 | Student Assignment Instruction | P1 | Open |
| [#8](https://github.com/87maxi/SupplyChainTracker-solana-/issues/8) | Phase 9 | View/Query Instructions | P2 | Open |
| [#9](https://github.com/87maxi/SupplyChainTracker-solana-/issues/9) | Phase 10 | Testing Framework Setup | P0 | Open |
| [#10](https://github.com/87maxi/SupplyChainTracker-solana-/issues/10) | Phase 11 | Integration Tests (Full Lifecycle) | P0 | Open |
| [#11](https://github.com/87maxi/SupplyChainTracker-solana-/issues/11) | Phase 12 | Security & Edge Case Tests | P1 | Open |
| [#12](https://github.com/87maxi/SupplyChainTracker-solana-/issues/12) | Phase 13 | Deployment Scripts & Migration | P1 | Open |
| [#13](https://github.com/87maxi/SupplyChainTracker-solana-/issues/13) | Phase 14 | Complete Migration Implementation | P0 | Open |
| [#14](https://github.com/87maxi/SupplyChainTracker-solana-/issues/14) | Phase 15 | README.md & Project Documentation | P2 | Open |
| [#15](https://github.com/87maxi/SupplyChainTracker-solana-/issues/15) | Phase 16 | CI/CD Pipeline & GitHub Actions | P2 | Open |
| [#16](https://github.com/87maxi/SupplyChainTracker-solana-/issues/16) | Phase 17 | IDL Generation & TypeScript Client Types | P2 | Open |

---

### Phase 14: Complete Migration Implementation & Integration

**GitHub Issue:** [#13 - Complete Migration Implementation](https://github.com/87maxi/SupplyChainTracker-solana-/issues/13)  
**Priority:** P0 - Critical  
**Estimated Effort:** Full project (~52 hours total)

This is the umbrella issue for the entire Ethereum to Solana migration. It encompasses all phases and serves as the master tracking issue.

**Final Deliverables:**

1. Smart Contract (`sc-solana/programs/sc-solana/src/`):
   - `lib.rs` - Main program entry with instruction dispatch
   - `accounts.rs` - Account structs and derive macros
   - `state.rs` - On-chain state definitions
   - `errors.rs` - Custom error codes
   - `constants.rs` - Role constants and validation
   - `instructions.rs` - All instruction handlers

2. Tests (`sc-solana/tests/`):
   - `sc-solana.ts` - Basic initialization test
   - `test-helpers.ts` - Test utility functions
   - `lifecycle.test.ts` - Full lifecycle integration tests
   - `security.test.ts` - Security and access control tests
   - `edge-cases.test.ts` - Edge case and fuzzing tests

3. Deployment & CI/CD:
   - `Anchor.toml` - Anchor configuration
   - `migrations/deploy.ts` - Deployment migration
   - `.github/workflows/test.yml` - CI/CD pipeline

---

### Phase 15: README.md & Project Documentation

**GitHub Issue:** [#14 - README.md & Project Documentation](https://github.com/87maxi/SupplyChainTracker-solana-/issues/14)  
**Priority:** P2 - Medium  
**Estimated Effort:** 2 hours

**Tasks:**
1. Create `sc-solana/README.md` with:
   - Project overview
   - Architecture diagram (Ethereum -> Solana comparison)
   - Getting started guide
   - Installation requirements
   - Development commands
   - Project structure
   - Role definitions
   - State machine diagram
   - API reference

2. Add architecture documentation
3. Create contribution guidelines

---

### Phase 16: CI/CD Pipeline & GitHub Actions

**GitHub Issue:** [#15 - CI/CD Pipeline & GitHub Actions](https://github.com/87maxi/SupplyChainTracker-solana-/issues/15)  
**Priority:** P2 - Medium  
**Estimated Effort:** 2 hours

**Tasks:**
1. Create `.github/workflows/anchor-test.yml`:
   - Format check (cargo fmt)
   - Build verification (anchor build)
   - Test execution (anchor test)
   - Clippy checks (cargo clippy)
   - Binary size reporting

2. Add clippy warnings as errors
3. Add build size check

---

### Phase 17: IDL Generation & TypeScript Client Types

**GitHub Issue:** [#16 - IDL Generation & TypeScript Client Types](https://github.com/87maxi/SupplyChainTracker-solana-/issues/16)  
**Priority:** P2 - Medium  
**Estimated Effort:** 2 hours

**Tasks:**
1. Ensure IDL generation works during `anchor build`
2. Create TypeScript client type definitions from IDL
3. Create client service module for future frontend integration
4. Create IDL export utility

---
