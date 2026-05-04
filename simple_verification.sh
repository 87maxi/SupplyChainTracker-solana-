#!/bin/bash

# Verificación simple del contrato
echo "🔍 Verificación simple del contrato..."

# Verificar que Anvil responde
if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 > /dev/null 2>&1; then
    echo "✅ Anvil está respondiendo"
else
    echo "❌ Anvil no responde"
    exit 1
fi

# Verificar el contrato usando forge directamente
echo "📍 Verificando contrato con forge..."

cd sc && forge inspect 0x5FbDB2315678afecb367f032d93F642f64180aa3 --rpc-url http://localhost:8545 bytecode 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Contrato verificado exitosamente"
    echo "   Dirección: 0x5FbDB2315678afecb367f032d93F642f64180aa3"
else
    echo "❌ No se pudo verificar el contrato"
    echo "   Posibles causas:"
    echo "   - El contrato no se desplegó correctamente"
    echo "   - Anvil se reinició y perdió el estado"
    echo "   - Problema con la dirección del contrato"
fi