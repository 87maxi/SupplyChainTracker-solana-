#!/bin/bash

################################################################################
# SCRIPT DE DESPLIEGUE OPTIMIZADO PARA ANVIL
################################################################################

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando despliegue optimizado en Anvil...${NC}"

################################################################################
# 1. VERIFICACIÓN DE PROCESOS EXISTENTES
################################################################################

echo "📍 Verificando procesos de Anvil existentes..."
if pgrep -x anvil > /dev/null; then
    echo -e "${YELLOW}⚠️  Anvil ya está corriendo. Deteniendo proceso anterior...${NC}"
    pkill -x anvil
    sleep 3
fi

################################################################################
# 2. INICIALIZACIÓN DE ANVIL
################################################################################

echo "📍 Iniciando Anvil..."
anvil --chain-id 31337 --port 8545 &
ANVIL_PID=$!
echo -e "${GREEN}✅ Anvil iniciado (PID: $ANVIL_PID)${NC}"

# Esperar inicialización
sleep 5

# Verificar que Anvil esté respondiendo
if ! curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Anvil no está respondiendo${NC}"
    kill $ANVIL_PID 2>/dev/null || true
    exit 1
fi

################################################################################
# 3. COMPILACIÓN DE CONTRATOS
################################################################################

echo "📍 Compilando contratos..."
if ! (cd sc && forge build); then
    echo -e "${RED}❌ Error: Falló la compilación${NC}"
    kill $ANVIL_PID 2>/dev/null || true
    exit 1
fi
echo -e "${GREEN}✅ Compilación exitosa${NC}"

################################################################################
# 4. DESPLIEGUE CON SCRIPT OPTIMIZADO
################################################################################

echo "📍 Desplegando contrato con script optimizado..."

DEPLOY_OUTPUT=$(cd sc && forge script script/DeployAnvil.s.sol:DeployAnvil \
    --rpc-url http://localhost:8545 \
    --broadcast \
    --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
    --unlocked \
    --skip-simulation 2>&1)

echo "$DEPLOY_OUTPUT"

# Extraer dirección del contrato
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE 'SupplyChainTracker deployed at: 0x[0-9a-fA-F]{40}' | grep -oE '0x[0-9a-fA-F]{40}')

# Si no se encuentra, buscar en archivo de broadcast
if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "Buscando en archivo de broadcast..."
    BROADCAST_FILE="sc/broadcast/DeployAnvil.s.sol/31337/run-latest.json"
    if [ -f "$BROADCAST_FILE" ]; then
        CONTRACT_ADDRESS=$(grep -oE '"contractAddress": *"0x[0-9a-fA-F]{40}"' "$BROADCAST_FILE" | head -1 | grep -oE '0x[0-9a-fA-F]{40}')
    fi
fi

################################################################################
# 5. VERIFICACIÓN Y CONFIGURACIÓN
################################################################################

if [ -n "$CONTRACT_ADDRESS" ]; then
    echo ""
    echo -e "${GREEN}✅ ¡Despliegue exitoso!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 Información del contrato:"
    echo "   Dirección: $CONTRACT_ADDRESS"
    echo "   RPC URL: http://localhost:8545"
    echo "   Chain ID: 31337"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Actualizar .env.local
    echo "📍 Actualizando configuración..."
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
    echo -e "${GREEN}✅ Configuración actualizada en web/.env.local${NC}"
    
    # Guardar información
    cat > deploy_info.txt <<EOF
CONTRACT_ADDRESS=$CONTRACT_ADDRESS
RPC_URL=http://localhost:8545
CHAIN_ID=31337
ADMIN_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
DEPLOY_TIME=$(date)
EOF
    
    echo ""
    echo -e "${GREEN}🔧 Configuración de wallet:"
    echo "   Network Name: Anvil Local"
    echo "   RPC URL: http://localhost:8545"
    echo "   Chain ID: 31337"
    echo "   Currency Symbol: ETH${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Error: No se pudo obtener la dirección del contrato${NC}"
    echo "Posibles soluciones:"
    echo "1. Verifica que el script DeployAnvil.s.sol existe"
    echo "2. Revisa los logs de despliegue arriba"
    echo "3. Ejecuta manualmente: cd sc && forge script script/DeployAnvil.s.sol --rpc-url http://localhost:8545 --broadcast --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --unlocked"
    kill $ANVIL_PID 2>/dev/null || true
    exit 1
fi

################################################################################
# 6. MANTENER ANVIL EJECUTÁNDOSE
################################################################################

echo -e "${YELLOW}🔄 Anvil está corriendo en segundo plano...${NC}"
echo "   Para detener: kill $ANVIL_PID"
echo "   O presiona Ctrl+C"
echo ""

# Manejar cierre limpio
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Deteniendo Anvil...${NC}"
    kill $ANVIL_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

wait $ANVIL_PID