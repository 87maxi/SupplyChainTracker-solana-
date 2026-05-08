# SupplyChainTracker - Ethereum to Solana/Anchor Migration Roadmap

## Overview

This document outlines the complete migration plan for transforming the SupplyChainTracker smart contract from Ethereum/Solidity to Solana/Anchor, plus the frontend migration from Ethereum web3 stack to Solana.

**Source Contract:** [`sc/src/SupplyChainTracker.sol`](sc/src/SupplyChainTracker.sol)  
**Target Contract:** [`sc-solana/`](sc-solana/)  
**Program ID:** `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN`
**Frontend:** [`web/`](web/) -- Next.js 16 + React 19 + wagmi/viem → @solana/wallet-adapter  
**Total Estimated Effort:** ~120 hours (Smart Contract: ~52h + Frontend: ~68h)

## Current Status (Updated 2026-05-07)

| Component | Status | Completion |
|-----------|--------|------------|
| Smart Contract (sc-solana) | Modularized, Core Complete | ~95% |
| Frontend (web/) | Solana Migrated (Partial) | ~90% |
| CI/CD | Complete | 100% |
| Documentation | Updated | ~85% |
| Runbooks (txtx) | Consistent with Surfpool | ~90% |

---

## Smart Contract Actual Status (vs Roadmap)

### Completed in sc-solana

| Phase | Item | Status | Notes |
|-------|------|--------|-------|
| 3 | `Netbook` struct | ✅ Done | All fields present, 1147 bytes |
| 3 | `NetbookState` enum | ✅ Done | 4 states as u8 |
| 3 | `RoleRequest` struct | ✅ Done | All fields present, timestamp using Clock |
| 3 | `SupplyChainConfig` | ✅ Done | All counters and role authorities present |
| 4 | `grant_role` instruction | ✅ Done | Stores role authorities, checks duplicates |
| 4 | `revoke_role` instruction | ✅ Done | Clears role authorities |
| 4 | `request_role` instruction | ✅ Done | Auto-incrementing IDs, timestamps |
| 4 | `approve_role_request` | ✅ Done | Sets status, auto-grants role |
| 4 | `reject_role_request` | ✅ Done | Sets status to Rejected |
| 5 | `register_netbook` | ✅ Done | Single + batch registration, PDA derivation fixed |
| 6 | `audit_hardware` | ✅ Done | AUDITOR_HW_ROLE check enforced |
| 7 | `validate_software` | ✅ Done | TECNICO_SW_ROLE check enforced |
| 8 | `assign_to_student` | ✅ Done | ESCUELA_ROLE check enforced |
| 9 | View/Query Instructions | ✅ Done | `query_netbook_state`, `query_config`, `query_role` |
| 15 | README.md | ✅ Done | 277 lines comprehensive docs |
| 17 | IDL & Types | ✅ Done | Generated correctly |

