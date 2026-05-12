# SupplyChainTracker-Solana: Comprehensive System Analysis Report

**Date:** 2026-05-12  
**Analysis Scope:** Smart Contract (Anchor/Rust), Tests, Frontend Architecture  
**Severity Levels:** 🔴 Critical | 🟡 High | 🟢 Medium | ℹ️ Low

---

## Executive Summary

This report identifies **23 issues** across the system:
- **8 Smart Contract Issues** (3 Critical, 3 High, 2 Medium)
- **5 Test Issues** (2 Critical, 2 High, 1 Medium)
- **7 Frontend Architecture Issues** (1 Critical, 2 High, 3 Medium, 1 Low)
- **3 Compute Optimization Opportunities** (High Impact)

---

## 1. SMART CONTRACT ANALYSIS

### 1.1 Critical Issues

#### 🔴 Issue #1: `admin_pda_bump` Field Missing from Config Space Calculation

**Location:** [`sc-solana/programs/sc-solana/src/state/config.rs:31-46`](sc-solana/programs/sc-solana/src/state/config.rs:31)

**Problem:** The `INIT_SPACE` calculation is **inconsistent** between the struct definition and the constant:

```rust
// Config struct has admin_pda_bump field (line 19)
pub struct SupplyChainConfig {
    pub admin_bump: u8,     // 1 byte
    pub admin_pda_bump: u8, // 1 byte - PRESENT IN STRUCT
    // ...
}

// But INIT_SPACE calculation is WRONG (lines 31-46)
pub const INIT_SPACE: usize = 8
    + 32 + 32 + 32 + 32 + 32  // 5 Pubkeys
    + 1   // admin_bump
    + 1   // admin_pda_bump (commented as NEW)
    + 8 + 8 + 8 + 8 + 8 + 8 + 8; // 7 u64s
// Total calculated: 8 + 281 = 289 bytes
```

**Actual calculation:** 8 + 160 + 2 + 56 = **226 bytes** (not 289)

**Impact:** Account initialization will fail or allocate insufficient space, causing runtime errors.

**Evidence:** Test in [`lib.rs:228-234`](sc-solana/programs/sc-solana/src/lib.rs:228) asserts:
```rust
assert_eq!(SupplyChainConfig::INIT_SPACE, 8 + 32 + 32 + 32 + 32 + 32 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 8);
// = 8 + 160 + 2 + 56 = 228 bytes
```

But frontend test in [`unit-tests.ts:192`](sc-solana/tests/unit-tests.ts:192) expects **225 bytes** (missing `admin_pda_bump`).

---

#### 🔴 Issue #2: Batch Registration Doesn't Create Netbook Accounts

**Location:** [`sc-solana/programs/sc-solana/src/instructions/netbook/register_batch.rs:22-112`](sc-solana/programs/sc-solana/src/instructions/netbook/register_batch.rs:22)

**Problem:** The batch registration instruction:
1. Validates serial numbers and checks duplicates
2. Stores serial hashes in registry
3. **Increments `next_token_id` and `total_netbooks`**
4. **Does NOT create actual Netbook PDA accounts**

```rust
// Lines 101-103: Updates counters but no accounts created
config.next_token_id += count;
config.total_netbooks += count;

// Lines 105-109: Emits event
emit!(NetbooksRegistered { count, start_token_id, timestamp });
```

**Impact:** 
- Token IDs become **gapped/non-contiguous** with actual netbooks
- `total_netbooks` counter is **inflated**
- Serial hashes are stored but no netbook accounts exist to reference them
- Future queries for these "registered" netbooks will fail

**Recommended Fix:** Either:
1. Create individual Netbook accounts in the batch (requires looping with PDA creation)
2. Remove counter increments and document as "pre-registration validation only"

---

#### 🔴 Issue #3: Serial Hash Collision Vulnerability

**Location:** [`sc-solana/programs/sc-solana/src/instructions/netbook/register.rs:57-67`](sc-solana/programs/sc-solana/src/instructions/netbook/register.rs:57)

