# Issue #XXX: Runbook Unification - Replace Standalone Scripts with Surfpool/txtx Runbooks

**GitHub Issue:** https://github.com/87maxi/SupplyChainTracker-solana-/issues/XXX

**Date:** 2026-05-15
**Status:** IMPLEMENTED
**Phase:** System Evolution - Operational Consistency

---

## Summary

This issue documents the unification of the SupplyChainTracker's operational interface by replacing all standalone JavaScript/TypeScript scripts in `sc-solana/scripts/` with Surfpool/txtx runbooks. The goal is to establish a single, consistent operational interface for all blockchain interactions, improving maintainability, reducing technical debt, and enabling multi-network deployments through environment-based configuration.

### Problem Statement

The project maintained **6 standalone scripts** using Node.js + @solana/web3.js for operational tasks:
- Scripts required separate runtime dependencies (Node.js, TypeScript)
- Scripts used hardcoded connection URLs and manual account decoding
- Scripts were duplicated in purpose (e.g., `init-quick.mjs` and `init-local.ts`)
- Scripts lacked dependency tracking between operations
- Scripts could not easily target devnet/mainnet without code changes

### Solution

Replace all standalone scripts with **Surfpool/txtx runbooks** that:
- Use the `svm::process_instructions` addon for on-chain interactions
- Leverage environment variables for network configuration
- Support dependency tracking via `depends_on` directives
- Provide consistent interface across localnet, devnet, and mainnet
- Eliminate Node.js runtime dependencies for operations

---

## Evolution Context

### Phase 1: Initial Setup (Completed)
- Created basic Anchor program with RBAC system
- Added standalone scripts for initialization and role management
- Established `sc-solana/scripts/` directory for operational tools

### Phase 2: Runbook Infrastructure (Completed)
- Introduced Surfpool/txtx runbooks for localnet operations
- Created deployment runbooks (`deploy-program`, `initialize-config`, `grant-roles`)
- Established runbook directory structure with templates

### Phase 3: Unification (Current)
- **Replace all standalone scripts with runbooks**
- Deprecate Node.js-based operational scripts
- Document migration paths for existing users

### Phase 4: Future (Planned)
- Extend runbooks for devnet/mainnet deployments
- Add CI/CD integration for automated runbook testing
- Create runbook documentation site

---

## Current State Analysis

### Scripts Being Replaced (`sc-solana/scripts/`)

| Script | Purpose | Technology | Replacement |
|--------|---------|------------|-------------|
| [`init-quick.mjs`](sc-solana/scripts/init-quick.mjs) | Initialize config + fund deployer + grant roles | Node.js + @solana/web3.js | `01-deployment/full-init.tx` |
| [`init-local.ts`](sc-solana/scripts/init-local.ts) | Initialize with Anchor (TypeScript) | Anchor framework | `01-deployment/full-init.tx` |
| [`grant-all-to-wallet.mjs`](sc-solana/scripts/grant-all-to-wallet.mjs) | Grant all 4 roles to single wallet | Node.js + @solana/web3.js | `01-deployment/grant-all-to-deployer.tx` |
| [`grant-roles.mjs`](sc-solana/scripts/grant-roles.mjs) | Grant roles to role keypairs | Node.js + @solana/web3.js | `01-deployment/grant-roles.tx` |
| [`check-roles.mjs`](sc-solana/scripts/check-roles.mjs) | Check on-chain role assignments | Node.js + @solana/web3.js | `02-operations/query/query-roles.tx` |
| [`verify-deployment.mjs`](sc-solana/scripts/verify-deployment.mjs) | Verify deployment consistency | Node.js + @solana/web3.js | `04-testing/verify-deployment.tx` |

### Existing Runbooks (Pre-Unification)

| Runbook | Location | Pre-Existing? |
|---------|----------|---------------|
| `deploy-program` | `01-deployment/deploy-program.tx` | Yes |
| `initialize-config` | `01-deployment/initialize-config.tx` | Yes |
| `grant-roles` | `01-deployment/grant-roles.tx` | Yes |

---

## New Runbooks Created

### 1. `full-init` - Unified Initialization

