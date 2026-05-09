#!/bin/bash
# Refactoring Validation Script
# Run from project root directory
# This script validates the completion of all refactoring phases (0-6)

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root - script is in scripts/, project root is one level up
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo "=============================================="
echo "  Refactoring Validation Script"
echo "  SupplyChainTracker-solana"
echo "  Date: $(date -u +%Y-%m-%d)"
echo "=============================================="
echo ""

# ============================================
# PHASE 0: Cleanup Documentation
# ============================================
echo -e "${BLUE}=== Phase 0: Cleanup Documentation (Issue #132) ===${NC}"

# Check obsolete summary files are removed
for f in sc-solana/runbooks/CHANGES-123-SUMMARY.md sc-solana/runbooks/ISSUE-124-FIXES-SUMMARY.md sc-solana/runbooks/SURFPOLL-CI-ANALYSIS.md sc-solana/runbooks/PDA-CONSISTENCY-GUIDE.md sc-solana/runbooks/devnet-deployment.md sc-solana/runbooks/mainnet-deployment.md sc-solana/runbooks/DEPLOYMENT-GUIDE.md; do
    if [ ! -f "$PROJECT_ROOT/$f" ]; then
        pass "Removed: $f"
    else
        fail "Still exists: $f"
    fi
done

# ============================================
# PHASE 1: Clean Up Obsolete Code
# ============================================
echo ""
echo -e "${BLUE}=== Phase 1: Clean Up Obsolete Code (Issue #133) ===${NC}"

# Check obsolete scripts are removed
for f in sc-solana/scripts/setup-keypairs.sh; do
    if [ ! -f "$PROJECT_ROOT/$f" ]; then
        pass "Removed: $f"
    else
        fail "Still exists: $f"
    fi
done

# Check obsolete directories are removed
for d in sc-solana/scripts/init-config sc-solana/programs/sc-solana/src/tests sc-solana/programs/sc-solana/src/utils; do
    if [ ! -d "$PROJECT_ROOT/$d" ]; then
        pass "Removed directory: $d"
    else
        fail "Still exists: $d"
    fi
done

# ============================================
# PHASE 2: Fix Program ID
# ============================================
echo ""
echo -e "${BLUE}=== Phase 2: Fix Program ID (Issue #134) ===${NC}"

CORRECT_PROGRAM_ID="7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN"
WRONG_PROGRAM_ID="CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS"

# Check deploy.sh has correct program ID
if grep -q "$CORRECT_PROGRAM_ID" "$PROJECT_ROOT/sc-solana/deploy.sh" 2>/dev/null; then
    pass "deploy.sh has correct Program ID"
else
    fail "deploy.sh has incorrect Program ID"
fi

# Check no references to wrong program ID in active files (exclude plans/, reports/, CHANGELOG.md, this script which document history)
WRONG_ID_COUNT=$(grep -r "$WRONG_PROGRAM_ID" --include="*.sh" --include="*.toml" --include="*.env" --include="*.json" --include="*.ts" --include="*.tsx" --include="*.rs" "$PROJECT_ROOT" 2>/dev/null | grep -v ".git" | grep -v "target/" | grep -v "plans/" | grep -v "reports/" | grep -v "CHANGELOG.md" | grep -v "refactoring-validation.sh" | wc -l)
if [ "$WRONG_ID_COUNT" -gt 0 ]; then
    fail "Found $WRONG_ID_COUNT references to wrong Program ID in active files"
else
    pass "No references to wrong Program ID in active files"
fi

# ============================================
# PHASE 3: Remove Dead Code
# ============================================
echo ""
echo -e "${BLUE}=== Phase 3: Remove Dead Code (Issue #135) ===${NC}"

# Check lib.rs compiles without warnings
if cargo clippy --manifest-path "$PROJECT_ROOT/sc-solana/Cargo.toml" -- -D warnings 2>&1 | tail -1 | grep -q "Finished"; then
    pass "Cargo clippy: 0 warnings"
else
    fail "Cargo clippy: warnings found"
fi

# ============================================
# PHASE 4: Verify Consistency
# ============================================
echo ""
echo -e "${BLUE}=== Phase 4: Verify Consistency (Issue #136) ===${NC}"

# Check runbooks use env.* instead of input.*
if grep -r "input\." "$PROJECT_ROOT/sc-solana/runbooks/" 2>/dev/null | grep -v ".git" | grep -q .; then
    warn "Found input.* references in runbooks (may be intentional)"
else
    pass "No input.* references in runbooks"
fi

