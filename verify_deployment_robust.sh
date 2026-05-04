#!/bin/bash

# Script robusto para verificar el despliegue del contrato

echo "🔍 Verificando despliegue del contrato..."

# Dirección del contrato desplegado
CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"

# Verificar que Anvil está corriendo
echo "📍 Verificando que Anvil está corriendo..."
if ! curl -s -X POST --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' http://localhost:8545 > /dev/null 2>&1; then
    echo "❌ Error: Anvil no está respondiendo en el puerto 8545"
    exit 1
fi

echo "✅ Anvil está corriendo"

# Verificar que el contrato existe
echo "📍 Verificando código del contrato..."
CONTRACT_CODE=$(curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x5FbDB2315678afecb367f032d93F642f64180aa3","latest"],"id":1}' http://localhost:8545)

# Extraer el código del contrato del resultado JSON
CODE=$(echo "$CONTRACT_CODE" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)

if [ "$CODE" != "0x" ] && [ -n "$CODE" ]; then
    echo "✅ Contrato desplegado correctamente"
    echo "   Dirección: $CONTRACT_ADDRESS"
    echo "   Longitud del código: $((${#CODE} / 2 - 1)) bytes"
else
    echo "❌ Error: Contrato no encontrado o código vacío"
    echo "   Respuesta: $CONTRACT_CODE"
    exit 1
fi

# Verificar número de bloque actual
echo "📍 Verificando estado de la blockchain..."
BLOCK_NUMBER=$(curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545)
BLOCK_HEX=$(echo "$BLOCK_NUMBER" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
BLOCK_DEC=$((16#${BLOCK_HEX#0x}))

echo "✅ Blockchain activa - Bloque actual: $BLOCK_DEC"

echo ""
echo "🎉 ¡Despliegue verificado exitosamente!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Resumen del despliegue:"
echo "   Contrato: SupplyChainTracker"
echo "   Dirección: $CONTRACT_ADDRESS"
echo "   RPC: http://localhost:8545"
echo "   Chain ID: 31337"
echo "   Bloque: $BLOCK_DEC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔧 Configuración para wallets:"
echo "   Network Name: Anvil Local"
echo "   RPC URL: http://localhost:8545"
echo "   Chain ID: 31337"
echo "   Currency Symbol: ETH"
echo ""
echo "💡 La aplicación web debería estar configurada automáticamente"
echo "   con la dirección del contrato en web/.env.local"