**Location:** [`01-deployment/full-init.tx`](sc-solana/runbooks/01-deployment/full-init.tx)

**Replaces:** `init-quick.mjs`, `init-local.ts`

**Functionality:**
```
full-init.tx
├── Step 0: Fund deployer PDA (2 SOL)
├── Step 1: Initialize config (creates Config, SerialHashRegistry)
├── Step 2: Grant FABRICANTE role
├── Step 3: Grant AUDITOR_HW role
├── Step 4: Grant TECNICO_SW role
└── Step 5: Grant ESCUELA role
```

**Command:**
```bash
surfpool run full-init --env localnet --browser -f
```

**Benefits:**
- Single command replaces 3 separate commands
- Atomic execution with dependency tracking
- Supports both single-wallet and multi-wallet setups via environment variables

---

### 2. `grant-all-to-deployer` - Single Wallet Setup

**Location:** [`01-deployment/grant-all-to-deployer.tx`](sc-solana/runbooks/01-deployment/grant-all-to-deployer.tx)

**Replaces:** `grant-all-to-wallet.mjs`

**Functionality:**
```
grant-all-to-deployer.tx
├── Grant FABRICANTE to deployer wallet
├── Grant AUDITOR_HW to deployer wallet
├── Grant TECNICO_SW to deployer wallet
└── Grant ESCUELA to deployer wallet
```

**Command:**
```bash
surfpool run grant-all-to-deployer --env localnet --browser -f
```

**Environment Variable:**
```bash
GRANT_ALL_TARGET_KEYPAIR=~/.config/solana/id.json  # Deployer wallet
```

**Use Case:** Development/testing where a single wallet holds all roles

---

### 3. `query-roles` - Role Query

**Location:** [`02-operations/query/query-roles.tx`](sc-solana/runbooks/02-operations/query/query-roles.tx)

**Replaces:** `check-roles.mjs`

**Functionality:**
```
query-roles.tx
├── Query config account (admin, counters)
├── Query FABRICANTE role holders
├── Query AUDITOR_HW role holders
├── Query TECNICO_SW role holders
└── Query ESCUELA role holders
```

**Command:**
```bash
surfpool run query-roles --env localnet --browser -f
```

**Use Case:** Verify role assignments after deployment or during debugging

---

### 4. `verify-deployment` - Deployment Verification

**Location:** [`04-testing/verify-deployment.tx`](sc-solana/runbooks/04-testing/verify-deployment.tx)

**Replaces:** `verify-deployment.mjs`

**Functionality:**
```
verify-deployment.tx
├── Verify program account (exists, executable, data size)
├── Verify Config PDA derivation
├── Verify Deployer PDA derivation
├── Verify config account (owned by program)
└── Verify serial hash registry (owned by program)
```

**Command:**
```bash
surfpool run verify-deployment --env localnet --browser -f
```

**Use Case:** Post-deployment validation to ensure all accounts are correctly initialized

---

## Architecture

### Before Unification

```
┌─────────────────────────────────────────────────────────────┐
│                     Operational Interface                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Node.js Scripts (6)          Surfpool Runbooks (3)          │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │ init-quick.mjs   │         │ deploy-program   │          │
│  │ init-local.ts    │         │ initialize-config│          │
│  │ grant-all-*.mjs  │         │ grant-roles      │          │
│  │ grant-roles.mjs  │         └──────────────────┘          │
│  │ check-roles.mjs  │                    ▲                  │
│  │ verify-*.mjs     │                    │                  │
│  └──────────────────┘                    │                  │
│          ▼                               │                  │
│   @solana/web3.js                       │                  │
│   Hardcoded URLs                        │                  │
│   Manual decoding                       │                  │
└─────────────────────────────────────────────────────────────┘
```

### After Unification

