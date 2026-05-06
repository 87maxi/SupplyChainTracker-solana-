# Integration Test Isolation Fix Report

**Date**: 2026-05-06  
**Author**: SupplyChainTracker-Solana Team  
**Status**: In Progress  

## Executive Summary

This report documents the investigation and fix for integration test isolation issues in the SupplyChainTracker-Solana Anchor program. Three tests fail with `Unauthorized` errors when run in isolation using `--grep`, violating the principle of test isolation.

## Problem Statement

### Affected Tests

| # | Test Name | Location | Error Code | Error Message |
|---|-----------|----------|------------|---------------|
| 1 | Cannot assign netbook from wrong state | `sc-solana/tests/sc-solana.ts:860` | 12000 | Caller is not authorized |
| 2 | Cannot assign netbook without school role | `sc-solana/tests/sc-solana.ts:904` | 12000 | Caller is not authorized |
| 3 | Enforces complete state transition flow | `sc-solana/tests/sc-solana.ts:962` | 12000 | Caller is not authorized |

### Error Details

```
Error: AnchorError caused by account: manufacturer. 
Error Code: Unauthorized. 
Error Number: 12000. 
Error Message: Caller is not authorized.
```

## Root Cause Analysis

### 1. Test Isolation Violation

The failing tests depend on shared state (role grants) from earlier tests in the "2. Role Management" section of the test suite. When running with `--grep`, these earlier tests are skipped, leaving the test accounts without the necessary roles.

### 2. Config Initialization Issue

The `before()` hook initializes the config with `admin.publicKey` as the `fabricante` role holder:

```rust
// From initialize instruction
config.fabricante = admin.key();
```

The `before()` hook then checks if the role holder is default before granting:

```typescript
if (config.fabricante.equals(defaultPubkey)) {
  // Grant FABRICANTE role to fabricante account
} else {
  // Skip - config already has a fabricante holder
}
```

Since `config.fabricante` is `admin.publicKey` (not default), the FABRICANTE role is never granted to the `fabricante` account.

### 3. Key Mismatch

When the config already exists from a previous test run:
1. The `before()` hook generates NEW random keypairs for test accounts
2. The config already has role holders from the previous run
3. The `grantRoleToAccount` helper skips granting because the config already has non-default holders
4. The tests use keypairs that have NO roles, causing `Unauthorized` errors

## Test Output Analysis

### Fresh Ledger Run (Expected Behavior)

```
Config initialized in before(): <tx_signature>
Config role holders - Fabricante: <admin_public_key> Auditor: 1111...1111 Tecnico: 1111...1111 Escuela: 1111...1111
Granted FABRICANTE role to <fabricante_public_key>
Granted AUDITOR_HW role to <auditor_public_key>
Granted TECNICO_SW role to <technician_public_key>
Granted ESCUELA role to <school_public_key>
```

### Non-Fresh Ledger Run (Current Issue)

```
Config initialized in before(): <tx_signature>
Config role holders - Fabricante: D7MkzjZonpk6A4ShqQd3QpfwfBW4fnU2b6bpipGbowrU Auditor: 1111...1111 Tecnico: 1111...1111 Escuela: 1111...1111
FABRICANTE role already held by D7MkzjZonpk6A4ShqQd3QpfwfBW4fnU2b6bpipGbowrU
Granted AUDITOR_HW role to 7VB93N8Tc6ALGfRZvotj5KwCizHtVwyReggWhQZR5ZRz
Granted TECNICO_SW role to K9pqkMdrDM63scoCXquJVnRmZVTdqaiPtKrPKrgGSmm
Granted ESCUELA role to 3mJ6VtM8jqmCSBaokGE4GbYx5dswtVNKBqrf3cUNiSay

Error: AnchorError caused by account: manufacturer. Error Code: Unauthorized. Error Number: 12000.
```

The config has `fabricante` role held by `D7MkzjZonpk6A4ShqQd3QpfwfBW4fnU2b6bpipGbowrU` (which is `admin.publicKey`), but the test uses a NEW keypair `fabricante.publicKey` that doesn't have the FABRICANTE role.

## Solutions Evaluated

### Solution 1: Always Start with Fresh Ledger (Recommended)

