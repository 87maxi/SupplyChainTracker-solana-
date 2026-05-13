#!/bin/bash
# Start local validator using solana-test-validator
# This script is designed for CI/CD and local development

set -e

LEDGER_DIR="${1:-.anchor/e2e-ledger}"
RPC_PORT="${2:-8899}"
# WebSocket port is automatically RPC_PORT + 1 in solana-test-validator
WS_PORT=$((RPC_PORT + 1))
PROGRAM_PATH="${4:-sc-solana/target/deploy/sc_solana.so}"
PROGRAM_ID="${5:-$(grep 'sc_solana =' sc-solana/Anchor.toml | cut -d'"' -f2)}"

echo "🚀 Starting local validator..."
echo "   Ledger: $LEDGER_DIR"
echo "   RPC Port: $RPC_PORT"
echo "   WS Port: $WS_PORT"
echo "   Program: $PROGRAM_ID"

# Clean up existing ledger (only if it exists)
if [ -d "$LEDGER_DIR" ]; then
    rm -rf "$LEDGER_DIR"
fi

# Create ledger directory if it doesn't exist
mkdir -p "$LEDGER_DIR"

# Build program if .so file doesn't exist
if [ ! -f "$PROGRAM_PATH" ]; then
    echo "📦 Building program..."
    cd sc-solana
    anchor build
    cd ..
fi

# Start solana-test-validator with faucet for airdrops
# Note: solana-test-validator v3.1.13 does NOT support --ws-port flag
# WebSocket port is automatically calculated as RPC_PORT + 1
FAUCET_PORT="${3:-9900}"
echo "⚙️  Starting solana-test-validator..."
echo "   Faucet Port: $FAUCET_PORT"
solana-test-validator \
    --ledger "$LEDGER_DIR" \
    --rpc-port "$RPC_PORT" \
    --faucet-port "$FAUCET_PORT" \
    --bpf-program "$PROGRAM_ID" "$PROGRAM_PATH" \
    --reset \
    --compute-unit-limit 600000 \
    > /tmp/validator.log 2>&1 &

VALIDATOR_PID=$!

# Wait a moment for the ledger directory to be created by the validator
sleep 2

# Save PID for cleanup
mkdir -p "$LEDGER_DIR"
echo "$VALIDATOR_PID" > "$LEDGER_DIR/.validator-pid"

# Wait for validator to start
echo "⏳ Waiting for validator to start..."
for i in {1..30}; do
    if curl -s -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
        "http://localhost:$RPC_PORT" | grep -q "ok"; then
        echo "✅ Validator is running!"
        echo "   RPC: http://localhost:$RPC_PORT"
        echo "   WS: ws://localhost:$WS_PORT"
        echo "   PID: $VALIDATOR_PID"
        
        # Log validator info
        echo "📋 Validator Info:"
        curl -s -X POST -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}' \
            "http://localhost:$RPC_PORT" | jq -r '.result.solana-core' 2>/dev/null || echo "unknown"
        
        exit 0
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

echo "❌ Validator failed to start"
echo "📋 Validator logs:"
cat /tmp/validator.log 2>/dev/null || echo "No logs available"
kill $VALIDATOR_PID 2>/dev/null || true
exit 1
