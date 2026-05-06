# Test Suite Documentation

## Overview

This directory contains the Anchor integration test suite for the SupplyChainTracker Solana program. Tests are written in TypeScript using the Anchor test framework with Mocha/Chai assertions.

## Directory Structure

```
tests/
├── sc-solana.ts          # Main integration test suite
├── test-helpers.ts       # Common test utilities and helpers
└── README.md             # This file
```

## Running Tests

### Prerequisites

1. **Solana CLI Tools** installed
2. **Anchor CLI** installed
3. **Node.js** (v16+) and **Yarn**

### Quick Start

```bash
# From the sc-solana directory

# Start local validator
solana-test-validator

# Run tests
anchor test
```

### Detailed Test Commands

```bash
# Run all tests
anchor test --localnet

# Run tests with verbose output
anchor test --localnet -- --verbose

# Run specific test file
anchor test --localnet -- --grep "sc-solana"

# Run specific test case
anchor test --localnet -- --grep "test_initialize"

# Run tests with coverage
yarn test --coverage
```

### Alternative Test Commands

```bash
# Using yarn directly (configured in Anchor.toml)
yarn test

# Using ts-mocha directly
yarn ts-mocha -p ./tsconfig.json -t 1000000 "tests/**/*.ts"

# Run tests in watch mode
yarn ts-mocha -p ./tsconfig.json -w "tests/**/*.ts"
```

## Test Categories

### P0 - Critical Path Tests (Priority 0)

| Test | File | Description |
|------|------|-------------|
| Environment Setup | `test-helpers.ts` | Test infrastructure and utilities |
| Helper Functions | `test-helpers.ts` | Utility function verification |
| Unit Tests | `unit-tests.ts` | Struct sizes, enum values, error codes |
| Lifecycle Test | `lifecycle.ts` | Complete netbook lifecycle |
| Full Lifecycle | `integration-full-lifecycle.ts` | Comprehensive integration tests |
| Batch Registration | `batch-registration.ts` | Batch netbook registration |
| Role Management | `role-management.ts` | Role grant/revoke/request workflow |

### P1 - Extended Tests (Priority 1)

| Test | File | Description |
|------|------|-------------|
| Query Instructions | `query-instructions.ts` | Query netbook state, config, roles |
| PDA Derivation | `pda-derivation.ts` | PDA security tests |
| Role Enforcement | `role-enforcement.ts` | Role-based access control tests |
| State Machine | `state-machine.ts` | State transition validation |
| Overflow Protection | `overflow-protection.ts` | Arithmetic overflow/underflow tests |

### P2 - UI Integration Tests (Priority 2)

| Test | Description |
|------|-------------|
| Admin Panel | Role management UI integration |
| Analytics Dashboard | Analytics data visualization |
| Activity Logs | Event query integration |

## Test Files Reference

| File | Lines | Issues | Status |
|------|-------|--------|--------|
| `test-helpers.ts` | ~590 | #65 | ✅ Complete |
| `unit-tests.ts` | ~450 | #66 | ✅ Complete |
| `lifecycle.ts` | ~260 | #67 | ✅ Complete |
| `integration-full-lifecycle.ts` | ~837 | #81 | ✅ Complete |
| `batch-registration.ts` | ~368 | #68 | ✅ Complete |
| `role-management.ts` | ~319 | #69 | ✅ Complete |
| `query-instructions.ts` | ~342 | - | ✅ Complete |
| `pda-derivation.ts` | ~252 | - | ✅ Complete |
| `role-enforcement.ts` | ~370 | #72 | ✅ Complete |
| `state-machine.ts` | ~460 | #73 | ✅ Complete |
| `overflow-protection.ts` | ~410 | #74 | ✅ Complete |

## Test Helpers

The [`test-helpers.ts`](test-helpers.ts) module provides comprehensive test utilities:

### PDA Helpers

