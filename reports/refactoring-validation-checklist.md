# Refactoring Validation Checklist

## Document de Validación - Phases 0-5

**Fecha:** 2026-05-08  
**Project:** SupplyChainTracker-solana  
**Status:** Pending Validation

---

## 1. Executive Summary

Este documento detalla la secuencia completa de comprobaciones necesarias para validar que la refactorización de Phases 0-5 se realizó correctamente y que el proyecto está en estado consistente para consolidar los cambios.

### Phases de Refactoring Completados

| Phase | Issue | Description | Status |
|-------|-------|-------------|--------|
| Phase 0 | #132 | Cleanup Documentation | ✅ Completed |
| Phase 1 | #133 | Clean Up Obsolete Code and Scripts | ✅ Completed |
| Phase 2 | #134 | Fix Program ID Inconsistency | ✅ Completed |
| Phase 3 | #135 | Remove Dead Code and Allow Directives | ✅ Completed |
| Phase 4 | #136 | Verify Consistency with Surfpool/txtx IAC | ✅ Completed |
| Phase 5 | #137 | Update Documentation and Create CHANGELOG | ✅ Completed |

---

## 2. Validation Sequence

### Phase 1: File System Validation

#### 1.1. Verify Removed Files

| # | File/Directory | Expected | Verification Command | Status |
|---|----------------|----------|---------------------|--------|
| 1 | `runbooks/CHANGES-123-SUMMARY.md` | DELETED | `test -f runbooks/CHANGES-123-SUMMARY.md && echo "EXISTS" || echo "REMOVED"` | ⬜ |
| 2 | `runbooks/ISSUE-124-FIXES-SUMMARY.md` | DELETED | `test -f runbooks/ISSUE-124-FIXES-SUMMARY.md && echo "EXISTS" || echo "REMOVED"` | ⬜ |
| 3 | `runbooks/SURFPOLL-CI-ANALYSIS.md` | DELETED | `test -f runbooks/SURFPOLL-CI-ANALYSIS.md && echo "EXISTS" || echo "REMOVED"` | ⬜ |
| 4 | `runbooks/PDA-CONSISTENCY-GUIDE.md` | DELETED | `test -f runbooks/PDA-CONSISTENCY-GUIDE.md && echo "EXISTS" || echo "REMOVED"` | ⬜ |
| 5 | `runbooks/devnet-deployment.md` | DELETED | `test -f runbooks/devnet-deployment.md && echo "EXISTS" || echo "REMOVED"` | ⬜ |
| 6 | `runbooks/mainnet-deployment.md` | DELETED | `test -f runbooks/mainnet-deployment.md && echo "EXISTS" || echo "REMOVED"` | ⬜ |
| 7 | `runbooks/DEPLOYMENT-GUIDE.md` | DELETED | `test -f runbooks/DEPLOYMENT-GUIDE.md && echo "EXISTS" || echo "REMOVED"` | ⬜ |
| 8 | `sc-solana/scripts/setup-keypairs.sh` | DELETED | `test -f sc-solana/scripts/setup-keypairs.sh && echo "EXISTS" || echo "REMOVED"` | ⬜ |
| 9 | `sc-solana/scripts/init-config/` | DELETED | `test -d sc-solana/scripts/init-config && echo "EXISTS" || echo "REMOVED"` | ⬜ |
| 10 | `sc-solana/programs/sc-solana/src/tests/` | DELETED | `test -d sc-solana/programs/sc-solana/src/tests && echo "EXISTS" || echo "REMOVED"` | ⬜ |
| 11 | `sc-solana/programs/sc-solana/src/utils/` | DELETED | `test -d sc-solana/programs/sc-solana/src/utils && echo "EXISTS" || echo "REMOVED"` | ⬜ |

#### 1.2. Verify Created Files

| # | File/Directory | Expected | Verification Command | Status |
|---|----------------|----------|---------------------|--------|
| 1 | `CHANGELOG.md` | EXISTS | `test -f CHANGELOG.md && echo "EXISTS" || echo "MISSING"` | ⬜ |
| 2 | `plans/issues/phase-0-cleanup-documentation.md` | EXISTS | `test -f plans/issues/phase-0-cleanup-documentation.md && echo "EXISTS" || echo "MISSING"` | ⬜ |

