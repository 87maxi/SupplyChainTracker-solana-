#!/bin/bash

# Script final de despliegue para Anvil
set -e

echo "🚀 Despliegue final de SupplyChainTracker"

# Detener Anvil si está corriendo
pkill -x anvil 2>/dev/null || true
sleep 2

echo "📍 Iniciando Anvil..."
anvil --chain-id 31337 --port 8545 &
ANVIL_PID=$!
sleep 5

# Verificar Anvil
if ! curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 > /dev/null; then
    echo "❌ Error: Anvil no inició"
    exit 1
fi

echo "✅ Anvil iniciado"

# Compilar y desplegar
echo "📍 Compilando contratos..."
cd sc && forge build > /dev/null 2>&1

echo "📍 Desplegando contrato..."
DEPLOY_OUTPUT=$(forge script script/DeployAnvil.s.sol:DeployAnvil \
    --rpc-url http://localhost:8545 \
    --broadcast \
    --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
    --unlocked \
    --skip-simulation 2>&1)

echo "$DEPLOY_OUTPUT"

# Extraer dirección
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE 'SupplyChainTracker deployed at: 0x[0-9a-fA-F]{40}' | grep -oE '0x[0-9a-fA-F]{40}')

if [ -n "$CONTRACT_ADDRESS" ]; then
    echo ""
    echo "🎉 ¡DESPLIEGUE EXITOSO!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Contrato: SupplyChainTracker"
    echo "   Dirección: $CONTRACT_ADDRESS"
    echo "   RPC: http://localhost:8545"
    echo "   Chain ID: 31337"
    echo "   Admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Actualizar .env.local
    echo "📍 Actualizando configuración web..."
    mkdir -p web
    cat > web/.env.local <<EOF
NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS=$CONTRACT_ADDRESS
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CHAIN_ID=31337
ANVIL_ADMIN_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
NEXT_PUBLIC_VERIFICATION_BLOCKSCOUT_URL=http://localhost:8545
NEXT_PUBLIC_ETHERSCAN_URL=http://localhost:8545
NEXT_PUBLIC_PINATA_API_KEY=mock
NEXT_PUBLIC_PINATA_SECRET_API_KEY=mock
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=1234567890
EOF
    
    echo "✅ Configuración actualizada en web/.env.local"
    echo ""
    echo "🔧 Para usar con Rabby/MetaMask:"
    echo "   Network Name: Anvil Local"
    echo "   RPC URL: http://localhost:8545"
    echo "   Chain ID: 31337"
    echo "   Currency Symbol: ETH"
    echo ""
    echo "⚠️  Nota: Anvil se está ejecutando en segundo plano"
    echo "   Para detener: kill $ANVIL_PID"
else
    echo "❌ Error: No se pudo obtener la dirección del contrato"
    exit 1
fi