- [`getConfigPda()`](test-helpers.ts) - Get config PDA
- [`getNetbookPda()`](test-helpers.ts) - Get netbook PDA
- [`getRoleRequestPda()`](test-helpers.ts) - Get role request PDA
- [`getSerialHashRegistryPda()`](test-helpers.ts) - Get serial hash registry PDA
- [`getRoleHolderPda()`](test-helpers.ts) - Get role holder PDA

### Hash Utilities

- [`createHash()`](test-helpers.ts) - Create hash from numeric value
- [`createStringHash()`](test-helpers.ts) - Create hash from string
- [`createSerialNumber()`](test-helpers.ts) - Generate test serial number
- [`createBatchId()`](test-helpers.ts) - Generate test batch ID
- [`createModelSpecs()`](test-helpers.ts) - Generate test model specs

### Account Funding

- [`fundKeypair()`](test-helpers.ts) - Fund a single keypair
- [`fundAllAccounts()`](test-helpers.ts) - Fund multiple keypairs

### Transaction Helpers

- [`sleep()`](test-helpers.ts) - Delay execution
- [`waitForConfirmation()`](test-helpers.ts) - Wait for tx confirmation
- [`getLatestBlockhash()`](test-helpers.ts) - Get latest blockhash

### Test Setup

- [`createTestAccounts()`](test-helpers.ts) - Create default test accounts
- [`createTestNetbookData()`](test-helpers.ts) - Create test netbook data
- [`createTestAuditData()`](test-helpers.ts) - Create test audit data
- [`createTestValidationData()`](test-helpers.ts) - Create test validation data
- [`createTestAssignmentData()`](test-helpers.ts) - Create test assignment data

### Assertion Helpers

- [`assertNetbookState()`](test-helpers.ts) - Assert netbook state
- [`assertRequestStatus()`](test-helpers.ts) - Assert request status
- [`assertAccountHasBalance()`](test-helpers.ts) - Assert account balance

### Event Helpers

- [`onEvent()`](test-helpers.ts) - Listen for program events
- [`offEvent()`](test-helpers.ts) - Remove event listener

## Test Conventions

### Test Naming

- Use descriptive test names: `test_initialize_config`
- Group related tests with `describe()` blocks
- Follow pattern: `test_<instruction>_<scenario>`

### Test Structure

```typescript
describe("<feature>", () => {
  before(async () => {
    // Setup: fund accounts, initialize program
  });

  beforeEach(() => {
    // Reset state if needed
  });

  it("test_<scenario>", async () => {
    // Test logic
  });

  after(async () => {
    // Cleanup if needed
  });
});
```

### Error Testing

Always test error conditions:

```typescript
it("test_initialize_duplicate", async () => {
  // Attempt to initialize again
  await expect(...).to.be.rejectedWith(SupplyChainError.DuplicateConfig);
});
```

### PDA Testing

Always verify PDA derivation:

```typescript
const [expectedPda, expectedBump] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  program.programId
);
```

## CI/CD Integration

For CI/CD pipelines, use headless mode:

```bash
# Run tests without UI
anchor test --localnet --no-start-validator

# Run with specific validator settings
solana-test-validator --reset --quiet && anchor test
```

## Troubleshooting

### Common Issues

1. **Validator not running**
   ```bash
   solana-test-validator --reset
   ```

2. **Test timeout**
   - Increase timeout in Anchor.toml: `-t 1000000`
   - Check validator logs

3. **Account already exists**
   - Use `solana-test-validator --reset`
   - Ensure proper cleanup in tests

4. **Program not found**
   - Rebuild program: `anchor build`
   - Verify program ID in Anchor.toml

## Adding New Tests

1. Create test helper functions in `test-helpers.ts`
2. Add test cases to `sc-solana.ts` or create new test files
3. Document new tests in this README
4. Run full test suite before committing

## Test Coverage Goals

| Component | Target Coverage |
|-----------|-----------------|
| Instructions | 90%+ |
| State | 85%+ |
| Events | 80%+ |
| Errors | 95%+ |

## References

- [Anchor Testing Documentation](https://book.anchor-lang.com/chapter_p4/ch2_testing.html)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Mocha Test Framework](https://mochajs.org/)