#### 1.3. Verify File Content - CHANGELOG.md

| # | Check | Expected Content | Status |
|---|-------|-----------------|--------|
| 1 | Keep a Changelog format | Contains "The format is based on [Keep a Changelog]" | ⬜ |
| 2 | Semantic Versioning | Contains "adheres to [Semantic Versioning]" | ⬜ |
| 3 | Version 0.2.0 | Contains `## [0.2.0] - 2026-05-07` | ⬜ |
| 4 | Unreleased section | Contains `## [Unreleased]` | ⬜ |
| 5 | Changed section | Contains `### Changed` | ⬜ |
| 6 | Fixed section | Contains `### Fixed` | ⬜ |
| 7 | Deprecated section | Contains `### Deprecated` | ⬜ |
| 8 | Removed section | Contains `### Removed` | ⬜ |
| 9 | Added section | Contains `### Added` | ⬜ |
| 10 | Program ID mentioned | Contains `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` | ⬜ |

---

### Phase 2: Program ID Consistency Validation

#### 2.1. Correct Program ID

```
CORRECT_PROGRAM_ID=7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN
```

#### 2.2. Verify Program ID in All Files

| # | File | Location | Expected | Status |
|---|------|----------|----------|--------|
| 1 | `README.md` | Line ~29 | `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` | ⬜ |
| 2 | `ROADMAP.md` | Line ~9 | `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` | ⬜ |
| 3 | `sc-solana/README.md` | Line ~7 | `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` | ⬜ |
| 4 | `web/.env.local` | Line ~6 | `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` | ⬜ |
| 5 | `sc-solana/deploy.sh` | PROGRAM_ID variable | `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` | ⬜ |
| 6 | `sc-solana/config/config.env` | PROGRAM_ID variable | `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` | ⬜ |
| 7 | `sc-solana/programs/sc-solana/src/lib.rs` | `declare_id!` | `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` | ⬜ |

#### 2.3. Verify NO Incorrect Program IDs

| # | File | Old Program ID to Verify NOT Present | Status |
|---|------|-------------------------------------|--------|
| 1 | `README.md` | `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS` | ⬜ |
| 2 | `ROADMAP.md` | `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS` | ⬜ |
| 3 | `sc-solana/deploy.sh` | `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS` | ⬜ |
| 4 | `web/.env.local` | `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS` | ⬜ |

#### 2.4. Verification Commands

```bash
# Check for correct program ID in all files
grep -r "7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN" --include="*.md" --include="*.sh" --include="*.env" --include="*.rs" --include="*.json" --include="*.ts" --include="*.tsx" .

# Check for incorrect program ID (should return nothing)
grep -r "CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS" --include="*.md" --include="*.sh" --include="*.env" --include="*.rs" --include="*.json" --include="*.ts" --include="*.tsx" .
```

---

### Phase 3: Smart Contract Build Validation

#### 3.1. Build Program

```bash
cd sc-solana
cargo build-bpf
```

**Expected Result:** Build completes without errors

| Check | Expected | Status |
|-------|----------|--------|
| Compilation success | No errors | ⬜ |
| No warnings (ideal) | Minimal warnings | ⬜ |
| BPF binary generated | `target/deploy/sc_solana.so` exists | ⬜ |

#### 3.2. Verify Generated Files

| # | File | Expected | Verification | Status |
|---|------|----------|-------------|--------|
| 1 | `sc-solana/target/deploy/sc_solana.so` | EXISTS | `test -f target/deploy/sc_solana.so` | ⬜ |
| 2 | `sc-solana/target/idl/sc_solana.json` | EXISTS | `test -f target/idl/sc_solana.json` | ⬜ |
| 3 | `sc-solana/target/types/sc_solana.ts` | EXISTS | `test -f target/types/sc_solana.ts` | ⬜ |

---

### Phase 4: Test Suite Validation

#### 4.1. Run All Tests

```bash
cd sc-solana
anchor test
```

**Expected Result:** All tests pass

