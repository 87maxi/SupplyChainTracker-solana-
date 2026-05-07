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

1. **Surfpool Simnet running**: `surfpool start` (on localhost:8899)
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

For detailed instructions, troubleshooting, and reference documentation, see [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md).

## Runbooks Structure

```
runbooks/
├── README.md                           # This file
├── DEPLOYMENT-GUIDE.md                 # Complete deployment guide
├── _templates/                         # Reusable templates
│   ├── common.tx                       # Common patterns for all runbooks
│   ├── pda-derivation.tx              # PDA derivation patterns
│   └── env-vars.tx                    # Environment variable patterns
├── deployment/                         # Phase 1: Deployment
│   ├── deploy-program.tx              # Deploy the program
│   ├── initialize-config.tx           # Initialize configuration
│   ├── grant-roles.tx                 # Grant initial roles
│   └── upgrade-program.tx             # Upgrade program
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

Generate keypairs with:
```bash
./scripts/setup-keypairs.sh
```

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

The `_templates/` directory contains reusable patterns:

- [`common.tx`](_templates/common.tx) - Common patterns for all runbooks
- [`pda-derivation.tx`](_templates/pda-derivation.tx) - PDA derivation patterns
- [`env-vars.tx`](_templates/env-vars.tx) - Environment variable patterns

Use these templates as reference when creating new runbooks.

## Best Practices

1. **Always source config before running**: `source config/config.env && source runbooks/environments/localnet.env`
2. **Use environment variables**: Never hardcode program IDs or keypair paths
3. **Follow the lifecycle order**: register → audit → validate → assign
4. **Test on localnet first**: Always test on localnet before devnet/mainnet
5. **Check prerequisites**: Each runbook documents its prerequisites

## Troubleshooting

- **Program not found**: Ensure `anchor build` was run and program is deployed
- **KeyPair not found**: Run `./scripts/setup-keypairs.sh` to generate keypairs
- **RPC connection failed**: Ensure Surfpool is running on localhost:8899
- **Permission denied**: Ensure admin wallet has proper roles
