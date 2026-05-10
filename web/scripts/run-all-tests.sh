#!/bin/bash
set -e

echo "=========================================="
echo "Running All Tests"
echo "=========================================="

# Run unit tests first
echo ""
echo "Phase 1: Unit Tests"
echo "=========================================="
npm run test:unit

# Run E2E tests
echo ""
echo "Phase 2: E2E Tests"
echo "=========================================="
npm run test:e2e

echo "=========================================="
echo "All Tests Complete"
echo "=========================================="
