#!/bin/bash

# Script de despliegue con manejo adecuado de estado
set -e

echo "🚀 Iniciando despliegue con gestión de estado..."

# Detener Anvil si está corriendo
pkill -x anvil 2>/dev/null || true
sleep 2

# Verificar si existe estado previo
if [ -f "anvil-state.json" ]; then
    echo "📂 Cargando estado previo..."
    anvil --chain-id 31337 --state ./anvil-state.json --port 8545 &
else
    echo "📂 Iniciando nuevo estado..."
    anvil --chain-id 31337 --port 8545 &
fi

ANVIL_PID=$!
sleep 5

# Verificar que Anvil esté corriendo
if ! curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 > /dev/null; then
    echo "❌ Error: Anvil no inició correctamente"
    exit 1
fi

echo "✅ Anvil iniciado correctamente"

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

# Extraer dirección del contrato
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE 'SupplyChainTracker deployed at: 0x[0-9a-fA-F]{40}' | grep -oE '0x[0-9a-fA-F]{40}')

if [ -n "$CONTRACT_ADDRESS" ]; then
    echo ""
    echo "✅ ¡Despliegue exitoso!"
    echo "   Contrato: $CONTRACT_ADDRESS"
    
    # Guardar estado
    echo "💾 Guardando estado..."
    pkill -x anvil
    sleep 2
    anvil --chain-id 31337 --state ./anvil-state.json --dump-state ./anvil-state.json --port 8545 &
    
    echo "🎉 Estado guardado en anvil-state.json"
    echo "El contrato persistirá entre reinicios"
else
    echo "❌ Error en el despliegue"
    exit 1
fi