| Test File | Expected | Status |
|-----------|----------|--------|
| `lifecycle.ts` | All tests pass | ⬜ |
| `batch-registration.ts` | All tests pass | ⬜ |
| `role-management.ts` | All tests pass | ⬜ |
| `query-instructions.ts` | All tests pass | ⬜ |
| `pda-derivation.ts` | All tests pass | ⬜ |
| `role-enforcement.ts` | All tests pass | ⬜ |
| `state-machine.ts` | All tests pass | ⬜ |
| `overflow-protection.ts` | All tests pass | ⬜ |
| `integration-full-lifecycle.ts` | All tests pass | ⬜ |

#### 4.2. Test Summary Report

```bash
# After running anchor test, capture summary
echo "Total tests: X"
echo "Passed: Y"
echo "Failed: Z"
```

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Total tests | >100 | _to fill_ | ⬜ |
| Passed | 100% | _to fill_ | ⬜ |
| Failed | 0 | _to fill_ | ⬜ |

---

### Phase 5: Runbook Consistency Validation

#### 5.1. Verify SVM Function Usage

| # | Runbook | Check | Expected | Status |
|---|---------|-------|----------|--------|
| 1 | `04-testing/setup-test-env.tx` | Uses system program transfer | NO `svm::send_token` | ⬜ |
| 2 | `03-role-management/transfer-admin.tx` | Uses env variables | NO `input.*` | ⬜ |
| 3 | `02-operations/query/query-config.tx` | Signature handling | Uses `first()` | ⬜ |
| 4 | `02-operations/query/query-role.tx` | Signature handling | Uses `first()` | ⬜ |

#### 5.2. Verify PDA Derivation Consistency

| # | Runbook | Account Type | Expected Seeds | Status |
|---|---------|--------------|----------------|--------|
| 1 | `01-deployment/initialize-config.tx` | Config | `["config"]` | ⬜ |
| 2 | `02-operations/netbook/register-netbook.tx` | Netbook | `["netbook", ...]` | ⬜ |
| 3 | `03-role-management/add-role-holder.tx` | RoleHolder | `["role_holder", ...]` | ⬜ |
| 4 | `03-role-management/approve-role-request.tx` | RoleRequest | `["role_request", ...]` | ⬜ |

#### 5.3. Runbook Template Verification

| # | Template | Exists | Valid | Status |
|---|----------|--------|-------|--------|
| 1 | `_templates/common.tx` | EXISTS | SYNTAX OK | ⬜ |
| 2 | `_templates/pda-derivation.tx` | EXISTS | SYNTAX OK | ⬜ |
| 3 | `_templates/env-vars.tx` | EXISTS | SYNTAX OK | ⬜ |
| 4 | `_templates/standard-runbook.tx` | EXISTS | SYNTAX OK | ⬜ |

---

### Phase 6: Documentation Consistency Validation

#### 6.1. README.md Validation

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | Program ID correct | `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` | ⬜ |
| 2 | Current Status section exists | Present | ⬜ |
| 3 | Refactoring Status section exists | Present | ⬜ |
| 4 | Changelog section exists | Present | ⬜ |
| 5 | Table of Contents updated | Includes new sections | ⬜ |
| 6 | Environment variables correct | Program ID example correct | ⬜ |
| 7 | All internal links valid | No broken links | ⬜ |

#### 6.2. ROADMAP.md Validation

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | Program ID correct | `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` | ⬜ |
| 2 | Status date updated | 2026-05-07 or later | ⬜ |
| 3 | Refactoring Phases section exists | Present | ⬜ |
| 4 | Issues #132-#137 marked as completed | Status = ✅ Completed | ⬜ |
| 5 | Documentation completion updated | 85% or higher | ⬜ |

#### 6.3. runbooks/README.md Validation

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | SVM Functions Reference present | Table with functions | ⬜ |
| 2 | Known Issues section present | Solutions documented | ⬜ |
| 3 | Recent Changes table present | Issue #124 fixes documented | ⬜ |
| 4 | Program ID correct | `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` | ⬜ |

#### 6.4. Link Validation

```bash
# Check for broken markdown links (requires markdown-link-check)
markdown-link-check README.md
markdown-link-check ROADMAP.md
markdown-link-check CHANGELOG.md
markdown-link-check sc-solana/README.md
markdown-link-check sc-solana/runbooks/README.md
```

