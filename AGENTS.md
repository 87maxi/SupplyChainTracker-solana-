# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview
Supply chain tracker on Solana with Anchor program (Rust) and Next.js frontend.

## Build/Lint/Test Commands
- `cd sc-solana && cargo build` - Build Solana program
- `cd sc-solana && cargo test` - Run program tests
- `cd sc-solana/programs/sc-solana && cargo test --test mollusk-tests` - Run Mollusk unit tests
- `cd sc-solana/programs/sc-solana && cargo test --test mollusk-lifecycle` - Run Mollusk lifecycle tests
- `cd sc-solana/programs/sc-solana && cargo test --test compute-units` - Run compute unit tests
- `cd web && npm test` - Run Jest tests
- `cd web && npm run test:e2e` - Run Playwright E2E tests
- `cd web && npm run dev` - Start frontend dev server
- `cd sc-solana && anchor test` - Run Anchor integration tests (requires validator)
- `cd sc-solana && anchor deploy` - Deploy program

## Architecture
- `sc-solana/` - Anchor program (Rust) with instructions for netbook, role, query operations
- `web/` - Next.js frontend with contract integration
- Program ID: derived from `sc-solana/programs/sc-solana/src/lib.rs`

## Key Patterns
- Anchor framework for Solana program
- Custom service layer: `web/src/services/SolanaSupplyChainService.ts`
- Role-based access: grant, revoke, request patterns in program
- Netbook lifecycle: register → assign → audit → validate
- State accounts: Config, Netbook, RoleHolder, RoleRequest, SerialHashRegistry
- PDA-first architecture: Admin as PDA `[b"admin", config.key()]`, Deployer PDA `[b"deployer"]`
- Multiple role holders: `add_role_holder`/`remove_role_holder` with MAX=100 per role

## Code Style
- Rust: Anchor idioms, custom macros in `lib.rs`
- TypeScript: Strict mode, React hooks pattern
- Tests: Jest for frontend, Mollusk/LiteSVM for program, Playwright for E2E
- Test organization: `*.litesvm.ts` for LiteSVM-based integration tests

## CI/CD Requirements
- **Rust Formatting**: ALWAYS run `cd sc-solana && cargo fmt` before committing Rust code
  - `cargo fmt --check` is enforced in CI (`rust-lint` job)
  - Affected files: all `.rs` files in `sc-solana/programs/sc-solana/src/` and `tests/`
- **E2E Tests**: Playwright manages the Next.js server lifecycle via `webServer` config
  - Do NOT manually start servers in CI workflow (causes port conflicts)
  - `reuseExistingServer: true` in `playwright.config.ts` handles server reuse
- **Deploy Workflow**: Program deployment requires local Anchor CLI
  - CI only runs `cargo check --all-targets` for validation
  - To deploy: `cd sc-solana && anchor build && anchor deploy`
- **Mollusk/LiteSVM Tests**: Run in-process without validator
  - `cargo test --test mollusk-tests` - Unit tests for PDAs, discriminators, space calcs
  - `cargo test --test mollusk-lifecycle` - Full lifecycle state machine tests
  - `cargo test --test compute-units` - Compute unit measurement tests
- **Security Scanning**: CI includes automated vulnerability checks
  - Arbitrary CPI detection, PDA validation, signer checks

## Pre-commit Checklist
- [ ] Run `cargo fmt` on all Rust files
- [ ] Run `cargo clippy -- -D warnings` for Rust warnings
- [ ] Run `npx tsc --noEmit` in `web/` for type checking
- [ ] Run `npx eslint src/ --max-warnings=0` in `web/` for linting
- [ ] Run `npm test` in `web/` for unit tests
- [ ] Run `cargo test --test mollusk-tests` in `sc-solana/programs/sc-solana/` for program unit tests

## Testing Strategy
- **Unit Tests (Rust)**: Mollusk/LiteSVM in-process tests - fast, deterministic, no validator
- **Unit Tests (TS)**: Jest for frontend utilities, service layer, and component logic
- **E2E Tests**: Playwright with MockWalletAdapter - UI verification without blockchain
- **Integration Tests**: Disabled in CI (toolchain incompatibility) - run locally with `anchor test`
- **Compute Units**: Measure CU consumption per instruction for optimization tracking

## Program Architecture
- **State Machine**: Fabricada(0) → HwAprobado(1) → SwValidado(2) → Distribuida(3)
- **Role System**: FABRICANTE, AUDITOR_HW, TECNICO_SW, ESCUELA (multiple holders per role)
- **PII Protection**: School/student IDs stored as `[u8; 32]` hashes
- **Bounded Strings**: Serial(200), Batch(100), Specs(500), OS(100) char limits
- **Error Codes**: 6000-6014 range with descriptive messages