# Check runbooks use svm::* functions correctly (exclude README.md documentation and comments)
ACTIVE_SEND_TOKEN=$(grep -r "svm::send_token" "$PROJECT_ROOT/sc-solana/runbooks/" 2>/dev/null | grep -v ".git" | grep -v "README.md" | grep -v "^.*://" | wc -l)
if [ "$ACTIVE_SEND_TOKEN" -gt 0 ]; then
    fail "Found $ACTIVE_SEND_TOKEN active svm::send_token usages (should use system program transfer)"
else
    pass "No svm::send_token references in active code"
fi

# ============================================
# PHASE 5: Update Documentation
# ============================================
echo ""
echo -e "${BLUE}=== Phase 5: Update Documentation (Issue #137) ===${NC}"

# Check CHANGELOG.md exists
if [ -f "$PROJECT_ROOT/CHANGELOG.md" ]; then
    pass "CHANGELOG.md exists"
else
    fail "CHANGELOG.md missing"
fi

# Check README.md has current status section
if grep -q "current-status\|Current Status\|Refactoring Status" "$PROJECT_ROOT/README.md" 2>/dev/null; then
    pass "README.md has status section"
else
    fail "README.md missing status section"
fi

# Check ROADMAP.md has refactoring phases
if grep -q "Phase 0\|Phase 1\|Phase 2\|refactoring" "$PROJECT_ROOT/ROADMAP.md" 2>/dev/null; then
    pass "ROADMAP.md has refactoring phases"
else
    fail "ROADMAP.md missing refactoring phases"
fi

# ============================================
# PHASE 6: PDA-based Admin Pattern
# ============================================
echo ""
echo -e "${BLUE}=== Phase 6: PDA-based Admin Pattern (Issue #139) ===${NC}"

# Check config.rs has admin_pda_bump
if grep -q "admin_pda_bump" "$PROJECT_ROOT/sc-solana/programs/sc-solana/src/state/config.rs" 2>/dev/null; then
    pass "config.rs has admin_pda_bump field"
else
    fail "config.rs missing admin_pda_bump field"
fi

# Check initialize.rs uses PDA for admin
if grep -q 'seeds = \[b"admin"' "$PROJECT_ROOT/sc-solana/programs/sc-solana/src/instructions/initialize.rs" 2>/dev/null; then
    pass "initialize.rs derives admin as PDA"
else
    fail "initialize.rs does not derive admin as PDA"
fi

# Check role instructions use admin PDA
for f in grant.rs revoke.rs holder_add.rs holder_remove.rs request.rs transfer_admin.rs; do
    path="$PROJECT_ROOT/sc-solana/programs/sc-solana/src/instructions/role/$f"
    if [ -f "$path" ]; then
        if grep -q 'seeds = \[b"admin"' "$path" 2>/dev/null || grep -q "config.key()" "$path" 2>/dev/null; then
            pass "role/$f uses PDA pattern"
        else
            warn "role/$f may not use PDA pattern"
        fi
    fi
done

# Check PDA-first deployer exists (replaces initialize-config-cli.sh workaround)
if [ -f "$PROJECT_ROOT/sc-solana/programs/sc-solana/src/instructions/deployer.rs" ]; then
    pass "PDA-first deployer.rs exists (replaces CLI workaround)"
else
    fail "deployer.rs missing - PDA-first migration incomplete"
fi

# Ensure obsolete CLI workaround is removed
if [ ! -f "$PROJECT_ROOT/sc-solana/runbooks/01-deployment/initialize-config-cli.sh" ]; then
    pass "initialize-config-cli.sh removed (no longer needed with PDA-first)"
else
    warn "initialize-config-cli.sh still exists (should be removed)"
fi

# ============================================
# FILE INTEGRITY CHECKS
# ============================================
echo ""
echo -e "${BLUE}=== File Integrity Checks ===${NC}"

# Check LICENSE file exists (fixes broken link)
if [ -f "$PROJECT_ROOT/LICENSE" ]; then
    pass "LICENSE file exists"
else
    fail "LICENSE file missing (causes broken link in README.md)"
fi

# Check plans directory exists
if [ -d "$PROJECT_ROOT/plans" ]; then
    pass "plans/ directory exists"
else
    fail "plans/ directory missing"
fi

# Check reports directory exists
if [ -d "$PROJECT_ROOT/reports" ]; then
    pass "reports/ directory exists"
else
    fail "reports/ directory missing"
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "=============================================="
echo "  Validation Summary"
echo "=============================================="
echo -e "Total Checks: ${BLUE}$TOTAL_CHECKS${NC}"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
    echo ""
    echo "Refactoring Phases 0-6 are complete."
    exit 0
else
    echo -e "${RED}✗ $FAILED_CHECKS CHECKS FAILED${NC}"
    echo ""
    echo "Please fix the failed checks above."
    exit 1
fi
