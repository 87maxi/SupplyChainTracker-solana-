#!/bin/bash
set -e

echo "=========================================="
echo "Running E2E Tests"
echo "=========================================="

# Check if Playwright browsers are installed
if ! npx playwright --version > /dev/null 2>&1; then
  echo "Playwright not installed. Running install..."
  npx playwright install
fi

# Run tests
npx playwright test "$@"

echo "=========================================="
echo "E2E Tests Complete"
echo "=========================================="
