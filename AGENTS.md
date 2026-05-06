# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview
Supply chain tracker on Solana with Anchor program (Rust) and Next.js frontend.

## Build/Lint/Test Commands
- `cd sc-solana && cargo build` - Build Solana program
- `cd sc-solana && cargo test` - Run program tests
- `cd web && yarn test` - Run Jest tests
- `cd web && yarn dev` - Start frontend dev server
- `cd sc-solana && anchor test` - Run Anchor integration tests
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

## Code Style
- Rust: Anchor idioms, custom macros in `lib.rs`
- TypeScript: Strict mode, React hooks pattern
- Tests: Jest for frontend, Anchor tests for program