| File | Expected | Status |
|------|----------|--------|
| `README.md` | 0 broken links | ⬜ |
| `ROADMAP.md` | 0 broken links | ⬜ |
| `CHANGELOG.md` | 0 broken links | ⬜ |
| `sc-solana/README.md` | 0 broken links | ⬜ |
| `sc-solana/runbooks/README.md` | 0 broken links | ⬜ |

---

### Phase 7: Code Quality Validation

#### 7.1. Clippy Checks

```bash
cd sc-solana
cargo clippy -- -D warnings
```

**Expected Result:** No clippy warnings

| Check | Expected | Status |
|-------|----------|--------|
| Clippy passes | No warnings | ⬜ |
| No dead code warnings | Clean output | ⬜ |

#### 7.2. Verify No Allow Directives (Unnecessary)

```bash
# Check for allow directives in lib.rs
grep -n "#\[allow" sc-solana/programs/sc-solana/src/lib.rs
```

**Expected Result:** No unnecessary `allow` directives

| Check | Expected | Status |
|-------|----------|--------|
| `dead_code` allow | Removed or justified | ⬜ |
| `unused_variables` allow | Removed or justified | ⬜ |
| `unused_mut` allow | Removed or justified | ⬜ |

---

### Phase 8: Environment Configuration Validation

#### 8.1. Environment Files

| # | File | Check | Expected | Status |
|---|------|-------|----------|--------|
| 1 | `sc-solana/config/config.env` | PROGRAM_ID correct | `7xX49ydi...` | ⬜ |
| 2 | `sc-solana/runbooks/environments/localnet.env` | Exists | Present | ⬜ |
| 3 | `sc-solana/runbooks/environments/devnet.env` | Exists | Present | ⬜ |
| 4 | `sc-solana/runbooks/environments/mainnet.env` | Exists | Present | ⬜ |
| 5 | `web/.env.local` | PROGRAM_ID correct | `7xX49ydi...` | ⬜ |
| 6 | `web/EXAMPLE.env` | PROGRAM_ID correct | `7xX49ydi...` | ⬜ |

#### 8.2. Key Pair Files

| # | File | Expected | Verification | Status |
|---|------|----------|-------------|--------|
| 1 | `config/keypairs/admin_new.json` | EXISTS | Valid keypair | ⬜ |
| 2 | `config/keypairs/fabricante.json` | EXISTS | Valid keypair | ⬜ |
| 3 | `config/keypairs/auditor_hw.json` | EXISTS | Valid keypair | ⬜ |
| 4 | `config/keypairs/tecnico_sw.json` | EXISTS | Valid keypair | ⬜ |
| 5 | `config/keypairs/escuela.json` | EXISTS | Valid keypair | ⬜ |

---

### Phase 9: Integration Validation

#### 9.1. Full Lifecycle Test

```bash
# Run the full lifecycle integration test
cd sc-solana
anchor test -- --grep "full-lifecycle"
```

**Expected Result:** Full lifecycle completes successfully

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Initialize Config | Config account created | ⬜ |
| 2 | Grant Roles | All roles granted | ⬜ |
| 3 | Register Netbook | Netbook in Fabricada state | ⬜ |
| 4 | Audit Hardware | Netbook in HwAprobado state | ⬜ |
| 5 | Validate Software | Netbook in SwValidado state | ⬜ |
| 6 | Assign to Student | Netbook in Distribuida state | ⬜ |

#### 9.2. Role Management Test

```bash
# Run role management tests
cd sc-solana
anchor test -- --grep "role-management"
```

**Expected Result:** All role management operations work correctly

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Request Role | RoleRequest created | ⬜ |
| 2 | Approve Request | Role granted automatically | ⬜ |
| 3 | Reject Request | Request marked as rejected | ⬜ |
| 4 | Add Role Holder | Holder added to config | ⬜ |
| 5 | Remove Role Holder | Holder removed from config | ⬜ |

---

### Phase 10: Final Verification

#### 10.1. Git Status

```bash
git status
git diff --stat
```

**Expected Result:** All changes committed

| Check | Expected | Status |
|-------|----------|--------|
| Working tree clean | No uncommitted changes | ⬜ |
| All files tracked | No untracked relevant files | ⬜ |