**Pros**:
- Simplest approach
- Ensures clean state for every test run
- No code changes required

**Cons**:
- Requires modifying the test runner script
- May slow down test execution

**Implementation**:
```bash
# In package.json test script
"test": "pkill -f solana-test-validator 2>/dev/null; rm -rf /tmp/sc-test-ledger && solana-test-validator ... && yarn run ts-mocha ..."
```

### Solution 2: Fix the `before()` Hook Logic

**Pros**:
- More robust test setup
- Works with both fresh and non-fresh ledgers
- No external dependencies

**Cons**:
- Requires code changes to the `before()` hook
- May introduce complexity

**Implementation**:
```typescript
// After initialize(), ALWAYS grant FABRICANTE role to fabricante account
await program.methods.grantRole(FABRICANTE_ROLE)
  .accountsStrict({
    config: configPda,
    admin: admin.publicKey,
    accountToGrant: fabricante.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([admin, fabricante])
  .rpc()
  .catch(async (err: any) => {
    if (!err.message?.includes("RoleAlreadyGranted")) {
      console.log("Error granting FABRICANTE role:", err.message);
    }
  });
```

### Solution 3: Use Existing Role Holders

**Pros**:
- Preserves existing state
- No ledger deletion required

**Cons**:
- Complex implementation
- Requires storing keypairs or deriving them deterministically
- May introduce security concerns

## Recommended Action

Implement **Solution 2** (Fix the `before()` Hook Logic) as the primary fix, combined with **Solution 1** (Fresh Ledger) as a safety net for CI/CD pipelines.

## Files Modified

| File | Change |
|------|--------|
| `sc-solana/tests/sc-solana.ts` | Modified `before()` hook to always grant FABRICANTE role after initialization |
| `.github/ISSUE_TEMPLATE/999-test-isolation-issue.md` | Created detailed GitHub issue template |

## Testing

### Test Commands

```bash
# Run full test suite
yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/**/*.ts"

# Run failing tests in isolation
yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/sc-solana.ts" --grep "Cannot assign netbook from wrong state|Cannot assign netbook without school role|Enforces complete state transition flow"

# Run with fresh ledger
pkill -f solana-test-validator 2>/dev/null; rm -rf /tmp/sc-test-ledger && solana-test-validator --bpf-program CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS /path/to/sc_solana.so --ledger /tmp/sc-test-ledger --bind-address 127.0.0.1 && yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/sc-solana.ts" --grep "Cannot assign netbook from wrong state"
```

### Expected Results

After implementing Solution 2:
- All 3 failing tests should pass when run in isolation
- All 3 failing tests should pass when run as part of the full suite
- No regressions in other tests

## Related Issues

- GitHub Issue: [#999](https://github.com/87maxi/SupplyChainTracker-solana-/issues/999) (template created)
- Related to: Issue #85-#90 (IDL, imports, TypeScript, Rust fixes)
- Related to: Issue #91-#92 (ESLint fixes)

## Appendix

### Anchor Error Codes Reference

| Code | Name | Description |
|------|------|-------------|
| 12000 | Unauthorized | Caller is not authorized for this operation |
| 12001 | InvalidStateTransition | State transition is not allowed |
| 12003 | InvalidInput | Input validation failed |
| 12005 | ArrayLengthMismatch | Array lengths don't match |
| 12006 | RoleAlreadyGranted | Role is already granted to this account |
| 12009 | EmptySerial | Serial number cannot be empty |
| 12010 | StringTooLong | String exceeds maximum length |
| 3012 | AccountNotInitialized | Account not initialized |
| 2001 | ConstraintHasOne | has_one constraint violated |

### Program Information

- **Program ID**: `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS`
- **Framework**: Anchor v0.32.1
- **Test Runner**: ts-mocha
- **Language**: Rust (BPF)

### Netbook State Machine

```
Fabricada (0) → HwAprobado (1) → SwValidado (2) → Distribuida (3)
```

### Role Types

| Role | Description |
|------|-------------|
| FABRICANTE | Manufacturer - can register netbooks |
| AUDITOR_HW | Hardware Auditor - can audit hardware |
| TECNICO_SW | Software Technician - can validate software |
| ESCUELA | School - can assign to students |
