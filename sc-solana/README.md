# SupplyChainTracker - Solana/Anchor Implementation

## Overview

SupplyChainTracker is a supply chain management system deployed on Solana using the Anchor framework. This is a migration from the original Ethereum (Solidity) implementation to Solana, providing improved performance, lower costs, and better scalability.

**Program ID:** `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN`

## Features

- **Role-Based Access Control (RBAC)**: Granular permissions for different roles in the supply chain
- **Netbook Lifecycle Management**: Track devices from manufacturing to distribution
- **State Machine Enforcement**: Strict state transitions ensure data integrity
- **PII Protection**: Student and school identifiers stored as cryptographic hashes
- **Bounded Strings**: Input validation for all string fields to prevent account bloat
- **Event Logging**: All important actions emit on-chain events

## Refactoring Status

**Active Refactoring:** Completed Phases 0-6

| Phase | Description | Status | Key Changes |
|-------|-------------|--------|-------------|
| Phase 0 | Cleanup Documentation | ✅ Completed | 7 summary files removed (Issue #132) |
| Phase 1 | Clean Up Obsolete Code and Scripts | ✅ Completed | 5 files/dirs removed (Issue #133) |
| Phase 2 | Fix Program ID Inconsistency | ✅ Completed | Program ID standardized (Issue #134) |
| Phase 3 | Remove Dead Code and Allow Directives | ✅ Completed | lib.rs cleaned (Issue #135) |
| Phase 4 | Verify Consistency with Surfpool/txtx IAC | ✅ Completed | 8 runbooks fixed (Issue #136) |
| Phase 5 | Update Documentation and Create CHANGELOG | ✅ Completed | CHANGELOG.md created (Issue #137) |
| Phase 6 | PDA-based Admin Pattern for REBC | ✅ Completed | Admin as PDA, all role instructions updated (Issue #139) |

### Phase 6: PDA-based Admin Pattern (Issue #139)

The admin account is now derived as a PDA with seeds `[b"admin", config.key()]` for consistency with Solana/PDA patterns and compatibility with Surfpool/txtx runbooks.

**Key Changes:**
- [`SupplyChainConfig`](programs/sc-solana/src/state/config.rs): Added `admin_pda_bump` field
- [`initialize.rs`](programs/sc-solana/src/instructions/initialize.rs): Admin derived as PDA
- All role management instructions: Admin PDA verification
- PDA-first architecture: Deployer PDA funds all account creation (no external signer needed)

For details, see [`CHANGELOG.md`](../CHANGELOG.md), [`plans/refactoring-plan.md`](../plans/refactoring-plan.md), and [`reports/refactoring-remaining-tasks.md`](../reports/refactoring-remaining-tasks.md).

## State Machine

The system enforces the following state transitions for netbooks:

```
Fabricada (0) → HwAprobado (1) → SwValidado (2) → Distribuida (3)
```

| State | Description | Transition |
|-------|-------------|------------|
| `Fabricada` | Netbook registered, awaiting hardware audit | Initial state |
| `HwAprobado` | Hardware audit passed | `auditHardware(passed=true)` |
| `SwValidado` | Software validation passed | `validateSoftware(passed=true)` |
| `Distribuida` | Assigned to student | `assignToStudent()` |

## Data Structures

### Netbook

| Field | Type | Description |
|-------|------|-------------|
| `serialNumber` | String (max 200 chars) | Unique device identifier |
| `batchId` | String (max 100 chars) | Manufacturing batch identifier |
| `initialModelSpecs` | String (max 500 chars) | Hardware specifications |
| `hwAuditor` | Pubkey | Address of hardware auditor |
| `hwIntegrityPassed` | bool | Hardware audit result |
| `hwReportHash` | [u8; 32] | Hash of hardware audit report |
| `swTechnician` | Pubkey | Address of software technician |
| `osVersion` | String (max 100 chars) | Operating system version |
| `swValidationPassed` | bool | Software validation result |
| `destinationSchoolHash` | [u8; 32] | Hash of destination school ID (PII protected) |
| `studentIdHash` | [u8; 32] | Hash of student ID (PII protected) |
| `distributionTimestamp` | u64 | Distribution timestamp |
| `state` | u8 | Current state (0-3) |
| `exists` | bool | Netbook existence flag |
| `tokenId` | u64 | Unique token identifier |

### Roles

| Role | Description |
|------|-------------|
| `FABRICANTE_ROLE` | Manufacturer - can register netbooks |
| `AUDITOR_HW_ROLE` | Hardware auditor - can perform hardware audits |
| `TECNICO_SW_ROLE` | Software technician - can validate software |
| `ESCUELA_ROLE` | School - can receive netbooks |

## Program Instructions

### Initialize

Initialize the supply chain configuration.

```rust
initialize(ctx: Context<Initialize>)
```

### Role Management

| Instruction | Description |
|-------------|-------------|
| `grantRole(role)` | Grant a role to an account (admin only, legacy single-holder) |
| `revokeRole(role)` | Revoke a role from an account (admin only, legacy single-holder) |
| `requestRole(role)` | Request a role (requires admin approval) |
| `approveRoleRequest()` | Approve a pending role request |
| `rejectRoleRequest()` | Reject a pending role request |
| `addRoleHolder(role)` | Add an account as a role holder (admin only, Issue #42) |
| `removeRoleHolder(role)` | Remove a role holder (admin only, Issue #42) |

### Multiple Role Holders (Issue #42)

The system now supports multiple accounts per role type. In addition to the legacy single-holder model
(`grantRole`/`revokeRole`), administrators can now add multiple role holders using `addRoleHolder`.

| Feature | Description |
|---------|-------------|
| `MAX_ROLE_HOLDERS` | Maximum 100 role holders per role type |
| `RoleHolder` account | Stores individual role assignments with PDA based on role + account |
| Role holder counts | Tracked in `SupplyChainConfig` (`fabricante_count`, `auditor_hw_count`, etc.) |

### Netbook Operations

| Instruction | Description | State Transition |
|-------------|-------------|------------------|
| `registerNetbook(serial, batch, specs)` | Register a new netbook | → Fabricada |
| `auditHardware(serial, passed, reportHash)` | Perform hardware audit | → HwAprobado (if passed) |
| `validateSoftware(serial, osVersion, passed)` | Validate software | → SwValidado (if passed) |
| `assignToStudent(serial, schoolHash, studentHash)` | Assign to student | → Distribuida |

## Events

| Event | Description |
|-------|-------------|
| `NetbookRegistered` | Emitted when a netbook is registered |
| `HardwareAudited` | Emitted after hardware audit |
| `SoftwareValidated` | Emitted after software validation |
| `NetbookAssigned` | Emitted when netbook is assigned to student |
| `RoleRequested` | Emitted when a role is requested |
| `RoleRequestUpdated` | Emitted when role request status changes |
| `RoleGranted` | Emitted when a role is granted |
| `RoleRevoked` | Emitted when a role is revoked |

## Project Structure

```
sc-solana/
├── Anchor.toml           # Anchor configuration
├── Cargo.toml            # Rust workspace configuration
├── rust-toolchain.toml   # Rust toolchain version
├── programs/
│   └── sc-solana/
│       ├── Cargo.toml    # Program dependencies
│       └── src/
│           └── lib.rs    # Main program logic
├── tests/
│   └── sc-solana.ts      # TypeScript tests
├── target/
│   ├── idl/              # Interface Definition Language files
│   └── types/            # Generated TypeScript types
└── migrations/
    └── deploy.ts         # Deployment scripts
```

## Installation

### Prerequisites

- Rust 1.79+
- Solana CLI tools 1.18+
- Anchor CLI 0.32.1
- Node.js 18+

### Setup

```bash
# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.32.1

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.18/install)"

# Navigate to project
cd sc-solana

# Install npm dependencies
yarn install

# Build the program
anchor build
```

## Testing

```bash
# Start local validator
anchor localnet

# Run tests
anchor test --localnet
```

### Running Tests Individually

```bash
# Using Mocha
cd sc-solana
npx ts-mocha tests/**/*.ts -p tsconfig.json --localnet
```

## Deployment

### Deploy to Devnet

```bash
# Set up your Solana CLI to use devnet
solana config set -u https://api.devnet.solana.com

# Deploy
anchor deploy --provider.cluster https://api.devnet.solana.com
```

### Deploy to Mainnet

```bash
# Set up your Solana CLI to use mainnet
solana config set -u https://api.mainnet-beta.solana.com

# Deploy (requires signing keypair)
anchor deploy --provider.cluster https://api.mainnet-beta.solana.com
```

## IDL (Interface Definition Language)

Generate IDL:

```bash
anchor idl parse -f programs/sc-solana/src/lib.rs -o target/idl/sc_solana.json
```

Generate TypeScript types:

```bash
anchor idl parse -f programs/sc-solana/src/lib.rs -o target/idl/sc_solana.json
anchor idl build -f target/idl/sc_solana.json
```

## Security Considerations

### PII Protection

Student and school identifiers are stored as cryptographic hashes (`[u8; 32]`) to protect privacy:

```rust
// Store hash instead of raw PII
netbook.student_id_hash = student_hash;
netbook.destination_school_hash = school_hash;
```

### Bounded Strings

All string fields have maximum length limits to prevent account bloat:

| Field | Max Length |
|-------|------------|
| `serialNumber` | 200 characters |
| `batchId` | 100 characters |
| `initialModelSpecs` | 500 characters |
| `osVersion` | 100 characters |
| `role` (in RoleRequest) | 256 characters |

### State Machine Validation

The program enforces strict state transitions to prevent unauthorized state changes:

```rust
// Example: Hardware audit only from Fabricada state
if netbook.state != NetbookState::Fabricada as u8 {
    return Err(SupplyChainError::InvalidStateTransition.into());
}
```

## Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 6000 | `Unauthorized` | Caller is not authorized for this action |
| 6001 | `InvalidStateTransition` | State transition is not allowed |
| 6002 | `NetbookNotFound` | Netbook does not exist |
| 6003 | `InvalidInput` | Input validation failed |

## Comparison: Ethereum vs Solana

| Feature | Ethereum (Solidity) | Solana (Anchor) |
|---------|---------------------|-----------------|
| Gas Costs | High per operation | Very low per operation |
| Transaction Speed | ~15 tx/sec | ~4,000+ tx/sec |
| Finality | ~13 minutes | ~400ms |
| Storage Cost | High (EIP-2028) | Low (cost per byte) |
| Language | Solidity | Rust |
| Smart Contract Framework | Hardhat/Foundry | Anchor |
| State Access | Random access | PDA-based |

## License

ISC

## Testing

### Running Tests

```bash
# Start local validator
solana-test-validator

# Run all tests
anchor test

# Run specific test
anchor test -- --grep "test_initialize"
```

See [tests/README.md](tests/README.md) for detailed test documentation.

### Test Structure

```
tests/
├── sc-solana.ts          # Main integration test suite
├── test-helpers.ts       # Common test utilities
└── README.md             # Test documentation
```

### Test Categories

| Category | Priority | Description |
|----------|----------|-------------|
| Critical Path | P0 | Lifecycle, registration, roles |
| Extended | P1 | Queries, PDA security, state machine |
| UI Integration | P2 | Frontend integration tests |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `anchor test`
5. Submit a pull request