#### 10.2. CHANGELOG Consistency

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | All phases documented | Phases 0-5 in CHANGELOG | ⬜ |
| 2 | Date consistency | All dates match | ⬜ |
| 3 | Version numbering | Semantic versioning followed | ⬜ |

#### 10.3. Cross-Reference Validation

| # | Reference | Source | Target | Status |
|---|-----------|--------|--------|--------|
| 1 | CHANGELOG link | README.md | CHANGELOG.md | ⬜ |
| 2 | Refactoring plan link | ROADMAP.md | plans/refactoring-plan.md | ⬜ |
| 3 | Issue links | ROADMAP.md | GitHub issues #132-#137 | ⬜ |
| 4 | Test docs link | sc-solana/README.md | tests/README.md | ⬜ |

---

## 3. Validation Summary Template

### Summary Report

| Phase | Checks | Passed | Failed | Status |
|-------|--------|--------|--------|--------|
| Phase 1: File System | 13 | _to fill_ | _to fill_ | ⬜ |
| Phase 2: Program ID | 13 | _to fill_ | _to fill_ | ⬜ |
| Phase 3: Build | 4 | _to fill_ | _to fill_ | ⬜ |
| Phase 4: Tests | 10 | _to fill_ | _to fill_ | ⬜ |
| Phase 5: Runbooks | 11 | _to fill_ | _to fill_ | ⬜ |
| Phase 6: Documentation | 12 | _to fill_ | _to fill_ | ⬜ |
| Phase 7: Code Quality | 5 | _to fill_ | _to fill_ | ⬜ |
| Phase 8: Environment | 11 | _to fill_ | _to fill_ | ⬜ |
| Phase 9: Integration | 12 | _to fill_ | _to fill_ | ⬜ |
| Phase 10: Final | 6 | _to fill_ | _to fill_ | ⬜ |
| **TOTAL** | **97** | _to fill_ | _to fill_ | **⬜** |

### Validation Sign-off

| Role | Name | Date | Signature | Status |
|------|------|------|-----------|--------|
| Developer | _to fill_ | _to fill_ | _to fill_ | ⬜ |
| Reviewer | _to fill_ | _to fill_ | _to fill_ | ⬜ |
| QA | _to fill_ | _to fill_ | _to fill_ | ⬜ |

---

## 4. Automated Validation Script

### Run All Automated Checks

