#!/bin/bash
set -e

echo "=========================================="
echo "Running Unit Tests"
echo "=========================================="

# Run Jest tests
npm run test:unit "$@"

echo "=========================================="
echo "Unit Tests Complete"
echo "=========================================="