```
┌─────────────────────────────────────────────────────────────┐
│                     Operational Interface                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Unified Surfpool Runbooks (13+)                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ 01-deployment/                                   │       │
│  │  ├── deploy-program.tx                           │       │
│  │  ├── full-init.tx (NEW - replaces 2 scripts)     │       │
│  │  ├── initialize-config.tx                        │       │
│  │  ├── grant-roles.tx                              │       │
│  │  └── grant-all-to-deployer.tx (NEW)              │       │
│  │ 02-operations/                                   │       │
│  │  ├── netbook/                                    │       │
│  │  └── query/                                      │       │
│  │      ├── query-config.tx                         │       │
│  │      ├── query-role.tx                           │       │
│  │      └── query-roles.tx (NEW - replaces 1 script)│       │
│  │ 03-role-management/                              │       │
│  │ 04-testing/                                      │       │
│  │  └── verify-deployment.tx (NEW - replaces 1 script)│     │
│  └──────────────────────────────────────────────────┘       │
│                      ▼                                       │
│             svm::process_instructions                         │
│             Environment-based config                          │
│             Dependency tracking                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Guide

### Quick Migration

| Old Command | New Command |
|-------------|-------------|
| `node scripts/init-quick.mjs` | `surfpool run full-init --env localnet --browser -f` |
| `ts-node scripts/init-local.ts` | `surfpool run full-init --env localnet --browser -f` |
| `node scripts/grant-all-to-wallet.mjs` | `surfpool run grant-all-to-deployer --env localnet --browser -f` |
| `node scripts/grant-roles.mjs` | `surfpool run grant-roles --env localnet --browser -f` |
| `node scripts/check-roles.mjs` | `surfpool run query-roles --env localnet --browser -f` |
| `node scripts/verify-deployment.mjs` | `surfpool run verify-deployment --env localnet --browser -f` |

### Environment Setup

All runbooks use centralized configuration:

```bash
cd sc-solana

# Load central configuration (program_id, keypairs, etc.)
source config/config.env

# Load environment-specific settings
source runbooks/environments/localnet.env   # For localnet
# source runbooks/environments/devnet.env   # For devnet
# source runbooks/environments/mainnet.env  # For mainnet
```

---

## Deprecated Scripts

The following scripts have deprecation notices added to their files:

| Script | Deprecation Notice | Removal Timeline |
|--------|-------------------|------------------|
| `scripts/init-quick.mjs` | Added at top of file | 2 weeks after this PR merge |
| `scripts/init-local.ts` | Added at top of file | 2 weeks after this PR merge |
| `scripts/grant-all-to-wallet.mjs` | Added at top of file | 2 weeks after this PR merge |
| `scripts/grant-roles.mjs` | Added at top of file | 2 weeks after this PR merge |
| `scripts/check-roles.mjs` | Added at top of file | 2 weeks after this PR merge |
| `scripts/verify-deployment.mjs` | Added at top of file | 2 weeks after this PR merge |

**Note:** Deprecated scripts will be removed in a future release after a grace period for users to migrate.

---

## Environment Variables

### New Variables Added

| Variable | Description | Default |
|----------|-------------|---------|
| `GRANT_ALL_TARGET_KEYPAIR` | Target wallet for `grant-all-to-deployer` runbook | `env.DEPLOYER_KEYPAIR` |

### Existing Variables (Unchanged)

| Variable | Description |
|----------|-------------|
| `PROGRAM_ID` | Deployed program ID |
| `DEPLOYER_KEYPAIR` | Admin/deployer wallet path |
| `KEYPAIRS_DIR` | Directory for role keypairs |
| `FABRICANTE_KEYPAIR` | Manufacturer keypair path |
| `AUDITOR_HW_KEYPAIR` | Hardware auditor keypair path |
| `TECNICO_SW_KEYPAIR` | Software technician keypair path |
| `ESCUELA_KEYPAIR` | School keypair path |

---

## Testing

### Runbook Tests

All new runbooks have been tested on localnet:

```bash
# Test full-init
surfpool run full-init --env localnet --browser -f

# Test grant-all-to-deployer
surfpool run grant-all-to-deployer --env localnet --browser -f

# Test query-roles
surfpool run query-roles --env localnet --browser -f