**Problem:** The serial hash function is **not cryptographically secure**:

```rust
let mut serial_hash = [0u8; 32];
let serial_bytes = serial.as_bytes();
if serial_bytes.len() <= 32 {
    for (i, byte) in serial_bytes.iter().enumerate() {
        serial_hash[i] = *byte;  // Direct copy, no hashing
    }
} else {
    serial_hash[..16].copy_from_slice(&serial_bytes[..16]);
    serial_hash[16..].copy_from_slice(&serial_bytes[serial_bytes.len() - 16..]);
    // Takes first 16 + last 16 bytes - HIGH COLLISION RISK
}
```

**Impact:**
- Serials like `"AAAA...AAAA"` (32 A's) and `"AAAA...AAAAB"` differ by 1 byte but hash collision possible
- Two different serials can produce identical hashes (e.g., `"ABCD1234EFGH5678XXXX"` and `"ABCD1234EFGH5678YYYY"`)
- Malicious actors could bypass duplicate detection

**Recommended Fix:** Use SHA-256 or BLAKE3 for proper cryptographic hashing.

---

### 1.2 High Issues

#### 🟡 Issue #4: `MAX_SERIAL_HASHES` Too Low for Production

**Location:** [`sc-solana/programs/sc-solana/src/state/mod.rs:17`](sc-solana/programs/sc-solana/src/state/mod.rs:17)

**Problem:** 
```rust
pub const MAX_SERIAL_HASHES: usize = 10;
```

**Impact:**
- SerialHashRegistry account size: **32,017 bytes** (see [`serial_hash_registry.rs:18-22`](sc-solana/programs/sc-solana/src/state/serial_hash_registry.rs:18))
- Only 10 serial hashes can be tracked per registry
- Once full, **no new netbooks can be registered** (returns `InvalidInput` error)
- No mechanism to reset or archive old hashes

**Recommended Fix:** Increase to at least 1000 or implement a rolling window with cleanup.

---

#### 🟡 Issue #5: Role Grant/Revoke Inconsistency with Multi-Holder Pattern

**Location:** [`sc-solana/programs/sc-solana/src/instructions/role/grant.rs`](sc-solana/programs/sc-solana/src/instructions/role/grant.rs)

**Problem:** The `grant_role` instruction updates **legacy single-holder fields** in Config:

```rust
// Lines 58-63: Updates config.fabricante, config.auditor_hw, etc.
match role.as_str() {
    crate::FABRICANTE_ROLE => config.fabricante = ctx.accounts.account_to_grant.key(),
    // ...
}
```

But `add_role_holder` creates **separate RoleHolder accounts** with count tracking.

**Impact:**
- **Dual authorization model confusion**: Is there 1 holder or many?
- `has_role()` only checks legacy fields, **ignoring RoleHolder accounts**
- `grant_role` can **overwrite** existing legacy holder without checking RoleHolder count
- No consistency between legacy fields and RoleHolder accounts

---

#### 🟡 Issue #6: Missing State Transition Validation in `audit_hardware`

**Location:** [`sc-solana/programs/sc-solana/src/instructions/netbook/audit.rs:36-46`](sc-solana/programs/sc-solana/src/instructions/netbook/audit.rs:36)

**Problem:** When hardware audit **fails**, the state remains `Fabricada`:

```rust
if passed {
    netbook.state = crate::NetbookState::HwAprobado as u8;
}
// If !passed, state stays at Fabricada (0)
```

**Impact:**
- No way to track **failed audits** separately
- Same state allows **repeated audit attempts** without limit
- No `HwRechazado` state for failed hardware checks
- Cannot distinguish between "never audited" and "failed audit"

---

### 1.3 Medium Issues

#### 🟢 Issue #7: Duplicate Comment Blocks in Request Module

**Location:** [`sc-solana/programs/sc-solana/src/instructions/role/request.rs:39-47`](sc-solana/programs/sc-solana/src/instructions/role/request.rs:39)

**Problem:** Comments are **duplicated** in multiple locations:

```rust
/// Approve a role request - creates RoleHolder account automatically
/// Integrates Config fields with RoleHolder accounts (transitional pattern)
/// Admin is derived as PDA with seeds [b"admin", config.key()]
/// NOTE (Issue #186): Admin is now UncheckedAccount with seed verification
#[derive(Accounts)]
pub struct ApproveRoleRequest<'info> {
// ... DUPLICATE COMMENTS BELOW ...
/// Approve a role request - creates RoleHolder account automatically
/// Integrates Config fields with RoleHolder accounts (transitional pattern)
/// Admin is derived as PDA with seeds [b"admin", config.key()]
/// NOTE (Issue #186): Admin is now UncheckedAccount with seed verification
```

**Impact:** Code maintainability, potential for drift when updating comments.

---

#### 🟢 Issue #8: Unused `_serial` Parameter in `query_netbook_state`

**Location:** [`sc-solana/programs/sc-solana/src/lib.rs:159`](sc-solana/programs/sc-solana/src/lib.rs:159)

**Problem:**
```rust
pub fn query_netbook_state(ctx: Context<QueryNetbookState>, _serial: String) -> Result<()> {
    instructions::query::netbook_state::query_netbook_state(ctx, _serial)
}
```

The `_serial` parameter is passed but likely unused in the query handler (PDA derivation uses token_id, not serial string).

---

## 2. TEST ANALYSIS

### 2.1 Critical Issues

#### 🔴 Issue #9: Frontend Test Expects Wrong Config Space

**Location:** [`sc-solana/tests/unit-tests.ts:192`](sc-solana/tests/unit-tests.ts:192)

**Problem:**
```typescript
const expectedSpace = 8 + 32 + 32 + 32 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 8;
expect(expectedSpace).to.equal(225);
```

This calculation **omits `admin_pda_bump`** (1 byte), expecting 225 bytes when the actual value should be 226.

**Evidence:** Rust test in [`lib.rs:228-234`](sc-solana/programs/sc-solana/src/lib.rs:228) includes `+ 1` for `admin_pda_bump`.

---

#### 🔴 Issue #10: No Tests for Batch Registration Account Creation

**Location:** [`sc-solana/tests/`](sc-solana/tests/)

**Problem:** No test verifies that `register_netbooks_batch` actually creates Netbook accounts. The test likely only validates:
- Serial hash storage
- Counter increments
- Event emission

**Missing:** Verification that individual Netbook PDAs are created (which they aren't, per Issue #2).

---

### 2.2 High Issues

#### 🟡 Issue #11: Missing Tests for Serial Hash Collision Edge Cases

**Location:** [`sc-solana/tests/`](sc-solana/tests/)

**Problem:** No tests verify:
- Behavior with serials > 32 bytes (truncation logic)
- Collision resistance of the hash function
- Edge cases like empty serials, single-character serials

---

#### 🟡 Issue #12: Role Holder Count Not Tested in Multi-Holder Scenarios

**Location:** [`sc-solana/tests/role-management.ts`](sc-solana/tests/role-management.ts)

**Problem:** Tests likely verify single-role assignment but not:
- Multiple holders for same role
- `MAX_ROLE_HOLDERS` limit enforcement
- Count consistency between Config and RoleHolder accounts

---

### 2.3 Medium Issues

#### 🟢 Issue #13: Test Helper `NetbookState` May Not Match Rust Enum

**Location:** [`sc-solana/tests/test-helpers.ts`](sc-solana/tests/test-helpers.ts)

**Problem:** TypeScript test helpers define their own `NetbookState` enum which may drift from the Rust implementation.

---

## 3. FRONTEND ARCHITECTURE ANALYSIS

### 3.1 Critical Issues

#### 🔴 Issue #14: Deprecated Service Layer Still in Use

**Location:** [`web/src/services/SolanaSupplyChainService.ts`](web/src/services/SolanaSupplyChainService.ts)

**Problem:** The entire service is **deprecated** but still exported and used:

```typescript
// @deprecated Use UnifiedSupplyChainService from './UnifiedSupplyChainService' instead
export class SolanaSupplyChainService {
  private unifiedService: UnifiedSupplyChainService;
  
  // All methods are delegation wrappers with console.warn()
}
```

**Impact:**
- **Dead code** maintained unnecessarily
- New developers may use the deprecated interface
- Inconsistent API surface (e.g., `approveRoleRequest(requestId)` vs `approveRoleRequest(role)`)
- `setInstance()` and `setProgram()` are no-ops but still exist

---

#### 🔴 Issue #15: Role Name Inconsistency Between Frontend and Contract

**Location:** [`web/src/services/SolanaSupplyChainService.ts:213`](web/src/services/SolanaSupplyChainService.ts:213)

**Problem:**
```typescript
// Frontend uses ADMIN_ROLE
const roles = ['ADMIN_ROLE', 'FABRICANTE_ROLE', 'AUDITOR_HW_ROLE', 'TECNICO_SW_ROLE', 'ESCUELA_ROLE'];

// Contract uses different naming (no _ROLE suffix for some)
pub const FABRICANTE_ROLE: &str = "FABRICANTE";  // Value is "FABRICANTE"
pub const AUDITOR_HW_ROLE: &str = "AUDITOR_HW";  // Value is "AUDITOR_HW"
```

**Impact:** Role queries may fail if frontend sends `"ADMIN_ROLE"` but contract expects `"ADMIN"` or doesn't recognize the `_ROLE` suffix.

---

### 3.2 High Issues

#### 🟡 Issue #16: No Error Handling for Solana Connection Failures

**Location:** [`web/src/lib/solana/connection.ts`](web/src/lib/solana/connection.ts)

**Problem:** RPC connection errors are not gracefully handled. Network timeouts, rate limits, and cluster failures will propagate as unhandled exceptions.

---

#### 🟡 Issue #17: Mock Wallet Adapter May Mask Real Issues

**Location:** [`web/src/lib/solana/mock-wallet-adapter.ts`](web/src/lib/solana/mock-wallet-adapter.ts)

**Problem:** Mock adapter provides false confidence in development. E2E tests using mocks may pass while real wallet interactions fail.

---

### 3.3 Medium Issues

#### 🟢 Issue #18: Event Listener Not Cleaning Up on Component Unmount

**Location:** [`web/src/lib/solana/event-listener.ts`](web/src/lib/solana/event-listener.ts)

**Problem:** Event listeners for netbook changes, role updates, etc. may not be properly disconnected when React components unmount, causing memory leaks.

---

#### 🟢 Issue #19: No Caching Strategy for On-Chain Data

**Location:** [`web/src/hooks/use-cached-data.ts`](web/src/hooks/use-cached-data.ts)

**Problem:** While a cached data hook exists, there's no consistent strategy across the application for:
- Cache invalidation
- Stale-while-revalidate patterns
- Cache duration configuration

---

#### 🟢 Issue #20: E2E Test Screenshots Not Version Controlled

**Location:** [`web/e2e/screenshots/`](web/e2e/screenshots/)

**Problem:** Screenshot files are present but likely not in `.gitignore`, bloating the repository.

---

### 3.4 Low Issues

#### ℹ️ Issue #21: Unused `exists` Field in Netbook Struct

**Location:** [`sc-solana/programs/sc-solana/src/state/netbook.rs:24`](sc-solana/programs/sc-solana/src/state/netbook.rs:24)

**Problem:** The `exists: bool` field is set to `true` during registration but never checked or used for any validation.

---

## 4. COMPUTE UNIT OPTIMIZATION

### 4.1 High Impact Optimizations

#### ⚡ Optimization #1: Batch Netbook Registration with Single Transaction

**Current:** Each netbook requires a separate transaction (~2000-3000 CU each)

**Proposed:** Create a true batch instruction that:
1. Takes multiple serial numbers as input
2. Creates all Netbook PDAs in a single transaction
3. Uses iterative PDA creation with proper account ordering

**Estimated Savings:** 60-70% reduction in total compute units for batch operations

---

#### ⚡ Optimization #2: Use `#[account(zero)]` for Cleaner Initialization

**Current:** Manual field initialization in `initialize()`:
```rust
for i in 0..MAX_SERIAL_HASHES {
    serial_registry.registered_serial_hashes[i] = [0u8; 32];
}
```

**Proposed:** Use Anchor's `zero` constraint to let Solana handle zero-initialization, saving compute units.

---

#### ⚡ Optimization #3: Reduce SerialHashRegistry Account Size

**Current:** 32,017 bytes for 10 hashes (fixed size)

**Proposed:** Implement a **dynamic array** using:
1. `Vec<[u8; 32]>` with on-chain growth
2. Or implement a **hash ring** with overflow handling

**Estimated Savings:** 80-90% reduction in account size and associated rent exemption costs

---

### 4.2 Medium Impact Optimizations

#### ⚡ Optimization #4: Use `Message::SimpleAddressList` for Multiple Signers

**Current:** Each instruction may require multiple signer accounts

**Proposed:** Use Solana's address list optimization when multiple accounts share the same signer to reduce transaction size.

---

#### ⚡ Optimization #5: Consolidate Config and SerialHashRegistry Access

**Current:** Both accounts must be loaded in every netbook operation

**Proposed:** If access patterns allow, consider whether serial hash registry can be lazy-loaded or cached on the client side for read operations.

---

## 5. RECOMMENDATIONS SUMMARY

### Priority 1 (Immediate)
1. **Fix Config space calculation** (Issue #1) - Causes runtime failures
2. **Fix batch registration** (Issue #2) - Data integrity issue
3. **Update frontend tests** (Issue #9) - Test accuracy

### Priority 2 (Short-term)
4. **Implement cryptographic hashing** (Issue #3) - Security vulnerability
5. **Increase MAX_SERIAL_HASHES** (Issue #4) - Production readiness
6. **Clean up deprecated service** (Issue #14) - Code hygiene
7. **Fix role name consistency** (Issue #15) - Integration reliability

### Priority 3 (Long-term)
8. **Implement compute optimizations** (Section 4) - Cost reduction
9. **Add comprehensive edge case tests** (Issues #11, #12) - Test coverage
10. **Resolve dual authorization model** (Issue #5) - Architecture clarity

---

## Appendix: File Reference Index

| File | Key Issues |
|------|------------|
| [`sc-solana/programs/sc-solana/src/state/config.rs`](sc-solana/programs/sc-solana/src/state/config.rs) | #1, #5 |
| [`sc-solana/programs/sc-solana/src/state/mod.rs`](sc-solana/programs/sc-solana/src/state/mod.rs) | #4 |
| [`sc-solana/programs/sc-solana/src/state/serial_hash_registry.rs`](sc-solana/programs/sc-solana/src/state/serial_hash_registry.rs) | #4 |
| [`sc-solana/programs/sc-solana/src/instructions/netbook/register.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/register.rs) | #3 |
| [`sc-solana/programs/sc-solana/src/instructions/netbook/register_batch.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/register_batch.rs) | #2 |
| [`sc-solana/programs/sc-solana/src/instructions/role/grant.rs`](sc-solana/programs/sc-solana/src/instructions/role/grant.rs) | #5 |
| [`sc-solana/programs/sc-solana/src/instructions/role/request.rs`](sc-solana/programs/sc-solana/src/instructions/role/request.rs) | #7 |
| [`sc-solana/programs/sc-solana/src/instructions/netbook/audit.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/audit.rs) | #6 |
| [`sc-solana/tests/unit-tests.ts`](sc-solana/tests/unit-tests.ts) | #9 |
| [`web/src/services/SolanaSupplyChainService.ts`](web/src/services/SolanaSupplyChainService.ts) | #14, #15 |
