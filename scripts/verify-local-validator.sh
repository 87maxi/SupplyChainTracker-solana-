#!/bin/bash
# Verify local validator setup and connectivity

set -e

echo "🔍 Verifying Local Validator Setup"
echo "===================================="

# Check required tools
echo ""
echo "📦 Checking installed tools..."
for tool in solana-test-validator surfpool anchor; do
    if command -v $tool &> /dev/null; then
        echo "✅ $tool: $(which $tool)"
    else
        echo "❌ $tool: NOT FOUND"
    fi
done

# Check if validator is running
echo ""
echo "🌐 Checking validator connectivity..."
RPC_PORT=8899
WS_PORT=8900

if curl -s -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
    "http://localhost:$RPC_PORT" | grep -q "ok"; then
    echo "✅ Validator is running on port $RPC_PORT"
    
    # Get version info
    VERSION=$(curl -s -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}' \
        "http://localhost:$RPC_PORT" | jq -r '.result.solana-core' 2>/dev/null || echo "unknown")
    echo "   Version: $VERSION"
else
    echo "❌ Validator is NOT running"
    echo "   Start with: bash scripts/start-local-validator.sh"
    exit 1
fi

# Check program deployment
echo ""
echo "📋 Checking program deployment..."
PROGRAM_ID=$(grep "sc_solana =" sc-solana/Anchor.toml | cut -d'"' -f2)
PROGRAM_INFO=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getProgramAccounts\",\"params\":[\"$PROGRAM_ID\"]}" \
    "http://localhost:$RPC_PORT")

if echo "$PROGRAM_INFO" | grep -q "result"; then
    ACCOUNT_COUNT=$(echo "$PROGRAM_INFO" | jq '.result | length' 2>/dev/null || echo "0")
    echo "✅ Program $PROGRAM_ID is deployed ($ACCOUNT_COUNT accounts)"
else
    echo "⚠️  Program not found on local validator"
    echo "   Deploy with: cd sc-solana && anchor deploy"
fi

# Check faucet
echo ""
echo "💰 Checking faucet..."
FAUCET_PORT=9900
if nc -z localhost $FAUCET_PORT 2>/dev/null; then
    echo "✅ Faucet is available on port $FAUCET_PORT"
else
    echo "⚠️  Faucet not running on port $FAUCET_PORT"
fi

echo ""
echo "===================================="
echo "✅ Local validator verification complete!"
