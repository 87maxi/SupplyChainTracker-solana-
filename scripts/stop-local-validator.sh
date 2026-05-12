#!/bin/bash
# Stop local validator and clean up resources

set -e

LEDGER_DIR="${1:-.anchor/e2e-ledger}"

echo "🛑 Stopping local validator..."

# Kill validator process if PID file exists
if [ -f "$LEDGER_DIR/.validator-pid" ]; then
    PID=$(cat "$LEDGER_DIR/.validator-pid")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "✅ Validator stopped (PID: $PID)"
    else
        echo "⚠️  Validator process not found"
    fi
else
    echo "⚠️  No PID file found"
fi

# Also kill any remaining processes on port 8899
fuser -k 8899/tcp 2>/dev/null || true
fuser -k 8900/tcp 2>/dev/null || true

echo "✅ Cleanup complete"
