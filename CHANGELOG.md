# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive refactoring plan in [`plans/refactoring-plan.md`](plans/refactoring-plan.md)
- GitHub issue templates for refactoring phases in [`plans/github-issue-refactoring-roadmap.md`](plans/github-issue-refactoring-roadmap.md)
- Refactoring phases 0-5 tracking in [`plans/issues/phase-0-cleanup-documentation.md`](plans/issues/phase-0-cleanup-documentation.md)
- **PDA-based Admin Pattern** (Issue #139 / Phase 6): Admin account now derived as PDA with seeds `[b"admin", config.key()]`
  - Updated [`SupplyChainConfig`](sc-solana/programs/sc-solana/src/state/config.rs) with `admin_pda_bump` field
  - Updated [`initialize.rs`](sc-solana/programs/sc-solana/src/instructions/initialize.rs) to derive admin as PDA
  - Updated all role management instructions: [`grant.rs`](sc-solana/programs/sc-solana/src/instructions/role/grant.rs), [`revoke.rs`](sc-solana/programs/sc-solana/src/instructions/role/revoke.rs), [`holder_add.rs`](sc-solana/programs/sc-solana/src/instructions/role/holder_add.rs), [`holder_remove.rs`](sc-solana/programs/sc-solana/src/instructions/role/holder_remove.rs), [`request.rs`](sc-solana/programs/sc-solana/src/instructions/role/request.rs), [`transfer_admin.rs`](sc-solana/programs/sc-solana/src/instructions/role/transfer_admin.rs)
  - Created Solana CLI workaround script for Surfpool limitation: [`initialize-config-cli.sh`](sc-solana/runbooks/01-deployment/initialize-config-cli.sh)
  - Created comprehensive documentation: [`INITIALIZE-CONFIG-README.md`](sc-solana/runbooks/01-deployment/INITIALIZE-CONFIG-README.md), [`SURFPOLL-CI-ANALYSIS.md`](sc-solana/runbooks/SURFPOLL-CI-ANALYSIS.md)

## [0.2.0] - 2026-05-07

### Changed
- **PDA-based Admin Pattern** (Issue #139 / Phase 6): Converted admin from regular Signer to PDA for consistency with Solana/PDA patterns
  - Admin PDA seeds: `[b"admin", config.key()]`
  - Config PDA seeds: `[b"config"]`
  - Serial Hash Registry PDA seeds: `[b"serial_hashes", config.key()]`
  - All role management instructions now use admin PDA derivation
  - Surfpool/txtx workaround implemented via Solana CLI script (see `initialize-config-cli.sh`)
- **Documentation Cleanup** (Issues #132, Phase 0): Removed obsolete summary files from `runbooks/`
  - Removed `CHANGES-123-SUMMARY.md` (consolidated into CHANGELOG)
  - Removed `ISSUE-124-FIXES-SUMMARY.md` (consolidated into CHANGELOG)
  - Removed `SURFPOLL-CI-ANALYSIS.md` (external references documented)
  - Removed `PDA-CONSISTENCY-GUIDE.md` (integrated into runbooks)
  - Removed `devnet-deployment.md` (duplicated in runbooks)
  - Removed `mainnet-deployment.md` (duplicated in runbooks)
  - Removed `DEPLOYMENT-GUIDE.md` (duplicated in README)

- **Program ID Consistency** (Issue #134, Phase 2): Updated `deploy.sh` and `ROADMAP.md` to use correct Program ID
  - Old: `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS`
  - New: `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN`

- **Runbook Consistency** (Issues #123, #124, Phase 4):
  - Replaced `svm::send_token` with system program transfer in `setup-test-env.tx`
  - Replaced `input.*` with `env.*` in `transfer-admin.tx`
  - Fixed signature access in query runbooks to use `signatures | first()`
  - Verified PDA derivation consistency across all runbooks

- **Code Cleanup** (Issue #133, Phase 1):
  - Removed empty directories: `sc-solana/programs/sc-solana/src/tests/`, `sc-solana/programs/sc-solana/src/utils/`
  - Removed obsolete scripts: `sc-solana/scripts/setup-keypairs.sh`, `sc-solana/scripts/init-config/`
  - Removed dead code and `allow` directives from [`lib.rs`](sc-solana/programs/sc-solana/src/lib.rs)

- **README.md** (Issue #137, Phase 5): Updated with current status section and refactoring progress

- **ROADMAP.md** (Issue #137, Phase 5): Updated with recently resolved issues and current completion status

### Fixed
- **Program ID Consistency** (Issue #134, Phase 2): Updated `deploy.sh` and `ROADMAP.md` to use correct Program ID
  - Old: `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS`
  - New: `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN`

- **Runbook Consistency** (Issues #123, #124, Phase 4):
  - Replaced `svm::send_token` with system program transfer in `setup-test-env.tx`
  - Replaced `input.*` with `env.*` in `transfer-admin.tx`
  - Fixed signature access in query runbooks to use `signatures | first()`
  - Verified PDA derivation consistency across all runbooks

### Deprecated
- Legacy single-role fields in `SupplyChainConfig` (use multi-holder pattern) (Issue #139 / Phase 6)
  - `auditor_hw_single` → Use `auditor_hw` + `auditor_hw_count`
  - `tecnico_sw_single` → Use `tecnico_sw` + `tecnico_sw_count`

### Removed
- Obsolete scripts (Issue #133, Phase 1): `sc-solana/scripts/setup-keypairs.sh`
- Obsolete scripts (Issue #133, Phase 1): `sc-solana/scripts/init-config/`
- Empty directories (Issue #133, Phase 1): `sc-solana/programs/sc-solana/src/tests/`
- Empty directories (Issue #133, Phase 1): `sc-solana/programs/sc-solana/src/utils/`
- Dead code in `lib.rs` and removed unnecessary `allow` directives (Issue #135, Phase 3)

### Added
- SVM Functions reference table in `runbooks/README.md` (Phase 4)
- Known Issues & Solutions section in `runbooks/README.md` (Phase 4)
- Refactoring plan with detailed phases in `plans/` (Phase 5)
- CHANGELOG.md for tracking all project changes (Phase 5)

---

## Refactoring Phases Summary

| Phase | Issue | Description | Files Changed | Status |
|-------|-------|-------------|---------------|--------|
| Phase 0 | #132 | Cleanup Documentation | 7 files removed | ✅ Completed |
| Phase 1 | #133 | Clean Up Obsolete Code | 5 files/dirs removed | ✅ Completed |
| Phase 2 | #134 | Fix Program ID | 4 files updated | ✅ Completed |
| Phase 3 | #135 | Remove Dead Code | lib.rs cleaned | ✅ Completed |
| Phase 4 | #136 | Verify Consistency | 8 runbooks fixed | ✅ Completed |
| Phase 5 | #137 | Update Documentation | 3 files updated, 1 created | ✅ Completed |
| Phase 6 | #139 | PDA-based Admin Pattern | 9 Rust files, 10 runbooks | ✅ Completed |

## [0.1.0] - Previous Release

### Added
- Initial Anchor program structure
- Frontend migration to Solana
- Basic test suite
- CI/CD pipeline
- Role-based access control (RBAC)
- Netbook lifecycle management with state machine
- Batch registration support
- Query instructions for system state

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 0.2.0 | 2026-05-07 | Refactoring phases 0-5: Documentation cleanup, code cleanup, Program ID fix |
| 0.3.0 (WIP) | 2026-05-08 | Phase 6: PDA-based Admin Pattern for REBC system |
| 0.1.0 | Previous | Initial Solana migration release |
