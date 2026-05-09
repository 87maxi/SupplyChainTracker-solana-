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

# 1. Deploy the program (opens browser UI for signing)
surfpool run deploy-program --env localnet --browser -f --port 8488

# 2. Initialize configuration
surfpool run initialize-config --env localnet --browser -f

# 3. Grant initial roles
surfpool run grant-roles --env localnet --browser -f
```

For detailed instructions, see the Quick Start section above or the deployment runbooks in `01-deployment/`.

## Runbooks Structure

```
runbooks/
├── README.md                           # This file (main documentation)
├── _templates/                         # Reusable templates
│   ├── common.tx                       # Common patterns for all runbooks
│   ├── pda-derivation.tx              # PDA derivation patterns
│   └── env-vars.tx                    # Environment variable patterns
├── deployment/                         # Phase 1: Deployment
│   ├── deploy-program.tx              # Deploy the program
│   ├── initialize-config.tx           # Initialize configuration
│   ├── grant-roles.tx                 # Grant initial roles
│   # upgrade-program removed (program is non-upgradeable)
├── operations/                         # Phase 2: Operations
│   ├── register-netbook.tx            # Register single netbook
│   ├── register-netbooks-batch.tx     # Register batch of netbooks
│   ├── audit-hardware.tx              # Hardware audit
│   ├── validate-software.tx           # Software validation
│   ├── assign-student.tx              # Assign to student
│   ├── query-netbook.tx               # Query netbook state
│   ├── request-role.tx                # Request a role
│   └── revoke-role.tx                 # Revoke a role
├── 02-operations/query/               # Query operations
│   ├── query-config.tx                # Query system configuration
│   └── query-role.tx                  # Query role holders
├── 03-role-management/                # Phase 3: Role Management
│   ├── approve-role-request.tx        # Approve role request
│   ├── reject-role-request.tx         # Reject role request
│   ├── add-role-holder.tx             # Add role holder
│   ├── remove-role-holder.tx          # Remove role holder
│   └── transfer-admin.tx              # Transfer admin ownership
├── 04-testing/                        # Phase 4: Testing
│   └── role-workflow.tx               # Role workflow test
├── testing/                           # Legacy testing runbooks
│   ├── setup-test-env.tx              # Setup test environment
│   ├── full-lifecycle.tx              # Full lifecycle test
│   └── edge-cases.tx                  # Edge case tests
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
| `initialize-config` | Initialize config PDA | `surfpool run initialize-config --env localnet --browser -f` |
| `grant-roles` | Grant initial roles | `surfpool run grant-roles --env localnet --browser -f` |
| `upgrade-program` | Upgrade deployed program | `surfpool run upgrade-program --env localnet --browser -f` |

### Operations Runbooks - Netbook Lifecycle

| Runbook | Description | State Transition |
|---------|-------------|------------------|
| `register-netbook` | Register single netbook | → Fabricada (0) |
| `register-netbooks-batch` | Register batch of netbooks | → Fabricada (0) |
| `audit-hardware` | Hardware audit | Fabricada → HwAprobado (1) |
| `validate-software` | Software validation | HwAprobado → SwValidado (2) |
| `assign-student` | Assign to student | SwValidado → Distribuida (3) |

### Query Runbooks

| Runbook | Description |
|---------|-------------|
| `query-netbook` | Query netbook state |
| `query-config` | Query system configuration |
| `query-role` | Query role holders |

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

| Runbook | Description |
|---------|-------------|
| `setup-test-env` | Setup test environment |
| `full-lifecycle` | Complete lifecycle test |
| `edge-cases` | Edge case tests |
| `role-workflow` | Role workflow test |

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

## Templates

The `_templates/` directory contains reusable code patterns (snippets) that illustrate the standardized configuration used across tracking modules:

- [`common.tx`](_templates/common.tx) - Common patterns for all runbooks, such as dynamic Program ID fetch.
- [`pda-derivation.tx`](_templates/pda-derivation.tx) - PDA derivation patterns ensuring seed consistency with Anchor.
- [`env-vars.tx`](_templates/env-vars.tx) - Environment variables and keypair patterns.

**How to Use Templates:**
Because Txtx does not natively support `include` or `module` directives for partial syntax injection in these runbooks, these templates are designed to be **copied and pasted** at the top of new runbook files to ensure consistent variable names, signers, and PDA derivations across the project. Do not modify the variable names defined in these templates to maintain project-wide coherence.

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

## Related Issues

- **Issue #123**: [Análisis de problemas que impiden la ejecución de runbooks Surfpool/txtx](https://github.com/your-org/SupplyChainTracker-solana/issues/123)
- **Issue #124**: [🔴 Inconsistencias en Runbooks: PDA Derivation y System Program Transfer no funcionan en Surfpool](https://github.com/87maxi/SupplyChainTracker-solana-/issues/124)
