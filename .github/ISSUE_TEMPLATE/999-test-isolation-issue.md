---
name: Integration Test Isolation Issue - Unauthorized Errors
about: Tests fail with Unauthorized errors when run in isolation due to test isolation problems with role-based access control
title: '[TEST] Integration tests fail with Unauthorized errors when run in isolation'
labels: 'bug, tests, integration'
assignees: ''
---

# Integration Test Isolation Issue - Unauthorized Errors

## Summary

The integration test suite for the SupplyChainTracker Solana Anchor program has **3 failing tests** that fail with `Unauthorized` (Error Code: 12000) errors when run in isolation using `--grep`. These tests depend on shared state (role grants) from earlier tests in the test suite, violating the principle of test isolation.

## Failing Tests

### 1. "Cannot assign netbook from wrong state"
- **Location**: [`sc-solana/tests/sc-solana.ts:860-902`](sc-solana/tests/sc-solana.ts#L860)
- **Error**: `AnchorError caused by account: manufacturer. Error Code: Unauthorized. Error Number: 12000.`
- **Expected behavior**: Test should register a netbook and verify that assignment fails when the netbook is in `Fabricada` state (not `SwValidado`)
- **Actual behavior**: Test fails at the registration step because the `fabricante` account does not have the `FABRICANTE` role

### 2. "Cannot assign netbook without school role"
- **Location**: [`sc-solana/tests/sc-solana.ts:904-959`](sc-solana/tests/sc-solana.ts#L904)
- **Error**: `AnchorError caused by account: manufacturer. Error Code: Unauthorized. Error Number: 12000.`
- **Expected behavior**: Test should verify that only accounts with `ESCUELA` role can assign netbooks to students
- **Actual behavior**: Test fails at the registration step because the `fabricante` account does not have the `FABRICANTE` role

### 3. "Enforces complete state transition flow"
- **Location**: [`sc-solana/tests/sc-solana.ts:962-1030`](sc-solana/tests/sc-solana.ts#L962)
- **Error**: `AnchorError caused by account: manufacturer. Error Code: Unauthorized. Error Number: 12000.`
- **Expected behavior**: Test should verify the full lifecycle: `Fabricada -> HwAprobado -> SwValidado -> Distribuida`
- **Actual behavior**: Test fails at the registration step because the `fabricante` account does not have the `FABRICANTE` role

## Root Cause Analysis

### The Problem

The three failing tests all follow this pattern:
1. Generate random keypairs for test accounts (`fabricante`, `auditor`, `technician`, `school`)
2. Attempt to grant roles to these accounts via the `grantRoleToAccount` helper
3. Use these accounts to test netbook lifecycle operations

The `grantRoleToAccount` helper checks if the config already has a role holder before granting:

```typescript
// From sc-solana/tests/sc-solana.ts
const config = await program.account.supplyChainConfig.fetch(configPda);
let existingHolder: anchor.web3.PublicKey | null = null;
if (role === FABRICANTE_ROLE) existingHolder = config.fabricante;
// ...

// If config already has a non-default holder, skip (can't grant to different account)
if (existingHolder && !existingHolder.equals(defaultPubkey)) {
  console.log(`Role ${role} already held by ${existingHolder.toString()}, skipping grant to ${account.publicKey.toString()}`);
  return;
}
```

When the config already exists from a previous test run:
1. The `before()` hook generates NEW random keypairs for test accounts
2. The config already has role holders from the previous run
3. The `grantRoleToAccount` helper skips granting because the config already has non-default holders
4. The tests use keypairs that have NO roles, causing `Unauthorized` errors

### Why It Works When Running the Full Suite

When running the full test suite (`yarn run ts-mocha "tests/**/*.ts"`), the earlier tests in the "2. Role Management" section grant roles to the accounts generated in the `before()` hook. This means the `fabricante`, `auditor`, `technician`, and `school` accounts have the necessary roles when the failing tests run.

However, when running with `--grep` to isolate specific tests, the "2. Role Management" tests don't run, so the roles are never granted.

### The Config Initialization Flow

```rust
// From sc-solana/programs/sc-solana/src/state/config.rs
pub struct SupplyChainConfig {
    pub admin: Pubkey,
    pub fabricante: Pubkey,      // Set to admin in initialize()
    pub auditor_hw: Pubkey,      // Default (zero) pubkey
    pub tecnico_sw: Pubkey,      // Default (zero) pubkey
    pub escuela: Pubkey,         // Default (zero) pubkey
    // ...
}
```

When `initialize()` is called:
- `config.fabricante` is set to `admin.publicKey`
- `config.auditor_hw`, `config.tecnico_sw`, `config.escuela` are set to default (zero) pubkeys

The `before()` hook then checks:
```typescript
if (config.fabricante.equals(defaultPubkey)) {
  // Grant FABRICANTE role to fabricante account
} else {
  // Skip - config already has a fabricante holder (admin)
}
```

Since `config.fabricante` is `admin.publicKey` (not default), the FABRICANTE role is never granted to the `fabricante` account.

## Test Output Example

```
Config initialized in before(): 4L5HNWupL2ENPXsXSoQAWLfct5F9b9ZMSt8XgajmQy22cFwSGM5ebW6NbdXYBNLsTV18yNdmi61gtVxe3MvCttmc
Config role holders - Fabricante: D7MkzjZonpk6A4ShqQd3QpfwfBW4fnU2b6bpipGbowrU Auditor: 11111111111111111111111111111111 Tecnico: 11111111111111111111111111111111 Escuela: 11111111111111111111111111111111
FABRICANTE role already held by D7MkzjZonpk6A4ShqQd3QpfwfBW4fnU2b6bpipGbowrU
Granted AUDITOR_HW role to 7VB93N8Tc6ALGfRZvotj5KwCizHtVwyReggWhQZR5ZRz
Granted TECNICO_SW role to K9pqkMdrDM63scoCXquJVnRmZVTdqaiPtKrPKrgGSmm
Granted ESCUELA role to 3mJ6VtM8jqmCSBaokGE4GbYx5dswtVNKBqrf3cUNiSay

Error: AnchorError caused by account: manufacturer. Error Code: Unauthorized. Error Number: 12000. Error Message: Caller is not authorized.
```

The config has `fabricante` role held by `D7MkzjZonpk6A4ShqQd3QpfwfBW4fnU2b6bpipGbowrU` (which is `admin.publicKey`), but the test uses a NEW keypair `fabricante.publicKey` that doesn't have the FABRICANTE role.

## Reproduction Steps

1. Start a fresh validator:
   ```bash
   solana-test-validator --bpf-program 7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN /path/to/sc_solana.so --ledger /tmp/sc-test-ledger --bind-address 127.0.0.1
   ```

2. Run the full test suite once (to initialize config with roles):
   ```bash
   yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/sc-solana.ts"
   ```

3. Run the failing tests in isolation (they will fail):
   ```bash
   yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/sc-solana.ts" --grep "Cannot assign netbook from wrong state|Cannot assign netbook without school role|Enforces complete state transition flow"
   ```

## Proposed Solutions

### Solution 1: Always Start with Fresh Ledger (Recommended)

Modify the test runner to always delete the ledger before running tests:

```bash
# In package.json test script
"test": "pkill -f solana-test-validator 2>/dev/null; rm -rf /tmp/sc-test-ledger && solana-test-validator ... && yarn run ts-mocha ..."
```

This ensures the config is always initialized fresh, and the `before()` hook can properly grant roles.

### Solution 2: Fix the `before()` Hook Logic

Change the `before()` hook to ALWAYS grant the FABRICANTE role to the `fabricante` account after initialization, regardless of whether the config already has a holder:

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

This works because `grant_role` simply overwrites the existing holder when called by admin.

### Solution 3: Use Existing Role Holders

When the config already exists, use the existing role holder public keys as the test accounts. This requires storing the keypairs or deriving them deterministically.

## Environment

- **Anchor**: v0.32.1
- **Solana**: Latest stable
- **Test Runner**: ts-mocha
- **Program ID**: `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN`

## Related Files

- [`sc-solana/tests/sc-solana.ts`](sc-solana/tests/sc-solana.ts) - Main integration test file
- [`sc-solana/programs/sc-solana/src/instructions/role/grant.rs`](sc-solana/programs/sc-solana/src/instructions/role/grant.rs) - Grant role instruction
- [`sc-solana/programs/sc-solana/src/state/config.rs`](sc-solana/programs/sc-solana/src/state/config.rs) - Config state definition
- [`sc-solana/programs/sc-solana/src/instructions/netbook/assign.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/assign.rs) - Assign instruction (where Unauthorized is checked)

## Notes

The `grant_role` instruction in [`grant.rs`](sc-solana/programs/sc-solana/src/instructions/role/grant.rs:19) has `has_one = admin` on the config account, meaning the admin signer must be in the config's admin field. This allows admin to overwrite any role holder by calling `grant_role` with the new account.
