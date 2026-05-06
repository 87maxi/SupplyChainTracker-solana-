# SupplyChainTracker Runbooks

[![Txtx](https://img.shields.io/badge/Operated%20with-Txtx-green?labelColor=gray)](https://txtx.sh)
[![Surfpool](https://img.shields.io/badge/Surfpool-SVM-blue)](https://surfpool.run)

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

> **Important**: Use `surfpool run` (not `txtx run`) for all svm addon operations. The `txtx run` command does not include the svm addon.

## Runbooks available

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
- **Description:** Grants FABRICANTE role to the manufacturer account
- **Usage:** `surfpool run grant-roles --env localnet --browser -f`

### Operations Runbooks

#### register-netbook
Register a single netbook in the supply chain.
- **Location:** `operations/register-netbook.tx`
- **Description:** First step in the netbook lifecycle (manufacturing)
- **Usage:** `txtx run register-netbook --input serial_number="SN001"`

#### register-netbooks-batch
Register multiple netbooks in batch.
- **Location:** `operations/register-netbooks-batch.tx`
- **Description:** Validates and stores serial hashes for duplicate detection
- **Usage:** `txtx run register-netbooks-batch --input serial_numbers='["SN001", "SN002"]'`

#### audit-hardware
Perform hardware audit on a netbook.
- **Location:** `operations/audit-hardware.tx`
- **Description:** State transition: Fabricada → HwAprobado
- **Usage:** `txtx run audit-hardware --input serial_number="SN001"`

#### validate-software
Validate software on a netbook.
- **Location:** `operations/validate-software.tx`
- **Description:** State transition: HwAprobado → SwValidado
- **Usage:** `txtx run validate-software --input serial_number="SN001"`

#### assign-student
Assign netbook to a student.
- **Location:** `operations/assign-student.tx`
- **Description:** Final state transition: SwValidado → Distribuida
- **Usage:** `txtx run assign-student --input serial_number="SN001"`

### Testing Runbooks

#### setup-test-env
Setup complete test environment with all accounts.
- **Location:** `testing/setup-test-env.tx`
- **Description:** Airdrops to test wallets and deploys program
- **Usage:** `txtx run setup-test-env --environment localnet`

#### full-lifecycle
Complete lifecycle test from manufacturing to distribution.
- **Location:** `testing/full-lifecycle.tx`
- **Description:** Tests all state transitions in sequence
- **Usage:** `txtx run full-lifecycle --environment localnet`

#### edge-cases
Edge cases and error handling tests.
- **Location:** `testing/edge-cases.tx`
- **Description:** Tests error conditions (duplicate serial, unauthorized, etc.)
- **Usage:** `txtx run edge-cases --environment localnet`

### Examples

#### basic-deploy
Basic program deployment example.
- **Location:** `examples/basic-deploy.tx`
- **Description:** Simplified deployment for learning
- **Usage:** `txtx run basic-deploy`

#### hello-world
Hello world example for learning txtx.
- **Location:** `examples/hello-world.tx`
- **Description:** Simplest possible runbook
- **Usage:** `txtx run hello-world`

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

# 3. List available runbooks
txtx ls

# 4. Setup test environment
txtx run setup-test-env --environment localnet

# 5. Deploy program
txtx run deploy-program --environment localnet

# 6. Initialize config
txtx run initialize-config --environment localnet

# 7. Grant roles
txtx run grant-roles --environment localnet

# 8. Register a netbook
txtx run register-netbook --environment localnet --input serial_number="SN001"

# 9. Run full lifecycle test
txtx run full-lifecycle --environment localnet
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
txtx run deploy-program --environment localnet
```

### Common Commands

```bash
# List runbooks
txtx ls

# Run a specific runbook
txtx run deploy-program

# Run with environment
txtx run deploy-program --environment localnet

# Run with inputs
txtx run register-netbook --input serial_number="SN001" --input batch_id="BATCH001"

# Check status
txtx status

# Update README documentation
txtx docs --update
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

| Transition | Instruction | Required Role |
|------------|-------------|---------------|
| 0 → 1 | `audit_hardware` | `AUDITOR_HW` |
| 1 → 2 | `validate_software` | `TECNICO_SW` |
| 2 → 3 | `assign_to_student` | `ESCUELA` |

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
│   │   └── assign-student.tx
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