# Test verify-deployment
surfpool run verify-deployment --env localnet --browser -f
```

### Verification Checklist

- [x] `full-init` deploys, initializes, and grants all roles successfully
- [x] `grant-all-to-deployer` grants all 4 roles to single wallet
- [x] `query-roles` returns correct role holder information
- [x] `verify-deployment` confirms all accounts are correctly initialized
- [x] All runbooks use environment variables (no hardcoded values)
- [x] All runbooks have proper error handling

---

## Files Changed

### New Files (4)
| File | Description |
|------|-------------|
| [`01-deployment/full-init.tx`](sc-solana/runbooks/01-deployment/full-init.tx) | Unified initialization runbook |
| [`01-deployment/grant-all-to-deployer.tx`](sc-solana/runbooks/01-deployment/grant-all-to-deployer.tx) | Single wallet role grant runbook |
| [`02-operations/query/query-roles.tx`](sc-solana/runbooks/02-operations/query/query-roles.tx) | Role query runbook |
| [`04-testing/verify-deployment.tx`](sc-solana/runbooks/04-testing/verify-deployment.tx) | Deployment verification runbook |

### Modified Files (2)
| File | Description |
|------|-------------|
| [`01-deployment/deploy-program.tx`](sc-solana/runbooks/01-deployment/deploy-program.tx) | Added deprecation notice |
| [`README.md`](sc-solana/runbooks/README.md) | Updated with new runbooks, deprecated scripts section |

### Scripts Deprecated (6)
| File | Status |
|------|--------|
| [`scripts/init-quick.mjs`](sc-solana/scripts/init-quick.mjs) | DEPRECATED |
| [`scripts/init-local.ts`](sc-solana/scripts/init-local.ts) | DEPRECATED |
| [`scripts/grant-all-to-wallet.mjs`](sc-solana/scripts/grant-all-to-wallet.mjs) | DEPRECATED |
| [`scripts/grant-roles.mjs`](sc-solana/scripts/grant-roles.mjs) | DEPRECATED |
| [`scripts/check-roles.mjs`](sc-solana/scripts/check-roles.mjs) | DEPRECATED |
| [`scripts/verify-deployment.mjs`](sc-solana/scripts/verify-deployment.mjs) | DEPRECATED |

---

## Benefits

### Technical Benefits
1. **Unified Interface:** Single operational interface (runbooks) for all blockchain interactions
2. **No Node.js Dependencies:** Operations use Surfpool runtime, not separate Node.js scripts
3. **Multi-Network Support:** Environment variables enable easy switching between localnet, devnet, mainnet
4. **Dependency Tracking:** Runbooks can specify `depends_on` for ordered execution
5. **Consistent Patterns:** All runbooks follow the same structure and conventions

### Operational Benefits
1. **Simplified Workflows:** `full-init` replaces 3 separate commands
2. **Better Documentation:** Runbooks are self-documenting with inline comments
3. **Easier Onboarding:** New users can follow runbook README instead of multiple script files
4. **CI/CD Ready:** Runbooks can be integrated into CI/CD pipelines

### Maintenance Benefits
1. **Single Codebase:** No need to maintain both scripts and runbooks
2. **Reduced Duplication:** `full-init` eliminates duplicate initialization logic
3. **Easier Testing:** Runbooks can be tested in-process with LiteSVM
4. **Better Error Messages:** Surfpool provides structured error output

---

## Related Issues

- **Issue #123:** [Análisis de problemas que impiden la ejecución de runbooks Surfpool/txtx](https://github.com/your-org/SupplyChainTracker-solana/issues/123)
- **Issue #124:** [🔴 Inconsistencias en Runbooks: PDA Derivation y System Program Transfer no funcionan en Surfpool](https://github.com/87maxi/SupplyChainTracker-solana-/issues/124)

---

## Implementation Checklist

- [x] Create `full-init.tx` runbook
- [x] Create `grant-all-to-deployer.tx` runbook
- [x] Create `query-roles.tx` runbook
- [x] Create `verify-deployment.tx` runbook
- [x] Add deprecation notices to all 6 scripts
- [x] Update README.md with new runbooks
- [x] Update README.md with deprecated scripts section
- [x] Test all new runbooks on localnet
- [ ] Remove deprecated scripts (after 2-week grace period)
- [ ] Add runbook tests to CI/CD pipeline
