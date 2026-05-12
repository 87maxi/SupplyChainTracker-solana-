#!/bin/bash
# Local Pipeline Simulation
# This script simulates the GitHub Actions CI/CD pipeline locally
# It runs all jobs in the correct order with proper dependencies

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project root - script is in .github/workflows/, so go up two levels
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Track results
declare -A JOB_RESULTS
FAILED_JOBS=0
PASSED_JOBS=0
SKIPPED_JOBS=0

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  LOCAL CI/CD PIPELINE SIMULATION${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "Project Root: $PROJECT_ROOT"
echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Function to mark job as passed
job_passed() {
    local job_name="$1"
    JOB_RESULTS["$job_name"]="passed"
    PASSED_JOBS=$((PASSED_JOBS + 1))
    echo -e "  ${GREEN}✓ PASSED${NC}"
}

# Function to mark job as failed
job_failed() {
    local job_name="$1"
    local reason="${2:-unknown}"
    JOB_RESULTS["$job_name"]="failed"
    FAILED_JOBS=$((FAILED_JOBS + 1))
    echo -e "  ${RED}✗ FAILED${NC} - $reason"
}

# Function to mark job as skipped
job_skipped() {
    local job_name="$1"
    local reason="${2:-unknown}"
    JOB_RESULTS["$job_name"]="skipped"
    SKIPPED_JOBS=$((SKIPPED_JOBS + 1))
    echo -e "  ${YELLOW}⊘ SKIPPED${NC} - $reason"
}

# Function to run a job
run_job() {
    local job_name="$1"
    local job_description="$2"
    local command="$3"
    
    echo -e "${BLUE}────────────────────────────────────────${NC}"
    echo -e "${BLUE}Job: $job_name${NC}"
    echo -e "${BLUE}Desc: $job_description${NC}"
    echo ""
    
    # Execute the command
    if eval "$command"; then
        job_passed "$job_name"
    else
        job_failed "$job_name" "Command failed"
    fi
    echo ""
}

# ============================================================================
# PHASE 1: Parallel Jobs (No Dependencies)
# ============================================================================
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  PHASE 1: Parallel Jobs${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Job 1: Rust Formatting & Clippy
run_job \
    "rust-lint" \
    "Rust Formatting & Clippy" \
    "cd '$PROJECT_ROOT/sc-solana' && cargo fmt --check && cargo clippy -- -D warnings"

# Job 2: Build Solana Program
run_job \
    "build-program" \
    "Build Solana Program (cargo check)" \
    "cd '$PROJECT_ROOT/sc-solana' && cargo check --all-targets"

# Job 3: TypeScript Type Checking
run_job \
    "type-check" \
    "TypeScript Type Checking" \
    "cd '$PROJECT_ROOT/web' && npx tsc --noEmit"

# Job 4: Frontend Linting
run_job \
    "frontend-lint" \
    "Frontend Linting" \
    "cd '$PROJECT_ROOT/web' && npx eslint src/ --max-warnings=0"

# Job 5: Unit Tests
run_job \
    "test-unit" \
    "Frontend Unit Tests" \
    "cd '$PROJECT_ROOT/web' && npm test -- --passWithNoTests"

# Job 6: Build Frontend
run_job \
    "build-frontend" \
    "Build Next.js Frontend" \
    "cd '$PROJECT_ROOT/web' && NODE_ENV=production NEXT_PUBLIC_CLUSTER=devnet npm run build"

echo ""

# ============================================================================
# PHASE 2: Mollusk Tests (Depends on build-program)
# ============================================================================
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  PHASE 2: Mollusk Tests${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Job 7: Mollusk Tests
run_job \
    "test-mollusk" \
    "Mollusk Tests (In-process SVM)" \
    "cd '$PROJECT_ROOT/sc-solana/programs/sc-solana' && cargo test --test mollusk-tests --quiet"

echo ""

# ============================================================================
# PHASE 3: Runbook Tests (Depends on build-program + test-mollusk)
# ============================================================================
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  PHASE 3: Runbook Tests${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Job 8: Runbook Tests
run_job \
    "test-runbooks" \
    "Runbook-Based Program Tests" \
    "cd '$PROJECT_ROOT/sc-solana' && bash runbooks/05-ci/runbook-tests.sh"

echo ""

# ============================================================================
# PHASE 4: Compute Report (Depends on test-mollusk)
# ============================================================================
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  PHASE 4: Compute Unit Report${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Job 9: Compute Unit Report
run_job \
    "compute-report" \
    "Compute Unit Measurement Tests" \
    "cd '$PROJECT_ROOT/sc-solana/programs/sc-solana' && cargo test --test compute-units -- --nocapture"

echo ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  PIPELINE SUMMARY${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

echo -e "${BLUE}Job Results:${NC}"
for job in "${!JOB_RESULTS[@]}"; do
    status="${JOB_RESULTS[$job]}"
    if [ "$status" = "passed" ]; then
        echo -e "  ${GREEN}✓ $job${NC}"
    elif [ "$status" = "failed" ]; then
        echo -e "  ${RED}✗ $job${NC}"
    else
        echo -e "  ${YELLOW}⊘ $job${NC}"
    fi
done

echo ""
echo -e "${BLUE}Statistics:${NC}"
echo -e "  Passed:   ${GREEN}$PASSED_JOBS${NC}"
echo -e "  Failed:   ${RED}$FAILED_JOBS${NC}"
echo -e "  Skipped:  ${YELLOW}$SKIPPED_JOBS${NC}"
echo ""

if [ "$FAILED_JOBS" -gt 0 ]; then
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  PIPELINE FAILED${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Failed jobs:"
    for job in "${!JOB_RESULTS[@]}"; do
        if [ "${JOB_RESULTS[$job]}" = "failed" ]; then
            echo "  - $job"
        fi
    done
    echo ""
    exit 1
else
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ALL PIPELINE JOBS PASSED${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    exit 0
fi
