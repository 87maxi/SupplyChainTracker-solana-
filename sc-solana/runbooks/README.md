# SupplyChainTracker Runbooks

[![Txtx](https://img.shields.io/badge/Operated%20with-Txtx-green?labelColor=gray)](https://txtx.sh)
[![Surfpool](https://img.shields.io/badge/Surfpool-SVM-blue)](https://surfpool.run)

## ⚠️ Importante

**Todos los runbooks con addon svm requieren `surfpool run`, NO `txtx run`.**

```bash
✅ CORRECTO: surfpool run <runbook> --env <environment> --browser -f
❌ INCORRECTO: txtx run <runbook> --env <environment>
```

## Configuration

Before running any runbook, source the centralized configuration:

```bash
cd sc-solana

# Load central configuration (program_id, keypairs, etc.)
source config/config.env

# Load environment-specific settings
source runbooks/environments/localnet.env   # For localnet (Surfpool)
# source runbooks/environments/devnet.env   # For devnet
# source runbooks/environments/mainnet.env  # For mainnet
```

All runbooks use environment variables from `config/config.env` instead of hardcoded values.

## Quick Start - Deployment

### Prerequisites

1. **Surfpool/Solana validator running** on localhost:8899
2. **Program compiled**: Run `anchor build` in the `sc-solana` directory
3. **Wallet keypair**: Ensure `~/.config/solana/id.json` exists
4. **Role keypairs**: Generated in `config/keypairs/` directory

### Deploy to Localnet

```bash
cd sc-solana

# Load configuration
source config/config.env
source runbooks/environments/localnet.env

# Option A: Full initialization (recommended for single-wallet setup)
surfpool run full-init --env localnet --browser -f

# Option B: Step-by-step (for multi-wallet setup)
# surfpool run deploy-program --env localnet --browser -f --port 8488
# surfpool run initialize-config --env localnet --browser -f
# surfpool run grant-roles --env localnet --browser -f
```

For detailed instructions, see the Quick Start section above or the deployment runbooks in `01-deployment/`.

## Runbooks Structure

```
runbooks/
├── README.md                           # This file (main documentation)
├── _templates/                         # Reusable templates
│   ├── standard-runbook.tx            # Standard runbook template (SurfPool IaC compliant)
│   ├── common.tx                       # Common patterns for all runbooks
│   ├── pda-derivation.tx              # PDA derivation patterns
│   └── env-vars.tx                    # Environment variable patterns
├── states/                            # State management snapshots
│   └── README.md                       # State management documentation
├── 01-deployment/                     # Phase 1: Deployment
│   ├── deploy-program.tx              # Deploy the program
│   ├── full-init.tx                   # Full initialization (fund + init + grant all)
│   ├── initialize-config.tx           # Initialize configuration (PDA-First)
│   ├── grant-roles.tx                 # Grant initial roles to separate keypairs
│   └── grant-all-to-deployer.tx       # Grant all roles to single deployer wallet
├── 02-operations/                     # Phase 2: Operations
│   ├── netbook/                       # Netbook lifecycle operations
│   │   ├── register-netbook.tx        # Register single netbook
│   │   ├── register-netbooks-batch.tx # Register batch of netbooks
│   │   ├── audit-hardware.tx          # Hardware audit
│   │   ├── validate-software.tx       # Software validation
│   │   ├── assign-student.tx          # Assign to student
│   │   └── query-netbook.tx           # Query netbook state
│   └── query/                         # Query operations
│       ├── query-config.tx            # Query system configuration
│       ├── query-role.tx              # Query role holders
│       └── query-roles.tx             # Query all role assignments
├── 03-role-management/                # Phase 3: Role Management
│   ├── approve-role-request.tx        # Approve role request
│   ├── reject-role-request.tx         # Reject role request
│   ├── add-role-holder.tx             # Add role holder
│   ├── remove-role-holder.tx          # Remove role holder
│   ├── request-role.tx                # Request a role
│   ├── reset-role-request.tx          # Reset a role request
│   ├── revoke-role.tx                 # Revoke a role
│   └── transfer-admin.tx              # Transfer admin ownership
├── 04-testing/                        # Phase 4: Testing
│   ├── full-lifecycle.tx              # Full lifecycle test
│   ├── edge-cases.tx                  # Edge case tests
│   ├── generate-fake-data.tx          # Generate fake test data
│   ├── role-workflow.tx               # Role workflow test
│   ├── setup-test-env.tx              # Setup test environment
│   └── verify-deployment.tx           # Verify deployment consistency
├── 05-ci/                             # Phase 5: CI/CD
│   └── runbook-tests.sh               # CI runbook test script
└── environments/                      # Environment configurations
    ├── localnet.env                   # Localnet (Surfpool)
    ├── devnet.env                     # Devnet
    └── mainnet.env                    # Mainnet
```

## Available Runbooks

### Deployment Runbooks

| Runbook | Description | Usage |
|---------|-------------|-------|
| `deploy-program` | Deploy program to network | `surfpool run deploy-program --env localnet --browser -f` |
| `full-init` | **FULL INITIALIZATION** - Fund deployer + Initialize config + Grant all roles (recommended) | `surfpool run full-init --env localnet --browser -f` |
| `initialize-config` | Initialize config PDA (standalone) | `surfpool run initialize-config --env localnet --browser -f` |
| `grant-roles` | Grant initial roles to separate keypairs | `surfpool run grant-roles --env localnet --browser -f` |
| `grant-all-to-deployer` | Grant all roles to single deployer wallet | `surfpool run grant-all-to-deployer --env localnet --browser -f` |

### Operations Runbooks - Netbook Lifecycle

| Runbook | Description | State Transition |
|---------|-------------|------------------|
| `register-netbook` | Register single netbook | → Fabricada (0) |
| `register-netbooks-batch` | Register batch of netbooks | → Fabricada (0) |
| `audit-hardware` | Hardware audit | Fabricada → HwAprobado (1) |
| `validate-software` | Software validation | HwAprobado → SwValidado (2) |
| `assign-student` | Assign to student | SwValidado → Distribuida (3) |

### Query Runbooks

| Runbook | Description | Usage |
|---------|-------------|-------|
| `query-netbook` | Query netbook state | `surfpool run query-netbook --env localnet --browser -f` |
| `query-config` | Query system configuration | `surfpool run query-config --env localnet --browser -f` |
| `query-role` | Query role holders | `surfpool run query-role --env localnet --browser -f` |
| `query-roles` | **Query all role assignments** (recommended) | `surfpool run query-roles --env localnet --browser -f` |

### Role Management Runbooks

| Runbook | Description |
|---------|-------------|
| `request-role` | Request a role |
| `revoke-role` | Revoke a role |
| `approve-role-request` | Admin approves role request |
| `reject-role-request` | Admin rejects role request |
| `add-role-holder` | Add new role holder |
| `remove-role-holder` | Remove role holder |
| `transfer-admin` | Transfer admin ownership |

### Testing Runbooks

| Runbook | Description | Usage |
|---------|-------------|-------|
| `full-lifecycle` | Complete lifecycle test | `surfpool run full-lifecycle --env localnet --browser -f` |
| `edge-cases` | Edge case tests | `surfpool run edge-cases --env localnet --browser -f` |
| `role-workflow` | Role workflow test | `surfpool run role-workflow --env localnet --browser -f` |
| `verify-deployment` | **Verify deployment consistency** (recommended) | `surfpool run verify-deployment --env localnet --browser -f` |

## Keypair Management

All role keypairs are stored in `config/keypairs/`:

```bash
config/keypairs/
├── fabricante.json      # Manufacturer wallet
├── auditor_hw.json      # Hardware auditor wallet
├── tecnico_sw.json      # Software technician wallet
└── escuela.json         # School wallet
```

The keypairs are pre-generated and stored in `config/keypairs/`.

## Environment Variables

All configuration is centralized in `config/config.env`:

| Variable | Description |
|----------|-------------|
| `PROGRAM_ID` | Deployed program ID |
| `DEPLOYER_KEYPAIR` | Admin/deployer wallet path |
| `KEYPAIRS_DIR` | Directory for role keypairs |
| `FABRICANTE_KEYPAIR` | Manufacturer keypair path |
| `AUDITOR_HW_KEYPAIR` | Hardware auditor keypair path |
| `TECNICO_SW_KEYPAIR` | Software technician keypair path |
| `ESCUELA_KEYPAIR` | School keypair path |
| `GRANT_ALL_TARGET_KEYPAIR` | Target wallet for grant-all-to-deployer runbook |

## Templates

The `_templates/` directory contains reusable code patterns designed to be **copied and pasted** into new runbook files:

- [`standard-runbook.tx`](_templates/standard-runbook.tx) - **Standard SurfPool IaC compliant template** with complete header, signers, PDA derivation, actions, and outputs structure. Use this as the starting point for all new runbooks.
- [`common.tx`](_templates/common.tx) - Common patterns for all runbooks, such as dynamic Program ID fetch.
- [`pda-derivation.tx`](_templates/pda-derivation.tx) - PDA derivation patterns ensuring seed consistency with Anchor.
- [`env-vars.tx`](_templates/env-vars.tx) - Environment variables and keypair patterns.

**How to Use Templates:**
Because Txtx does not natively support `include` or `module` directives, templates are designed to be **copied and pasted** at the top of new runbook files. The `standard-runbook.tx` template includes:
- Complete header with Usage, Prerequisites, Inputs, and Outputs documentation
- Standardized section separators (`===`)
- SurfPool/txtx limitations (Issue #129) documentation
- Consistent signer, variable, PDA, action, and output patterns

## State Management

The `states/` directory stores state snapshots for runbooks configured with state management in `txtx.yml`.

### Enabled State Management

The following runbooks have state management enabled:

| Runbook | State Location | Purpose |
|---------|---------------|---------|
| `setup-test-env` | `states/setup-test-env/` | Test environment setup |
| `full-lifecycle` | `states/full-lifecycle/` | Lifecycle test state |
| `edge-cases` | `states/edge-cases/` | Edge case testing |
| `role-workflow` | `states/role-workflow/` | Role workflow testing |
| `generate-fake-data` | `states/generate-fake-data/` | Fake data generation |
| `verify-deployment` | `states/verify-deployment/` | Deployment verification |

### Using State Management

When state management is enabled, SurfPool/txtx will:
1. Load the previous state before execution
2. Compare current inputs against saved state
3. Skip unchanged actions for faster re-runs

To clear a runbook's state:
```bash
rm -rf runbooks/states/<runbook-name>/*
```

## Best Practices

1. **Always source config before running**: `source config/config.env && source runbooks/environments/localnet.env`
2. **Use environment variables**: Never hardcode program IDs or keypair paths
3. **Follow the lifecycle order**: register → audit → validate → assign
4. **Test on localnet first**: Always test on localnet before devnet/mainnet
5. **Check prerequisites**: Each runbook documents its prerequisites

## Troubleshooting

- **Program not found**: Ensure `anchor build` was run and program is deployed
- **KeyPair not found**: Check that keypairs exist in `config/keypairs/` directory
- **RPC connection failed**: Ensure Surfpool is running on localhost:8899
- **Permission denied**: Ensure admin wallet has proper roles

## Known Issues & Solutions

### Issue 1: `svm::send_token` Not Available

**Problem**: The `svm::send_token` action is NOT documented in Surfpool's official documentation.

**Solution**: Use `svm::process_instructions` with `svm::system_program_id()` to send SOL via the system program transfer instruction.

**Affected runbooks**:
- [`04-testing/setup-test-env.tx`](04-testing/setup-test-env.tx) - Refactored to use system program transfers

### Issue 2: `input.*` Variables Not Resolved

**Problem**: The `input.*` syntax may not be resolved correctly by txtx/surfpool at runtime.

**Solution**: Use `env.VARIABLE_NAME` instead and define the variable in the environment file.

**Affected runbooks**:
- [`03-role-management/transfer-admin.tx`](03-role-management/transfer-admin.tx) - Changed `input.new_admin_keypair` to `env.NEW_ADMIN_KEYPAIR`

### Issue 3: Query Signatures Empty

**Problem**: Query actions (read-only) may not generate transaction signatures, causing `action.query.signatures[0]` to fail.

**Solution**: Use the `first()` function to safely handle empty arrays: `action.query.signatures | first()`

**Affected runbooks**:
- [`02-operations/query/query-config.tx`](02-operations/query/query-config.tx)
- [`02-operations/query/query-role.tx`](02-operations/query/query-role.tx)

### Available SVM Functions

The following SVM functions are confirmed available in Surfpool:

| Function | Description |
|----------|-------------|
| `svm::find_pda(program_id, seeds)` | Derive PDA address and bump seed |
| `svm::get_program_from_anchor_project(name)` | Get program artifacts from Anchor project |
| `svm::system_program_id()` | Get system program ID |
| `svm::sol_to_lamports(sol)` | Convert SOL to lamports |
| `svm::lamports_to_sol(lamports)` | Convert lamports to SOL |
| `svm::u64(value)` | Create u64 byte array |
| `svm::i64(value)` | Create i64 byte array |
| `svm::default_pubkey()` | Get default (zero) pubkey |
| `svm::get_associated_token_account(token_mint, owner)` | Get ATA address |
| `svm::create_token_account_instruction()` | Create token account instruction |

## Recent Changes (Issue #124 Fixes)

| Date | File | Change | Reason |
|------|------|--------|--------|
| 2024-05-07 | [`03-role-management/add-role-holder.tx`](03-role-management/add-role-holder.tx) | Fixed RoleHolder PDA seeds: `[variable.role, ...]` → `["role_holder", ...]` | IDL shows seeds must be `["role_holder", account_to_add]` |
| 2024-05-07 | [`03-role-management/remove-role-holder.tx`](03-role-management/remove-role-holder.tx) | Fixed RoleHolder PDA seeds + removed extra holder signer | Anchor struct: `seeds = [b"role_holder", role_holder.account]`, only admin signs |
| 2024-05-07 | [`03-role-management/approve-role-request.tx`](03-role-management/approve-role-request.tx) | Fixed config writable: `false` → `true` | Anchor: `#[account(mut, has_one = admin)]` for config |
| 2024-05-07 | [`03-role-management/reject-role-request.tx`](03-role-management/reject-role-request.tx) | Fixed config writable + removed extra accounts | Anchor: `#[account(mut, has_one = admin)]`, no role_holder/system_program needed |
| 2024-05-07 | [`03-role-management/transfer-admin.tx`](03-role-management/transfer-admin.tx) | Fixed current_admin writable: `false` → `true` | Anchor: `#[account(mut)]` for current_admin |
| 2024-05-07 | [`02-operations/netbook/register-netbook.tx`](02-operations/netbook/register-netbook.tx) | Fixed Netbook PDA derivation + added token_id tracking | Anchor: `seeds = [b"netbook", b"netbook", &next_token_id[0..7]]` |
| 2024-05-07 | [`02-operations/netbook/request-role.tx`](02-operations/netbook/request-role.tx) | Fixed config writable + account order | Anchor: `config (mut)`, `role_request (init)`, `user (mut, signer)` |

## Deprecated Scripts

The following JavaScript/TypeScript scripts have been replaced by Surfpool/txtx runbooks. **Do not use these scripts in new workflows.**

| Script | Replacement Runbook | Status |
|--------|---------------------|--------|
| `scripts/init-quick.mjs` | `01-deployment/full-init.tx` | ❌ DEPRECATED |
| `scripts/init-local.ts` | `01-deployment/full-init.tx` | ❌ DEPRECATED |
| `scripts/grant-all-to-wallet.mjs` | `01-deployment/grant-all-to-deployer.tx` | ❌ DEPRECATED |
| `scripts/grant-roles.mjs` | `01-deployment/grant-roles.tx` | ❌ DEPRECATED |
| `scripts/check-roles.mjs` | `02-operations/query/query-roles.tx` | ❌ DEPRECATED |
| `scripts/verify-deployment.mjs` | `04-testing/verify-deployment.tx` | ❌ DEPRECATED |

### Migration Guide

| Old Command | New Command |
|-------------|-------------|
| `node scripts/init-quick.mjs` | `surfpool run full-init --env localnet --browser -f` |
| `ts-node scripts/init-local.ts` | `surfpool run full-init --env localnet --browser -f` |
| `node scripts/grant-all-to-wallet.mjs` | `surfpool run grant-all-to-deployer --env localnet --browser -f` |
| `node scripts/grant-roles.mjs` | `surfpool run grant-roles --env localnet --browser -f` |
| `node scripts/check-roles.mjs` | `surfpool run query-roles --env localnet --browser -f` |
| `node scripts/verify-deployment.mjs` | `surfpool run verify-deployment --env localnet --browser -f` |

**Note:** Deprecated scripts will be removed in a future release. All scripts have deprecation notices at the top of their files with migration instructions.

- **Issue #123**: [Análisis de problemas que impiden la ejecución de runbooks Surfpool/txtx](https://github.com/your-org/SupplyChainTracker-solana/issues/123)
- **Issue #124**: [🔴 Inconsistencias en Runbooks: PDA Derivation y System Program Transfer no funcionan en Surfpool](https://github.com/87maxi/SupplyChainTracker-solana-/issues/124)
