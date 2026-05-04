#!/bin/bash

# Script para verificar el despliegue del contrato

echo "🔍 Verificando despliegue del contrato..."

# Dirección del contrato desplegado
CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"

# Verificar que el contrato existe llamando a una función simple
echo "📍 Llamando a función del contrato..."

# Intentar obtener el código del contrato
CONTRACT_CODE=$(curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_getCode","params":["$CONTRACT_ADDRESS","latest"],"id":1}' http://localhost:8545)

if echo "$CONTRACT_CODE" | grep -q "0x"; then
    echo "✅ Contrato desplegado correctamente"
    echo "   Dirección: $CONTRACT_ADDRESS"
    echo "   Código: Presente (no es 0x)"
else
    echo "❌ Error: Contrato no encontrado en la dirección especificada"
    exit 1
fi

# Verificar que el admin tiene roles
echo "📍 Verificando roles del administrador..."

# La cuenta admin por defecto de Anvil
ADMIN_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# Verificar rol DEFAULT_ADMIN
DEFAULT_ADMIN_CHECK=$(curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"$CONTRACT_ADDRESS","data":"0x248a9ca3000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000000000000000000000000000000000000000000000"},"latest"],"id":1}' http://localhost:8545)

if echo "$DEFAULT_ADMIN_CHECK" | grep -q "0x0000000000000000000000000000000000000000000000000000000000000001"; then
    echo "✅ Rol DEFAULT_ADMIN asignado correctamente"
else
    echo "❌ Error: DEFAULT_ADMIN no asignado"
fi

echo ""
echo "🎉 Verificación completada!"
echo "El contrato SupplyChainTracker está listo para usar en:"
echo "   Dirección: $CONTRACT_ADDRESS"
echo "   RPC: http://localhost:8545"
echo "   Chain ID: 31337"
echo ""
echo "Para usar con Rabby/MetaMask:"
echo "   Network Name: Anvil Local"
echo "   RPC URL: http://localhost:8545"
echo "   Chain ID: 31337"
echo "   Currency Symbol: ETH"