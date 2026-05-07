# SupplyChainTracker Runbooks

[![Txtx](https://img.shields.io/badge/Operated%20with-Txtx-green?labelColor=gray)](https://txtx.sh)
[![Surfpool](https://img.shields.io/badge/Surfpool-SVM-blue)](https://surfpool.run)

## ⚠️ Importante

**Todos los runbooks con addon svm requieren `surfpool run`, NO `txtx run`.**

```bash
✅ CORRECTO: surfpool run <runbook> --env <environment> --browser -f
❌ INCORRECTO: txtx run <runbook> --env <environment>
```

## Quick Start - Deployment

### Prerequisites

1. **Surfpool Simnet running**: `surfpool start` (on localhost:8899)
2. **Program compiled**: Run `anchor build` in the `sc-solana` directory
3. **Wallet keypair**: Ensure `~/.config/solana/id.json` exists

### Deploy to Localnet

```bash
cd sc-solana

# 1. Deploy the program (opens browser UI for signing)
surfpool run deploy-program --env localnet --browser -f --port 8488

# 2. Initialize configuration
surfpool run initialize-config --env localnet --browser -f

# 3. Grant initial roles
surfpool run grant-roles --env localnet --browser -f
```

For detailed instructions, troubleshooting, and reference documentation, see [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md).

## Deployment Guides

| Guide | Description |
|-------|-------------|
| [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) | Complete deployment guide with Surfpool/txtx runbooks |
| [devnet-deployment.md](devnet-deployment.md) | Step-by-step devnet deployment runbook |
| [mainnet-deployment.md](mainnet-deployment.md) | Mainnet deployment runbook with security procedures |

## Runbooks Available

### Deployment Runbooks

#### deploy-program
Deploy SupplyChainTracker program to Solana network using Surfpool SVM addon.
- **Location:** `deployment/deploy-program.tx`
- **Description:** Deploys the Anchor program using `svm::deploy_program` action
- **Usage:** `surfpool run deploy-program --env localnet --browser -f`
- **Note:** Requires browser UI for wallet signing. See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for details.

#### initialize-config
Initialize supply chain configuration.
- **Location:** `deployment/initialize-config.tx`
- **Description:** Sets up the initial config PDA and serial hash registry
- **Usage:** `surfpool run initialize-config --env localnet --browser -f`

#### grant-roles
Grant initial roles to administrators.
- **Location:** `deployment/grant-roles.tx`
- **Description:** Grants all 4 roles (FABRICANTE, AUDITOR_HW, TECNICO_SW, ESCUELA)
- **Usage:** `surfpool run grant-roles --env localnet --browser -f`

### Operations Runbooks

#### register-netbook
Register a single netbook in the supply chain.
- **Location:** `operations/register-netbook.tx`
- **Description:** First step in the netbook lifecycle (manufacturing)
- **Usage:** `surfpool run register-netbook --env localnet --browser -f`

#### register-netbooks-batch
Register multiple netbooks in batch.
- **Location:** `operations/register-netbooks-batch.tx`
- **Description:** Validates and stores serial hashes for duplicate detection
- **Usage:** `surfpool run register-netbooks-batch --env localnet --browser -f`

#### audit-hardware
Perform hardware audit on a netbook.
- **Location:** `operations/audit-hardware.tx`
- **Description:** State transition: Fabricada → HwAprobado
- **Usage:** `surfpool run audit-hardware --env localnet --browser -f`

#### validate-software
Validate software on a netbook.
- **Location:** `operations/validate-software.tx`
- **Description:** State transition: HwAprobado → SwValidado
- **Usage:** `surfpool run validate-software --env localnet --browser -f`

#### assign-student
Assign netbook to a student.
- **Location:** `operations/assign-student.tx`
- **Description:** Final state transition: SwValidado → Distribuida
- **Usage:** `surfpool run assign-student --env localnet --browser -f`

#### revoke-role
Revoke a role from an account.
- **Location:** `operations/revoke-role.tx`
- **Description:** Remove a previously granted role
- **Usage:** `surfpool run revoke-role --env localnet --browser -f`

#### request-role
Request a role from admin.
- **Location:** `operations/request-role.tx`
- **Description:** Submit a role request for admin approval
- **Usage:** `surfpool run request-role --env localnet --browser -f`

#### query-netbook
Query netbook state.
- **Location:** `operations/query-netbook.tx`
- **Description:** Query the current state of a netbook
- **Usage:** `surfpool run query-netbook --env localnet --browser -f`

### Testing Runbooks

#### setup-test-env
Setup complete test environment with all accounts.
- **Location:** `testing/setup-test-env.tx`
- **Description:** Airdrops to test wallets and verifies deployment
- **Usage:** `surfpool run setup-test-env --env localnet --browser -f`

#### full-lifecycle
Complete lifecycle test from manufacturing to distribution.
- **Location:** `testing/full-lifecycle.tx`
- **Description:** Tests all state transitions in sequence
- **Usage:** `surfpool run full-lifecycle --env localnet --browser -f`

#### edge-cases
Edge cases and error handling tests.
- **Location:** `testing/edge-cases.tx`
- **Description:** Tests error conditions (duplicate serial, unauthorized, etc.)
- **Usage:** `surfpool run edge-cases --env localnet --browser -f`

### Examples

#### basic-deploy
Basic program deployment example.
- **Location:** `examples/basic-deploy.tx`
- **Description:** Simplified deployment for learning
- **Usage:** `surfpool run basic-deploy --env localnet --browser -f`

#### hello-world
Hello world example for learning txtx.
- **Location:** `examples/hello-world.tx`
- **Description:** Simplest possible runbook
- **Usage:** `surfpool run hello-world --env localnet --browser -f`

---

## Getting Started

### Prerequisites

1. **Rust & Anchor**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   cargo install --git https://github.com/coral-xyz/anchor avm --locked
   avm install 0.32.0
   avm use 0.32.0
   ```

2. **Txtx & Surfpool**
   ```bash
   # Install txtx
   curl -sL https://install.txtx.sh/ | bash
   
   # Install surfpool (macOS)
   brew install txtx/taps/surfpool
   
   # Or (Linux)
   snap install surfpool
   ```

### Quick Start

```bash
# 1. Build the program
cd sc-solana
anchor build

# 2. Start Surfpool localnet
surfpool start

# 3. Deploy program
surfpool run deploy-program --env localnet --browser -f

# 4. Initialize config
surfpool run initialize-config --env localnet --browser -f

# 5. Grant roles
surfpool run grant-roles --env localnet --browser -f

# 6. Register a netbook
surfpool run register-netbook --env localnet --browser -f

# 7. Run full lifecycle test
surfpool run full-lifecycle --env localnet --browser -f
```

### Environment Configuration

Environment files are located in `runbooks/environments/`:

| File | Network | RPC URL |
|------|---------|---------|
| `localnet.env` | Local development | `http://localhost:8899` |
| `devnet.env` | Solana devnet | `https://api.devnet.solana.com` |
| `mainnet.env` | Solana mainnet | `https://api.mainnet-beta.solana.com` |

To use an environment:
```bash
surfpool run deploy-program --env localnet --browser -f
```

### Common Commands

```bash
# List runbooks
surfpool ls

# Run a specific runbook
surfpool run deploy-program --env localnet --browser -f

# Run with inputs
surfpool run register-netbook --env localnet --browser -f --input serial_number="SN001"

# Check status
surfpool status
```

---

## Netbook Lifecycle

The SupplyChainTracker program follows a strict state machine:

```
Fabricada (0) → HwAprobado (1) → SwValidado (2) → Distribuida (3)
     ↑              ↑                ↑                ↑
     │              │                │                │
  register    audit_hardware    validate_software    assign_to_student
```

### State Transitions

| Transition | Instruction | Required Role | Runbook |
|------------|-------------|---------------|---------|
| 0 → 1 | `audit_hardware` | `AUDITOR_HW` | `audit-hardware` |
| 1 → 2 | `validate_software` | `TECNICO_SW` | `validate-software` |
| 2 → 3 | `assign_to_student` | `ESCUELA` | `assign-student` |

### Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 6000 | Unauthorized | Caller is not authorized |
| 6001 | InvalidStateTransition | Invalid state transition |
| 6002 | NetbookNotFound | Netbook not found |
| 6003 | InvalidInput | Invalid input |
| 6004 | DuplicateSerial | Serial number already registered |
| 6005 | ArrayLengthMismatch | Array lengths do not match |
| 6006 | RoleAlreadyGranted | Role already granted to this account |
| 6007 | RoleNotFound | Role not found |
| 6008 | InvalidSignature | Invalid signature |
| 6009 | EmptySerial | Serial number is empty |
| 6010 | StringTooLong | String exceeds maximum length |
| 6011 | MaxRoleHoldersReached | Maximum role holders reached |
| 6012 | RoleHolderNotFound | Account not found in role holders |
| 6013 | InvalidRequestState | Role request is not in pending state |
| 6014 | RateLimited | Role request rate limited |

---

## Program Structure

```
sc-solana/
├── txtx.yml                              # Main manifest
├── runbooks/
│   ├── states/                           # State management (gitignored)
│   ├── environments/                     # Environment configs
│   │   ├── localnet.env
│   │   ├── devnet.env
│   │   └── mainnet.env
│   ├── deployment/                       # Deployment runbooks
│   │   ├── deploy-program.tx
│   │   ├── initialize-config.tx
│   │   └── grant-roles.tx
│   ├── operations/                       # Operational runbooks
│   │   ├── register-netbook.tx
│   │   ├── register-netbooks-batch.tx
│   │   ├── audit-hardware.tx
│   │   ├── validate-software.tx
│   │   ├── assign-student.tx
│   │   ├── revoke-role.tx
│   │   ├── request-role.tx
│   │   └── query-netbook.tx
│   ├── testing/                          # Testing runbooks
│   │   ├── setup-test-env.tx
│   │   ├── full-lifecycle.tx
│   │   └── edge-cases.tx
│   └── examples/                         # Example runbooks
│       ├── basic-deploy.tx
│       └── hello-world.tx
└── .gitignore
```

---

## Accessing Documentation

- [Txtx Documentation](https://docs.txtx.sh)
- [Surfpool Language Reference](https://docs.surfpool.run/iac/language)
- [Surfpool SVM Actions](https://docs.surfpool.run/iac/svm/actions)
- [Surfpool CLI](https://docs.surfpool.run/toolchain/cli)

---

## VS Code Extension

Install the [Txtx VS Code extension](https://marketplace.visualstudio.com/items?itemName=txtx.txtx) for syntax highlighting and IntelliSense support.
