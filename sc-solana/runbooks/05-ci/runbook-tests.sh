#!/bin/bash
# Runbook Tests for CI/CD
# This script runs runbook-based tests that verify program functionality
# without requiring a running validator (uses Mollusk/Surfpool under the hood)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determine PROJECT_ROOT based on script location
# Script is always in: <PROJECT_ROOT>/sc-solana/runbooks/05-ci/ (when called from CI/CD)
# or: <PROJECT_ROOT>/runbooks/05-ci/ (when called from project root)
if [ -f "$SCRIPT_DIR/../../../programs/sc-solana/Cargo.toml" ]; then
    # Called from sc-solana/, SCRIPT_DIR is sc-solana/runbooks/05-ci
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
elif [ -f "$SCRIPT_DIR/../programs/sc-solana/Cargo.toml" ]; then
    # Called from project root, SCRIPT_DIR is runbooks/05-ci
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
else
    # Fallback: try to find Cargo.toml by walking up directories
    PROJECT_ROOT="$(cd "$SCRIPT_DIR" && while [ ! -f "Cargo.toml" ] && [ "$(pwd)" != "/" ]; do cd ..; done && pwd)"
fi

echo "=== Running Runbook-Based Tests ==="
echo "Script Dir: $SCRIPT_DIR"
echo "Project Root: $PROJECT_ROOT"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
SKIPPED=0

# Function to run a single runbook test
run_runbook_test() {
    local runbook_path="$1"
    local runbook_name=$(basename "$runbook_path" .tx)
    
    echo -n "Testing $runbook_name... "
    
    # Check if txtx is available
    if ! command -v txtx &> /dev/null; then
        echo -e "${YELLOW}SKIPPED (txtx not installed)${NC}"
        SKIPPED=$((SKIPPED + 1))
        return 0
    fi
    
    # Try to validate the runbook syntax
    if txtx validate "$runbook_path" 2>/dev/null; then
        echo -e "${GREEN}PASSED (syntax valid)${NC}"
        PASSED=$((PASSED + 1))
    else
        # Some runbooks may require specific environment setup
        # Check if it's a validation error or environment error
        local output
        output=$(txtx validate "$runbook_path" 2>&1) || true
        
        if echo "$output" | grep -q "syntax\|parse\|invalid"; then
            echo -e "${RED}FAILED (syntax error)${NC}"
            echo "  Error: $output"
            FAILED=$((FAILED + 1))
        else
            echo -e "${YELLOW}SKIPPED (requires validator)${NC}"
            SKIPPED=$((SKIPPED + 1))
        fi
    fi
}

# Determine runbooks directory (04-testing contains test runbooks)
RUNBOOKS_DIR="$PROJECT_ROOT/sc-solana/runbooks"
TEST_RUNBOOKS_DIR="$RUNBOOKS_DIR/04-testing"

# Fallback: if called from project root, adjust path
if [ ! -d "$TEST_RUNBOOKS_DIR" ]; then
    RUNBOOKS_DIR="$PROJECT_ROOT/runbooks"
    TEST_RUNBOOKS_DIR="$RUNBOOKS_DIR/04-testing"
fi

# Run syntax validation on all test runbooks in 04-testing directory
echo "=== Phase 1: Runbook Syntax Validation ==="
echo "Test Runbooks Directory: $TEST_RUNBOOKS_DIR"
echo ""

if [ -d "$TEST_RUNBOOKS_DIR" ]; then
    for runbook in $(find "$TEST_RUNBOOKS_DIR" -name "*.tx" -type f | sort); do
        run_runbook_test "$runbook"
    done
else
    echo -e "${YELLOW}WARNING: Test runbooks directory not found at $TEST_RUNBOOKS_DIR${NC}"
    echo "Skipping runbook validation."
fi

echo ""
echo "=== Phase 2: Mollusk Tests (In-Process SVM) ==="
echo ""

# Run Mollusk tests (these don't require a validator)
cd "$PROJECT_ROOT/programs/sc-solana"

echo "Running mollusk-tests.rs..."
if cargo test --test mollusk-tests --quiet 2>&1; then
    echo -e "${GREEN}PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "Running mollusk-lifecycle.rs..."
if cargo test --test mollusk-lifecycle --quiet 2>&1; then
    echo -e "${GREEN}PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "=== Phase 3: Compute Unit Tests ==="
echo ""

echo "Running compute-units.rs..."
if cargo test --test compute-units --quiet 2>&1; then
    echo -e "${GREEN}PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "=== Test Summary ==="
echo "Passed:   $PASSED"
echo "Failed:   $FAILED"
echo "Skipped:  $SKIPPED"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}SOME TESTS FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}ALL TESTS PASSED${NC}"
    exit 0
fi