### Critical Bugs / Inconsistencies in sc-solana

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | **PDA Derivation** - FIXED | 🔴 Critical | ✅ Fixed in lib.rs:252 |
| 2 | **Role enforcement** - FIXED | 🔴 Critical | ✅ Fixed - roles stored & checked |
| 3 | **Missing counters** - FIXED | 🟡 Medium | ✅ Fixed - counters in Config |
| 4 | **Missing error codes** - FIXED | 🟡 Medium | ✅ Fixed - all 11 codes defined |
| 5 | **No batch registration** - FIXED | 🟡 Medium | ✅ Fixed - `register_netbooks_batch` |
| 6 | **No view/query functions** - FIXED | 🟠 High | ✅ Fixed - 3 query instructions added |
| 7 | **Timestamp always = 0** - FIXED | 🟢 Low | ✅ Fixed - using `Clock::get()` |
| 8 | **RoleRequest ID hardcoded** | 🟢 Low | ⚠️ Documented limitation (Issue #44) |
| 9 | **Project structure** - single `lib.rs` | 🟡 Medium | ⚠️ All code in lib.rs (1267 lines) |
| 10 | **Config missing role authorities** - FIXED | 🔴 Critical | ✅ Fixed - all role fields present |

### Recently Resolved Issues (2026-05-04)

| Issue | Description | Resolution |
|-------|-------------|------------|
| [#33](https://github.com/87maxi/SupplyChainTracker-solana-/issues/33) | Batch Registration Limitation | ✅ Documented |
| [#35](https://github.com/87maxi/SupplyChainTracker-solana-/issues/35) | Hardcoded PDA Index 0 | ✅ Fixed - serial-to-tokenId mapping |
| [#36](https://github.com/87maxi/SupplyChainTracker-solana-/issues/36) | Empty/Stub IDL | ✅ Verified - valid content |
| [#38](https://github.com/87maxi/SupplyChainTracker-solana-/issues/38) | Ethereum Block Explorer URLs | ✅ Fixed - Solana Explorer |
| [#39](https://github.com/87maxi/SupplyChainTracker-solana-/issues/39) | Fake Transaction Simulation | ✅ Fixed - real Solana monitoring |
| [#40](https://github.com/87maxi/SupplyChainTracker-solana-/issues/40) | isAdmin Check Wrong | ✅ Fixed - admin pubkey |
| [#43](https://github.com/87maxi/SupplyChainTracker-solana-/issues/43) | CI/CD Anchor Version Mismatch | ✅ Fixed - 0.32.1 |
| [#44](https://github.com/87maxi/SupplyChainTracker-solana-/issues/44) | RoleRequest Single-Per-User | ✅ Documented |
| [#45](https://github.com/87maxi/SupplyChainTracker-solana-/issues/45) | Brute-Force Netbook Lookup | ✅ Fixed - parallel batch |

### Refactoring Phases Completed (2026-05-07)

| Phase | Issue | Description | Status |
|-------|-------|-------------|--------|
| Phase 0 | #132 | Cleanup Documentation | ✅ Completed |
| Phase 1 | #133 | Clean Up Obsolete Code and Scripts | ✅ Completed |
| Phase 2 | #134 | Fix Program ID Inconsistency (CRITICAL) | ✅ Completed |
| Phase 3 | #135 | Remove Dead Code and Allow Directives | ✅ Completed |
| Phase 4 | #136 | Verify Consistency with Surfpool/txtx IAC | ✅ Completed |
| Phase 5 | #137 | Update Documentation and Create CHANGELOG | ✅ Completed |

**Refactoring Plan:** [`plans/refactoring-plan.md`](plans/refactoring-plan.md)
**Detailed Issues:** [`plans/issues/phase-0-cleanup-documentation.md`](plans/issues/phase-0-cleanup-documentation.md)

---

## Quick Links - All Issues

### Smart Contract (sc-solana)

| Issue | Phase | Description | Priority |
|-------|-------|-------------|----------|
| [#1](https://github.com/87maxi/SupplyChainTracker-solana-/issues/1) | Phase 2 | Anchor Program Core Structure | P0 |
| [#2](https://github.com/87maxi/SupplyChainTracker-solana-/issues/2) | Phase 3 | State & Data Structures | P0 |
| [#3](https://github.com/87maxi/SupplyChainTracker-solana-/issues/3) | Phase 4 | Role Management | P0 |
| [#4](https://github.com/87maxi/SupplyChainTracker-solana-/issues/4) | Phase 5 | Netbook Registration | P0 |
| [#5](https://github.com/87maxi/SupplyChainTracker-solana-/issues/5) | Phase 6 | Hardware Audit | P1 |
| [#6](https://github.com/87maxi/SupplyChainTracker-solana-/issues/6) | Phase 7 | Software Validation | P1 |
| [#7](https://github.com/87maxi/SupplyChainTracker-solana-/issues/7) | Phase 8 | Student Assignment | P1 |
| [#8](https://github.com/87maxi/SupplyChainTracker-solana-/issues/8) | Phase 9 | View/Query Instructions | P2 |
| [#9](https://github.com/87maxi/SupplyChainTracker-solana-/issues/9) | Phase 10 | Testing Framework | P0 |
| [#10](https://github.com/87maxi/SupplyChainTracker-solana-/issues/10) | Phase 11 | Integration Tests | P0 |
| [#11](https://github.com/87maxi/SupplyChainTracker-solana-/issues/11) | Phase 12 | Security & Edge Case Tests | P1 |
| [#12](https://github.com/87maxi/SupplyChainTracker-solana-/issues/12) | Phase 13 | Deployment Scripts | P1 |
| [#13](https://github.com/87maxi/SupplyChainTracker-solana-/issues/13) | Phase 14 | Complete Migration | P0 |
| [#14](https://github.com/87maxi/SupplyChainTracker-solana-/issues/14) | Phase 15 | README | P2 |
| [#15](https://github.com/87maxi/SupplyChainTracker-solana-/issues/15) | Phase 16 | CI/CD Pipeline | P2 |
| [#16](https://github.com/87maxi/SupplyChainTracker-solana-/issues/16) | Phase 17 | IDL & Client Types | P2 |
| [#17](https://github.com/87maxi/SupplyChainTracker-solana-/issues/17) | Bug Fix | Fix Critical PDA Derivation | P0 |
| [#18](https://github.com/87maxi/SupplyChainTracker-solana-/issues/18) | Bug Fix | Implement Real Role Enforcement | P0 |
| [#19](https://github.com/87maxi/SupplyChainTracker-solana-/issues/19) | Bug Fix | Add Missing Error Codes | P1 |
| [#20](https://github.com/87maxi/SupplyChainTracker-solana-/issues/20) | Enhancement | Add Batch Registration | P1 |
| [#21](https://github.com/87maxi/SupplyChainTracker-solana-/issues/21) | Bug Fix | Fix Timestamps & Config Counters | P2 |

### Frontend Migration (web/)

| Issue | Phase | Description | Priority |
|-------|-------|-------------|----------|
| [#22](https://github.com/87maxi/SupplyChainTracker-solana-/issues/22) | Phase 18 | Replace Ethereum Web3 Stack with Solana | P0 |
| [#23](https://github.com/87maxi/SupplyChainTracker-solana-/issues/23) | Phase 19 | Replace Contract Interaction Layer | P0 |
| [#24](https://github.com/87maxi/SupplyChainTracker-solana-/issues/24) | Phase 20 | Migrate Hooks to Solana | P0 |
| [#25](https://github.com/87maxi/SupplyChainTracker-solana-/issues/25) | Phase 21 | Migrate Service Layer | P0 |
| [#26](https://github.com/87maxi/SupplyChainTracker-solana-/issues/26) | Phase 22 | Replace Wallet UI Components | P1 |
| [#27](https://github.com/87maxi/SupplyChainTracker-solana-/issues/27) | Phase 23 | Migrate Contract Form Components | P1 |
| [#28](https://github.com/87maxi/SupplyChainTracker-solana-/issues/28) | Phase 24 | Migrate Dashboard & Pages | P1 |
| [#29](https://github.com/87maxi/SupplyChainTracker-solana-/issues/29) | Phase 25 | Migrate Admin & Analytics Pages | P2 |
| [#30](https://github.com/87maxi/SupplyChainTracker-solana-/issues/30) | Phase 26 | Final Integration & Testing | P0 |

---

## Original Solidity Implementation Analysis

### Core Features

| Feature | Description |
|---------|-------------|
| **Role-Based Access Control** | OpenZeppelin AccessControl with 4 custom roles |
| **State Machine** | 4-state lifecycle: FABRICADA → HW_APROBADO → SW_VALIDADO → DISTRIBUIDA |
| **Batch Operations** | Array-based netbook registration |
| **Role Requests** | Decentralized role request/approval workflow |
| **Metadata Storage** | JSON metadata for netbooks, hardware reports, software validation |
| **PII Privacy** | Hash-based student ID and school storage |
| **Token ID Mapping** | Serial numbers mapped to incremental token IDs |

### Role Definitions

| Role | Name | Permissions |
|------|------|-------------|
| `FABRICANTE_ROLE` | Manufacturer | Register netbooks |
| `AUDITOR_HW_ROLE` | Hardware Auditor | Approve hardware integrity |
| `TECNICO_SW_ROLE` | Software Technician | Validate software |
| `ESCUELA_ROLE` | School | Receive assigned netbooks |

### State Machine

```
FABRICADA ──→ HW_APROBADO ──→ SW_VALIDADO ──→ DISTRIBUIDA
  (1)           (2)              (3)             (4)
```

---

## Migration Phases

### Phase 1: Analysis & Planning ✅

**Status:** Complete

### Phase 2: Anchor Program Core Structure

**GitHub Issue:** [#1](https://github.com/87maxi/SupplyChainTracker-solana-/issues/1)  
**Priority:** P0  
**Status:** Partial (all code in single lib.rs, not modularized)

### Phase 3: State & Data Structures

**GitHub Issue:** [#2](https://github.com/87maxi/SupplyChainTracker-solana-/issues/2)  
**Priority:** P0  
**Status:** Partial (missing counters and role authorities)

### Phase 4: Role Management

**GitHub Issue:** [#3](https://github.com/87maxi/SupplyChainTracker-solana-/issues/3)  
**Priority:** P0  
**Status:** Superficial (events emitted but no storage/enforcement)

### Phase 5: Netbook Registration

**GitHub Issue:** [#4](https://github.com/87maxi/SupplyChainTracker-solana-/issues/4)  
**Priority:** P0  
**Status:** Partial (single only, no batch, no duplicate check)

### Phase 6: Hardware Audit

**GitHub Issue:** [#5](https://github.com/87maxi/SupplyChainTracker-solana-/issues/5)  
**Priority:** P1  
**Status:** Partial (no role check)

### Phase 7: Software Validation

**GitHub Issue:** [#6](https://github.com/87maxi/SupplyChainTracker-solana-/issues/6)  
**Priority:** P1  
**Status:** Partial (no role check)

### Phase 8: Student Assignment

**GitHub Issue:** [#7](https://github.com/87maxi/SupplyChainTracker-solana-/issues/7)  
**Priority:** P1  
**Status:** Partial (no role check)

### Phase 9: View/Query Instructions

**GitHub Issue:** [#8](https://github.com/87maxi/SupplyChainTracker-solana-/issues/8)  
**Priority:** P2  
**Status:** Not Started

### Phase 10-12: Testing

**Issues:** [#9](https://github.com/87maxi/SupplyChainTracker-solana-/issues/9), [#10](https://github.com/87maxi/SupplyChainTracker-solana-/issues/10), [#11](https://github.com/87maxi/SupplyChainTracker-solana-/issues/11)  
**Status:** Partial (8 test blocks, 16 tests exist but not comprehensive)

### Phase 13-17: Deployment, Docs, CI/CD, IDL

**Issues:** [#12](https://github.com/87maxi/SupplyChainTracker-solana-/issues/12) through [#16](https://github.com/87maxi/SupplyChainTracker-solana-/issues/16)  
**Status:** Mixed

---

## Frontend Migration - Complete Plan

### Architecture Changes Required

| Ethereum Component | Solana Replacement |
|--------------------|-------------------|
| `wagmi` + `@wagmi/core` | `@solana/wallet-adapter-react` + `@solana/wallet-adapter-base` |
| `viem` (EVM interface) | `@solana/web3.js` + `@coral-xyz/anchor` |
| `ethers` | `@solana/web3.js` (provider) |
| `@rainbow-me/rainbowkit` | `@solana/wallet-adapter-react-ui` |
| `@tanstack/react-query` + wagmi | `@solana/wallet-adapter-react` + react-query |
| `0x` Ethereum addresses (40 hex) | `Pubkey` strings (base58, 32-44 chars) |
| `keccak256` role hashes | PDA seeds or string role identifiers |
| `window.ethereum` | `window.solana` (Phantom wallet provider) |
| `useSignMessage` (EIP-191) | `signMessage` via wallet adapter |
| EVM chain (Anvil, ID 31337) | Solana cluster (localnet:8899, devnet, mainnet-beta) |
| Gas fees (ETH) | Compute units + SOL rent |
| Contract ABI (`*.json`) | Anchor IDL (`*.json`) |
| Contract address | Program ID |
| Etherscan explorer | Solana Explorer |

### Frontend Files That Need Rewriting

#### Core Infrastructure (Phase 18-19)

| File | Change Required |
|------|----------------|
| `web/package.json` | Replace wagmi/viem/ethers/RainbowKit with @solana/* packages |
| `web/src/lib/blockchain/client.ts` | Replace viem clients with `@solana/web3.js` Connection + Anchor Program |
| `web/src/lib/wagmi/config.ts` | Replace with Solana cluster config (localnet, devnet, mainnet) |
| `web/src/lib/wagmi/connectors.ts` | Replace with wallet adapter connectors |
| `web/src/lib/web3.ts` | Replace ethers with Solana provider |
| `web/src/lib/contracts/SupplyChainContract.ts` | Replace with Anchor-generated client |
| `web/src/lib/contracts/abi/*` | Replace ABI JSON with Anchor IDL |
| `web/src/lib/constants/roles.ts` | Replace keccak256 hashes with role strings/PDAs |
| `web/src/lib/state-machine.ts` | Keep logic, update type references |
| `web/src/lib/validation/schemas.ts` | Replace address regex with PublicKey validation |
| `web/src/lib/env.ts` | Replace contract address with program ID + RPC URL |
| `web/src/lib/types.ts` | Replace EthereumProvider with Solana provider |
| `web/.env.local` | Replace address with PROGRAM_ID + RPC_URL |
| `web/EXAMPLE.env` | Update all env vars |
| `web/wagmi.config.js` | Remove (Solana doesn't need wagmi config) |
| `web/src/lib/api/serverRpc.ts` | Replace with Solana RPC server calls |

#### Service Layer (Phase 21)

| File | Change Required |
|------|----------------|
| `web/src/services/SupplyChainService.ts` | Replace viem calls with Anchor program instructions |
| `web/src/services/contracts/base-contract.service.ts` | Rewrite for Anchor program interaction |
| `web/src/services/contracts/role.service.ts` | Replace with Anchor role instructions |
| `web/src/services/RoleRequestService.ts` | Replace with Anchor role request instructions |
| `web/src/services/contract-registry.service.ts` | Update registry for Anchor program |

#### Hooks (Phase 20)

| File | Change Required |
|------|----------------|
| `web/src/hooks/useWeb3.ts` | Replace wagmi hooks with wallet adapter hooks |
| `web/src/hooks/useContract.ts` | Update for Anchor program |
| `web/src/hooks/use-contracts/use-supply-chain.hook.ts` | Replace with Anchor program hook |
| `web/src/hooks/use-contracts/use-role.hook.ts` | Replace with Anchor role hook |
| `web/src/hooks/useUserRoles.ts` | Replace `hasRole` with PDA role lookups |
| `web/src/hooks/useRoleRequests.ts` | Replace with Anchor role request queries |
| `web/src/hooks/use-cached-data.ts` | Update caching for Solana RPC |
| `web/src/hooks/useTransaction.ts` | Replace tx hash format (base58 vs hex) |

#### Wallet Components (Phase 22)

| File | Change Required |
|------|----------------|
| `web/src/components/Web3Providers.tsx` | Replace Wagmi/RainbowKit with Solana providers |
| `web/src/components/WalletConnectButton.tsx` | Replace with WalletAdapter ConnectButton |
| `web/src/components/RainbowKitProviderWrapper.tsx` | Replace with Solana ConnectionProvider |
| `web/src/components/contracts/RoleRequestModal.tsx` | Replace `useSignMessage` with wallet signMessage |

#### Contract Forms (Phase 23)

| File | Change Required |
|------|----------------|
| `web/src/components/contracts/HardwareAuditForm.tsx` | Update tx submission for Anchor |
| `web/src/components/contracts/SoftwareValidationForm.tsx` | Update tx submission for Anchor |
| `web/src/components/contracts/StudentAssignmentForm.tsx` | Update tx submission for Anchor |
| `web/src/components/contracts/RoleManager.tsx` | Replace OpenZeppelin role UI |
| `web/src/components/contracts/TransactionConfirmation.tsx` | Update tx hash display (base58) |
| `web/src/components/contracts/TransactionStatus.tsx` | Update for Solana finality |
| `web/src/components/contracts/StateBadge.tsx` | Update state references |

#### Pages & Data (Phase 24-25)

| File | Change Required |
|------|----------------|
| `web/src/app/page.tsx` | Update wallet connection, feature cards |
| `web/src/app/dashboard/page.tsx` | Replace all contract calls with Anchor |
| `web/src/app/tokens/page.tsx` | Replace netbook queries with Anchor |
| `web/src/app/tokens/create/page.tsx` | Replace registration with Anchor instruction |
| `web/src/app/tokens/[id]/page.tsx` | Replace netbook detail with Anchor query |
| `web/src/app/transfers/page.tsx` | Replace with Anchor event queries |
| `web/src/app/profile/page.tsx` | Replace ETH balance with SOL balance |
| `web/src/app/admin/` (all sub-pages) | Replace all contract interactions |

#### Types (Phase 19)

| File | Change Required |
|------|----------------|
| `web/src/types/contract.ts` | Replace ContractRoles with Solana roles |
| `web/src/types/supply-chain-types.ts` | Update Netbook type for Solana |
| `web/src/types/role-request.ts` | Update for Anchor RoleRequest |

#### Unused/Legacy Files to Remove

| File | Reason |
|------|--------|
| `web/src/lib/wagmi/*` (entire directory) | wagmi is EVM-specific |
| `web/src/lib/web3.ts` (ethers reference) | ethers is EVM-specific |
| `web/src/lib/contracts/abi/SupplyChainTracker.json` | Solidity ABI |
| `web/src/contracts/SupplyChainTrackerABI.json` | Solidity ABI |
| `web/src/components/RainbowKitProviderWrapper.tsx` | RainbowKit is EVM-specific |
| `web/wagmi.config.js` | wagmi config |
| `web/src/lib/roleMapping.ts` | OpenZeppelin role mapping |
| `web/src/lib/wagmi/verify-config.ts` | EVM-specific |
| `web/src/hooks/useUserStats.ts` | MongoDB-based (legacy) |
| `web/src/hooks/useNetbookStats.ts` | MongoDB-based (legacy) |
| `web/src/hooks/useFetchUsers.ts` | MongoDB (legacy) |
| `web/src/hooks/useFetchNetbooks.ts` | MongoDB (legacy) |
| `web/src/hooks/useProcessedUserAndNetbookData.ts` | MongoDB (legacy) |
| `web/src/types/mongodb.ts` | MongoDB types |

---

### Frontend Migration Timeline

| Phase | Description | Estimated Effort | Priority |
|-------|-------------|-----------------|----------|
| 18 | Replace Ethereum Web3 Stack | 6h | P0 |
| 19 | Replace Contract Interaction Layer | 6h | P0 |
| 20 | Migrate Hooks to Solana | 8h | P0 |
| 21 | Migrate Service Layer | 8h | P0 |
| 22 | Replace Wallet UI Components | 4h | P1 |
| 23 | Migrate Contract Form Components | 8h | P1 |
| 24 | Migrate Dashboard & Pages | 10h | P1 |
| 25 | Migrate Admin & Analytics Pages | 6h | P2 |
| 26 | Final Integration & Testing | 10h | P0 |
| | **Total Frontend** | **~68h** | |

---

## Smart Contract Timeline Estimate

| Phase | Estimated Time | Cumulative |
|-------|---------------|------------|
| Phase 2: Core Structure | 2h | 2h |
| Phase 3: State & Data | 4h | 6h |
| Phase 4: Role Management | 6h | 12h |
| Phase 5: Registration | 4h | 16h |
| Phase 6: Hardware Audit | 3h | 19h |
| Phase 7: Software Validation | 3h | 22h |
| Phase 8: Student Assignment | 3h | 25h |
| Phase 9: View/Query | 4h | 29h |
| Phase 10: Test Framework | 3h | 32h |
| Phase 11: Integration Tests | 6h | 38h |
| Phase 12: Security Tests | 5h | 43h |
| Phase 13: Deployment | 3h | 46h |
| Phase 15: Documentation | 2h | 48h |
| Phase 16: CI/CD Pipeline | 2h | 50h |
| Phase 17: IDL & Client Types | 2h | 52h |
| Bug Fixes (PDA, Roles, etc.) | 10h | 62h |
| **Smart Contract Total** | | **~62h** |
| **Frontend Total** | | **~68h** |
| **Grand Total** | | **~130h** |

---

## Error Mapping (Solidity → Anchor)

| Solidity Error | Anchor Error | Status |
|----------------|--------------|--------|
| `Unauthorized()` | `ErrorCode::Unauthorized` (6000) | ✅ Defined |
| `ArrayLengthMismatch()` | `ErrorCode::InvalidInput` (6003) | ⚠️ Reused |
| `InvalidSerialNumber()` | `ErrorCode::InvalidInput` (6003) | ⚠️ Reused |
| `NetbookAlreadyRegistered()` | **Missing** | ❌ Not defined |
| `InvalidState()` | `ErrorCode::InvalidStateTransition` (6001) | ✅ Defined |
| `NetbookNotFound()` | `ErrorCode::NetbookNotFound` (6002) | ⚠️ Defined but unused |
| `InvalidRequestID()` | **Missing** | ❌ Not defined |
| `RequestNotPending()` | **Missing** | ❌ Not defined |
| `InvalidRoleType()` | **Missing** | ❌ Not defined |

---

## Key Differences: Ethereum → Solana

| Aspect | Ethereum/Solidity | Solana/Anchor |
|--------|-------------------|---------------|
| **Storage** | SSTORE/SLOAD | PDA accounts with borsh serialization |
| **State** | Contract storage variables | Separate account structs |
| **Access Control** | OpenZeppelin AccessControl | Custom role checks in instructions |
| **Events** | Solidity events | Anchor events (for off-chain indexing) |
| **Execution** | EVM bytecode | BPF bytecode |
| **Transaction Cost** | Gas (ETH) | Lamports (SOL) + compute budget |
| **Finality** | Probabilistic (~12-15 sec) | Deterministic (~400 ms) |
| **Data Size Limit** | ~128 KB per block | ~10 KB per transaction |
| **Wallets** | MetaMask, RainbowKit | Phantom, Solflare, Backpack |
| **Address Format** | 0x + 40 hex chars | Base58, 32-44 chars |
| **Transaction Hash** | 0x + 66 hex chars | Base58, 86-88 chars |
| **RPC Endpoint** | HTTP/WS (JSON-RPC) | HTTP (JSON-RPC, port 8899) |
| **Signature** | EIP-191 / EIP-712 | Ed25519 via wallet adapter |
| **Balance** | ETH / Wei | SOL / Lamports (1 SOL = 10^9 lamports) |
| **Frontend Libraries** | wagmi, viem, ethers | @solana/web3.js, @coral-xyz/anchor |
| **Wallet UI** | RainbowKit | @solana/wallet-adapter-react-ui |

---

## Frontend Dependency Changes

### Remove (Ethereum)

| Package | Version |
|---------|---------|
| wagmi | ^2.19.5 |
| viem | ^2.43.3 |
| @wagmi/core | ^2.19.5 |
| @rainbow-me/rainbowkit | ^2.2.10 |
| ethers | ^6.16.0 |
| @base-org/account | ^2.5.0 |

### Add (Solana)

| Package | Version | Purpose |
|---------|---------|---------|
| @solana/web3.js | ^1.98.0 | Solana RPC client |
| @coral-xyz/anchor | ^0.32.0 | Anchor program interaction |
| @solana/wallet-adapter-base | ^0.9.23 | Wallet adapter base |
| @solana/wallet-adapter-react | ^0.15.35 | React wallet adapter |
| @solana/wallet-adapter-react-ui | ^0.9.35 | Wallet UI components |
| @solana/wallet-adapter-wallets | ^0.19.32 | All wallet adapters |
| @solana/spl-token | ^0.4.12 | SPL token utilities (if needed) |

---

## Notes

1. **String Limits:** Solana has strict account size limits
   - `serial_number`: max 200 chars
   - `batch_id`: max 100 chars
   - `model_specs`: max 500 chars
   - `os_version`: max 100 chars

2. **PII Protection:** Student IDs and school hashes stored as `[u8; 32]` (SHA-256)

3. **State Machine:** Must enforce strict state transitions in each instruction

4. **Role System:** Solana uses Pubkeys. Role membership stored as PDAs or embedded in config account

5. **Token IDs:** Sequential counter in config account (no ERC-1155, just incremental u64)

6. **Wallet Adapter:** Users need Phantom/Solflare/Backpack installed in browser

7. **RPC URL:** localnet = `http://localhost:8899`, devnet = `https://api.devnet.solana.com`

8. **Compute Budget:** Solana transactions require compute budget (similar to gas limit)

9. **Rent Exemption:** New accounts must be rent-exempt (minimum lamports based on account size)

10. **Clock Program:** Used for timestamps on-chain (Anchor provides via `Clock::get()`)

---

## Issue Tracking Summary - Smart Contract

| Issue | Phase | Description | Priority | Status |
|-------|-------|-------------|----------|--------|
| [#1](https://github.com/87maxi/SupplyChainTracker-solana-/issues/1) | Phase 2 | Anchor Program Core Structure | P0 | Open |
| [#2](https://github.com/87maxi/SupplyChainTracker-solana-/issues/2) | Phase 3 | State & Data Structures (Accounts) | P0 | Open |
| [#3](https://github.com/87maxi/SupplyChainTracker-solana-/issues/3) | Phase 4 | Role Management Implementation | P0 | Open |
| [#4](https://github.com/87maxi/SupplyChainTracker-solana-/issues/4) | Phase 5 | Netbook Registration Instruction | P0 | Open |
| [#5](https://github.com/87maxi/SupplyChainTracker-solana-/issues/5) | Phase 6 | Hardware Audit Instruction | P1 | Open |
| [#6](https://github.com/87maxi/SupplyChainTracker-solana-/issues/6) | Phase 7 | Software Validation Instruction | P1 | Open |
| [#7](https://github.com/87maxi/SupplyChainTracker-solana-/issues/7) | Phase 8 | Student Assignment Instruction | P1 | Open |
| [#8](https://github.com/87maxi/SupplyChainTracker-solana-/issues/8) | Phase 9 | View/Query Instructions | P2 | ✅ Done (Issue #31) |
| [#9](https://github.com/87maxi/SupplyChainTracker-solana-/issues/9) | Phase 10 | Testing Framework Setup | P0 | Open |
| [#10](https://github.com/87maxi/SupplyChainTracker-solana-/issues/10) | Phase 11 | Integration Tests (Full Lifecycle) | P0 | Open |
| [#11](https://github.com/87maxi/SupplyChainTracker-solana-/issues/11) | Phase 12 | Security & Edge Case Tests | P1 | Open |
| [#12](https://github.com/87maxi/SupplyChainTracker-solana-/issues/12) | Phase 13 | Deployment Scripts & Migration | P1 | Open |
| [#13](https://github.com/87maxi/SupplyChainTracker-solana-/issues/13) | Phase 14 | Complete Migration Implementation | P0 | Open |
| [#14](https://github.com/87maxi/SupplyChainTracker-solana-/issues/14) | Phase 15 | README.md & Project Documentation | P2 | Open |
| [#15](https://github.com/87maxi/SupplyChainTracker-solana-/issues/15) | Phase 16 | CI/CD Pipeline & GitHub Actions | P2 | Open |
| [#16](https://github.com/87maxi/SupplyChainTracker-solana-/issues/16) | Phase 17 | IDL Generation & TypeScript Client Types | P2 | Open |
| [#132](https://github.com/87maxi/SupplyChainTracker-solana-/issues/132) | Refactor Phase 0 | Cleanup Documentation | P2 | ✅ Completed |
| [#133](https://github.com/87maxi/SupplyChainTracker-solana-/issues/133) | Refactor Phase 1 | Clean Up Obsolete Code and Scripts | P2 | ✅ Completed |
| [#134](https://github.com/87maxi/SupplyChainTracker-solana-/issues/134) | Refactor Phase 2 | Fix Program ID Inconsistency | P0 | ✅ Completed |
| [#135](https://github.com/87maxi/SupplyChainTracker-solana-/issues/135) | Refactor Phase 3 | Remove Dead Code and Allow Directives | P1 | ✅ Completed |
| [#136](https://github.com/87maxi/SupplyChainTracker-solana-/issues/136) | Refactor Phase 4 | Verify Consistency with Surfpool/txtx IAC | P1 | ✅ Completed |
| [#137](https://github.com/87maxi/SupplyChainTracker-solana-/issues/137) | Refactor Phase 5 | Update Documentation and Create CHANGELOG | P2 | ✅ Completed |

## Issue Tracking Summary - Frontend Migration

| Issue | Phase | Description | Priority | Status |
|-------|-------|-------------|----------|--------|
| [#17](https://github.com/87maxi/SupplyChainTracker-solana-/issues/17) | Bug Fix | Fix Critical PDA Derivation (Netbook seed) | P0 | ✅ Done |
| [#18](https://github.com/87maxi/SupplyChainTracker-solana-/issues/18) | Bug Fix | Implement Real Role Enforcement | P0 | ✅ Done |
| [#19](https://github.com/87maxi/SupplyChainTracker-solana-/issues/19) | Bug Fix | Add Missing Error Codes | P1 | ✅ Done |
| [#20](https://github.com/87maxi/SupplyChainTracker-solana-/issues/20) | Enhancement | Add Batch Registration Support | P1 | ✅ Done |
| [#21](https://github.com/87maxi/SupplyChainTracker-solana-/issues/21) | Bug Fix | Fix Timestamps & Config Counters | P2 | ✅ Done |
| [#22](https://github.com/87maxi/SupplyChainTracker-solana-/issues/22) | Phase 18 | Replace Ethereum Web3 Stack with Solana | P0 | Open |
| [#23](https://github.com/87maxi/SupplyChainTracker-solana-/issues/23) | Phase 19 | Replace Contract Interaction Layer | P0 | Open |
| [#24](https://github.com/87maxi/SupplyChainTracker-solana-/issues/24) | Phase 20 | Migrate Hooks to Solana | P0 | Open |
| [#25](https://github.com/87maxi/SupplyChainTracker-solana-/issues/25) | Phase 21 | Migrate Service Layer | P0 | Open |
| [#26](https://github.com/87maxi/SupplyChainTracker-solana-/issues/26) | Phase 22 | Replace Wallet UI Components | P1 | Open |
| [#27](https://github.com/87maxi/SupplyChainTracker-solana-/issues/27) | Phase 23 | Migrate Contract Form Components | P1 | Open |
| [#28](https://github.com/87maxi/SupplyChainTracker-solana-/issues/28) | Phase 24 | Migrate Dashboard & Pages | P1 | Open |
| [#29](https://github.com/87maxi/SupplyChainTracker-solana-/issues/29) | Phase 25 | Migrate Admin & Analytics Pages | P2 | Open |
| [#30](https://github.com/87maxi/SupplyChainTracker-solana-/issues/30) | Phase 26 | Final Integration & Testing | P0 | Open |

---
