# Issue #208: Anchor 1.0 IDL spec 0.1.0 incompatible with @coral-xyz/anchor and @anchor-lang/core

**GitHub Issue:** https://github.com/87maxi/SupplyChainTracker-solana-/issues/208

## Summary

The TypeScript test suite fails because Anchor 1.0 generates IDL in **spec 0.1.0** format, which is incompatible with both `@coral-xyz/anchor@0.32.1` AND `@anchor-lang/core@1.0.2`. The `sendAndConfirm` method in both packages throws `"Unknown action 'undefined'"` when processing transactions built from spec 0.1.0 IDLs.

**Root Cause**: Anchor 1.0 IDL spec 0.1.0 introduces a new instruction encoding format with discriminators and PDA seed `kind` fields that the TypeScript client's instruction coder cannot parse, resulting in `undefined` action being passed to `sendAndConfirm`.

## Environment

| Component | Version | Status |
|-----------|---------|--------|
| Anchor CLI | 1.0.0 | ✅ Working |
| anchor-lang (Rust) | 1.0.2 | ✅ Working |
| @coral-xyz/anchor (tests) | 0.32.1 | ❌ Incompatible |
| @anchor-lang/core (tests) | 1.0.2 | ❌ Incompatible - Same error |
| @anchor-lang/core (web) | 1.0.2 | ❌ Same error |

## Error Details

### Primary Error: "Unknown action 'undefined'"

```
Error: Unknown action 'undefined'
    at AnchorProvider.sendAndConfirm (node_modules/@anchor-lang/core/src/provider.ts:196:31)
    at processTicksAndRejections (node:internal/process/task_queues:103:5)
```

**Affects**: All 34 failing tests that call `program.methods.*().rpc()`.

### Secondary Errors (cascading from primary)
- `AccountNotInitialized` (3012) - Config can't be initialized due to primary error
- `IDL not found for program` - Registry can't find program with spec 0.1.0 format
- `unknown signer` - Transaction building fails due to malformed instruction data

## Test Results

```
anchor run test

Results: 62 passing, 34 failing

Passing (62):
- Unit Tests (32 tests) - Space calculations, PDA derivation, enum values
- Deployer PDA - fund_deployer creation, PDA derivation consistency
- PDA Derivation Security (28 tests) - Deterministic PDAs, collision resistance

Failing (34):
- 20 tests: "Unknown action 'undefined'" - IDL parsing failure
- 10 tests: "AccountNotInitialized" - Cascading from initialization failure
- 1 test: "unknown signer" - Signer not available in wallet
- 3 tests: "IDL not found" - Registry lookup failure
```

## IDL Format Comparison

### Anchor 0.29.x IDL (Compatible with @coral-xyz/anchor)
```json
{
  "version": "0.1.0",
  "name": "sc_solana",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [...]
    }
  ]
}
```

### Anchor 1.0 IDL (Incompatible with all TS clients)
```json
{
  "address": "7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb",
  "metadata": {
    "name": "sc_solana",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "initialize",
      "discriminator": [175, 175, 109, 31, 13, 152, 155, 237],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              { "kind": "const", "value": [99, 111, 110, 102, 105, 103] }
            ]
          }
        }
      ]
    }
  ]
}
```

**Key Differences:**
1. New `metadata.spec: "0.1.0"` field
2. Instructions have `discriminator` arrays (8-byte instruction discriminators)
3. PDA seeds use `kind` field (`"const"`, `"account"`) instead of direct values
4. Account structure is more verbose with explicit `writable`, `signer`, `pda` fields

## Attempted Solutions

### Attempt 1: Migrate to @anchor-lang/core@1.0.2
**Result:** ❌ Failed - Same "Unknown action 'undefined'" error at `provider.ts:196:31`.

### Attempt 2: Replace @coral-xyz/anchor with @anchor-lang/core in package.json
**Result:** ❌ Failed - Both packages share the same instruction coder that can't parse spec 0.1.0.

### Attempt 3: Manual IDL conversion
**Result:** ❌ Not feasible - `anchor idl convert` only converts legacy → new, not new → legacy.

## Required Solution

### Option A: Migrate to Codama Clients (Recommended)
- Generate typed TypeScript clients using Codama CLI
- Compatible with Anchor 1.0 IDL spec 0.1.0
- Requires rewriting all 17 test files + 4 web service files
- **Status**: Codama CLI not yet installed; requires `npm install -g @codama/cli`

### Option B: Downgrade to Anchor 0.30.x
- Revert to Anchor CLI 0.30.x
- IDL format compatible with @coral-xyz/anchor
- Loses Anchor 1.0 improvements
- **Risk**: May break program compilation if Rust code uses Anchor 1.0 features

### Option C: Use @solana/kit directly
- Bypass Anchor client entirely
- Build transactions manually with @solana/kit
- More control but more code
- **Effort**: High - requires manual Borsh serialization for all instructions

## Files Affected

### Test Files (17 files)
All in `sc-solana/tests/`:
- `shared-init.ts`, `test-helpers.ts`, `test-isolation.ts`
- `sc-solana.ts`, `deployer-pda.ts`, `batch-registration.ts`
- `edge-cases.ts`, `integration-full-lifecycle.ts`, `lifecycle.ts`
- `overflow-protection.ts`, `pda-derivation.ts`, `query-instructions.ts`
- `rbac-consistency.ts`, `role-enforcement.ts`, `role-management.ts`
- `state-machine.ts`, `unit-tests.ts`

### Web Frontend (5 files)
All in `web/src/`:
- `services/UnifiedSupplyChainService.ts` - Line 11
- `services/SolanaSupplyChainService.ts` - Line 6
- `hooks/useSupplyChainService.ts` - Line 9
- `lib/contracts/solana-program.ts` - Line 4
- `lib/contracts/SupplyChainContract.ts` - Line 9

### Configuration Files
- `sc-solana/package.json` - Line 8: `"@coral-xyz/anchor": "^0.32.1"`
- `web/package.json` - Line 34: `"@anchor-lang/core": "^1.0.2"`

## Reproduction Steps

1. Build program with Anchor 1.0:
   ```bash
   cd sc-solana && anchor build
   ```

2. Run tests:
   ```bash
   cd sc-solana && anchor run test
   ```

3. Observe errors:
   - "Unknown action 'undefined'" in 20+ tests
   - "IDL not found" in 5 test suites
   - "AccountNotInitialized" in cascading failures

## Blockers

- ❌ Cannot run integration tests
- ❌ Cannot deploy via txtx runbooks
- ❌ Frontend cannot interact with program (same error)
- ❌ CI/CD pipeline broken

## Labels

`bug`, `blocker`, `anchor-1.0`, `typescript`, `testing`, `dependency`

## Priority

**CRITICAL** - Blocks all integration testing and deployment workflows.