```bash
#!/bin/bash
# refactoring-validation.sh
# Run from project root directory

set -e

echo "=========================================="
echo "Refactoring Validation Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
TOTAL=0

check_file() {
    local file=$1
    local should_exist=$2
    local description=$3
    
    TOTAL=$((TOTAL + 1))
    
    if [ "$should_exist" = "exists" ]; then
        if [ -f "$file" ] || [ -d "$file" ]; then
            echo -e "${GREEN}✓${NC} $description"
            PASS=$((PASS + 1))
        else
            echo -e "${RED}✗${NC} $description - FILE MISSING"
            FAIL=$((FAIL + 1))
        fi
    elif [ "$should_exist" = "missing" ]; then
        if [ ! -f "$file" ] && [ ! -d "$file" ]; then
            echo -e "${GREEN}✓${NC} $description"
            PASS=$((PASS + 1))
        else
            echo -e "${RED}✗${NC} $description - FILE SHOULD BE REMOVED"
            FAIL=$((FAIL + 1))
        fi
    fi
}

echo "Phase 1: File System Validation"
echo "-------------------------------------------"
check_file "runbooks/CHANGES-123-SUMMARY.md" "missing" "CHANGES-123-SUMMARY.md removed"
check_file "runbooks/ISSUE-124-FIXES-SUMMARY.md" "missing" "ISSUE-124-FIXES-SUMMARY.md removed"
check_file "runbooks/SURFPOLL-CI-ANALYSIS.md" "missing" "SURFPOLL-CI-ANALYSIS.md removed"
check_file "runbooks/PDA-CONSISTENCY-GUIDE.md" "missing" "PDA-CONSISTENCY-GUIDE.md removed"
check_file "runbooks/devnet-deployment.md" "missing" "devnet-deployment.md removed"
check_file "runbooks/mainnet-deployment.md" "missing" "mainnet-deployment.md removed"
check_file "runbooks/DEPLOYMENT-GUIDE.md" "missing" "DEPLOYMENT-GUIDE.md removed"
check_file "sc-solana/scripts/setup-keypairs.sh" "missing" "setup-keypairs.sh removed"
check_file "sc-solana/scripts/init-config" "missing" "init-config/ directory removed"
check_file "sc-solana/programs/sc-solana/src/tests" "missing" "src/tests/ directory removed"
check_file "sc-solana/programs/sc-solana/src/utils" "missing" "src/utils/ directory removed"
check_file "CHANGELOG.md" "exists" "CHANGELOG.md created"
check_file "plans/issues/phase-0-cleanup-documentation.md" "exists" "phase-0-cleanup-documentation.md exists"

echo ""
echo "Phase 2: Program ID Validation"
echo "-------------------------------------------"
CORRECT_ID="7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN"
WRONG_ID="CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS"

if grep -q "$CORRECT_ID" README.md; then
    echo -e "${GREEN}✓${NC} Correct Program ID in README.md"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗${NC} Correct Program ID MISSING in README.md"
    FAIL=$((FAIL + 1))
fi
TOTAL=$((TOTAL + 1))

if grep -q "$WRONG_ID" README.md; then
    echo -e "${RED}✗${NC} Wrong Program ID STILL in README.md"
    FAIL=$((FAIL + 1))
else
    echo -e "${GREEN}✓${NC} Wrong Program ID removed from README.md"
    PASS=$((PASS + 1))
fi
TOTAL=$((TOTAL + 1))

# Repeat for other critical files...

echo ""
echo "Phase 3: Build Validation"
echo "-------------------------------------------"
cd sc-solana
if cargo build-bpf 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Program builds successfully"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗${NC} Program build FAILED"
    FAIL=$((FAIL + 1))
fi
TOTAL=$((TOTAL + 1))

if [ -f "target/deploy/sc_solana.so" ]; then
    echo -e "${GREEN}✓${NC} BPF binary generated"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗${NC} BPF binary NOT generated"
    FAIL=$((FAIL + 1))
fi
TOTAL=$((TOTAL + 1))
cd ..

echo ""
echo "=========================================="
echo "Validation Summary"
echo "=========================================="
echo -e "Total checks: $TOTAL"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}ALL VALIDATIONS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}VALIDATION FAILED - $FAIL checks need attention${NC}"
    exit 1
fi
```

---

## 5. Rollback Plan

### If Validation Fails

| Scenario | Action |
|----------|--------|
| Build fails | Revert to last known good commit, investigate errors |
| Tests fail | Identify failing tests, compare with pre-refactor baseline |
| Program ID inconsistency | Manual search/replace for incorrect IDs |
| Missing files | Restore from git history if accidentally deleted |
| Documentation errors | Update documentation to match actual state |

### Rollback Commands

```bash
# Identify last good commit before refactoring
git log --oneline --all | grep -i "refactor\|phase"

# Create backup branch before validation
git branch refactoring-backup

# Rollback to specific commit if needed
git revert --no-commit <commit-hash>
```

---

## 6. References

- **Refactoring Plan:** [`plans/refactoring-plan.md`](plans/refactoring-plan.md)
- **Issue #132 (Phase 0):** [Cleanup Documentation](https://github.com/87maxi/SupplyChainTracker-solana-/issues/132)
- **Issue #133 (Phase 1):** [Clean Up Obsolete Code](https://github.com/87maxi/SupplyChainTracker-solana-/issues/133)
- **Issue #134 (Phase 2):** [Fix Program ID](https://github.com/87maxi/SupplyChainTracker-solana-/issues/134)
- **Issue #135 (Phase 3):** [Remove Dead Code](https://github.com/87maxi/SupplyChainTracker-solana-/issues/135)
- **Issue #136 (Phase 4):** [Verify Consistency](https://github.com/87maxi/SupplyChainTracker-solana-/issues/136)
- **Issue #137 (Phase 5):** [Update Documentation](https://github.com/87maxi/SupplyChainTracker-solana-/issues/137)

---

*Este documento debe completarse manualmente después de cada validación automática.*
*Todos los checks deben pasar antes de consolidar la refactorización.*
