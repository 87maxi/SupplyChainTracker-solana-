#!/bin/bash
# ============================================================================
# Keypair Setup Script
# ============================================================================
# Generates and funds all role keypairs needed for testing
# Usage: ./scripts/setup-keypairs.sh [rpc_url]
# ============================================================================

set -e

RPC_URL="${1:-http://localhost:8899}"
KEYPAIRS_DIR="./config/keypairs"
AIRDROP_SOL="${AIRDROP_AMOUNT:-5}"

# Create keypairs directory
mkdir -p "$KEYPAIRS_DIR"

ROLES=("fabricante" "auditor_hw" "tecnico_sw" "escuela")

echo "========================================"
echo "SupplyChainTracker - Keypair Setup"
echo "========================================"
echo "RPC URL: $RPC_URL"
echo "Keypairs Dir: $KEYPAIRS_DIR"
echo "Airdrop: ${AIRDROP_SOL} SOL per wallet"
echo "========================================"

# Generate keypairs
for role in "${ROLES[@]}"; do
  KEYPAIR_PATH="$KEYPAIRS_DIR/${role}.json"
  if [ -f "$KEYPAIR_PATH" ]; then
    echo "[SKIP] $role keypair already exists at $KEYPAIR_PATH"
  else
    echo "[GENERATE] Creating $role keypair..."
    solana-keygen new -o "$KEYPAIR_PATH" --no-bip39-passphrase
  fi
  
  # Get address
  ADDRESS=$(solana address -k "$KEYPAIR_PATH" 2>/dev/null)
  echo "  → $role: $ADDRESS"
done

# Fund keypairs
echo ""
echo "========================================"
echo "Funding wallets with airdrop..."
echo "========================================"

for role in "${ROLES[@]}"; do
  KEYPAIR_PATH="$KEYPAIRS_DIR/${role}.json"
  ADDRESS=$(solana address -k "$KEYPAIR_PATH" 2>/dev/null)
  
  echo "[AIRDROP] ${AIRDROP_SOL} SOL → $role ($ADDRESS)"
  solana airdrop "$AIRDROP_SOL" "$ADDRESS" --url "$RPC_URL" || {
    echo "[WARN] Airdrop failed for $role - network may not support airdrop"
  }
done

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Generated keypairs:"
for role in "${ROLES[@]}"; do
  KEYPAIR_PATH="$KEYPAIRS_DIR/${role}.json"
  ADDRESS=$(solana address -k "$KEYPAIR_PATH" 2>/dev/null)
  echo "  $role: $KEYPAIR_PATH ($ADDRESS)"
done
echo ""
echo "To use with runbooks:"
echo "  export KEYPAIRS_DIR=$(pwd)/$KEYPAIRS_DIR"
echo "  source config/config.env"
