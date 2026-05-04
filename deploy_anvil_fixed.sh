#!/bin/bash

################################################################################
# SCRIPT DE DESPLIEGUE DE SUPPLYCHAIN TRACKER EN ANVIL - VERSIÓN MEJORADA
################################################################################
#
# ✅ MEJORAS PRINCIPALES:
#   - Validación de estado JSON antes de cargar
#   - Espera activa del RPC (port 8545)
#   - Extracción segura de dirección validando estado de transacción
#   - Mejor manejo de errores con sugerencias
#   - Compatibilidad con CI/CD
#
# REQUISITOS ADICIONALES:
#   - jq (para parsear JSON)
#   - netcat (para verificar puerto)
#     Instalar en Ubuntu/Debian: sudo apt-get install jq netcat
#
################################################################################

set -euo pipefail  # Mejor control de errores


################################################################################
# FUNCIONES AUXILIARES
################################################################################

# Verificar dependencias
check_dependencies() {
    for cmd in jq nc; do
        if ! command -v "$cmd" &> /dev/null; then
            echo "❌ Error: '$cmd' no está instalado. Instálalo antes de continuar."
            exit 1
        fi
    done
}

# Esperar a que el RPC esté disponible
wait_for_rpc() {
    echo "🔍 Esperando a que Anvil escuche en http://localhost:8545..."
    timeout 30 bash -c 'until nc -z localhost 8545; do sleep 0.5; done' || {
        echo "❌ Timeout: Anvil no está disponible en el puerto 8545."
        return 1
    }
    echo "✅ RPC disponible"
}

# Validar que anvil-state.json es JSON válido
validate_state_file() {
    if [ -f "anvil-state.json" ]; then
        if ! jq empty "anvil-state.json" 2>/dev/null; then
            echo "❌ Error: anvil-state.json no es JSON válido. Se eliminará."
            rm -f anvil-state.json
        else
            echo "✅ Estado previo válido detectado."
        fi
    fi
}

# Extraer dirección del contrato con validación de éxito
get_contract_address() {
    local json_file="sc/broadcast/Deploy.s.sol/31337/run-latest.json"
    
    if [ ! -f "$json_file" ]; then
        echo ""; return
    fi
    
    # Extraer sólo si la transacción fue exitosa (status == 1)
    jq -r '.transactions[] | select(.receipts[].status == "1") | .contractAddress' "$json_file" 2>/dev/null | head -1
}


################################################################################
# INICIO DEL SCRIPT
################################################################################

check_dependencies

echo "🚀 Iniciando despliegue de SupplyChainTracker en Anvil (versión mejorada)..."

echo "📍 Verificando procesos de Anvil existentes..."
if pgrep -x anvil > /dev/null; then
    echo "   ⚠️  Anvil ya está corriendo. Deteniendo proceso anterior..."
    pkill -x anvil
    sleep 2
fi

# Validar estado previo
validate_state_file

# Iniciar Anvil
echo "📍 Iniciando Anvil con estado persistente..."
echo "   Chain ID: 31337"
echo "   Estado: ./anvil-state.json"

if [ -f "anvil-state.json" ]; then
    anvil \
        --chain-id 31337 \
        --state ./anvil-state.json \
        --state-interval 1 \
        --dump-state ./anvil-state.json &
else
    anvil \
        --chain-id 31337 \
        --state-interval 1 \
        --dump-state ./anvil-state.json &
fi

ANVIL_PID=$!
echo "   ✅ Anvil iniciado (PID: $ANVIL_PID)"

echo "📍 Esperando a que Anvil inicialice..."
wait_for_rpc || exit 1

# Compilar contratos
echo "📍 Compilando contratos..."
(cd sc && forge build --force)
echo "   ✅ Compilación exitosa"

# Desplegar contrato
echo "📍 Desplegando contrato SupplyChainTracker..."
DEPLOY_OUTPUT=$(cd sc && forge script script/Deploy.s.sol:DeploySupplyChainTracker \
    --rpc-url http://localhost:8545 \
    --broadcast \
    --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
    --unlocked \
    --skip-simulation 2>&1)
echo "$DEPLOY_OUTPUT"

# Extraer dirección con validación
echo "📍 Validando despliegue y extrayendo dirección..."
CONTRACT_ADDRESS=$(get_contract_address)

if [ -n "$CONTRACT_ADDRESS" ]; then
    echo ""
    echo "✅ ¡Despliegue exitoso!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 Información del contrato:"
    echo "   Dirección: $CONTRACT_ADDRESS"
    echo "   RPC URL: http://localhost:8545"
    echo "   Chain ID: 31337"
    echo "   Estado: ./anvil-state.json"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Guardar en variables.txt
    cat > variables.txt <<EOF
Dirección del contrato: $CONTRACT_ADDRESS
URL de RPC: http://localhost:8545
Chain ID: 31337
Estado persistente: ./anvil-state.json
Despliegue completado: $(date)
Anvil PID: $ANVIL_PID
EOF
    
    echo "💾 Información guardada en: variables.txt"
    echo ""
    echo "🔧 Configuración de Rabby Wallet:"
    echo "   Network Name: Anvil Local"
    echo "   RPC URL: http://localhost:8545"
    echo "   Chain ID: 31337"
    echo "   Currency Symbol: ETH"
    echo ""
else
    echo "
❌ Error: No se pudo obtener la dirección del contrato o la transacción falló."
    echo "➡️  Sugerencias para depurar:"
    echo "   1. Verifica el archivo de broadcast: sc/broadcast/Deploy.s.sol/31337/run-latest.json"
    echo "   2. Reintenta con: forge script sc/script/Deploy.s.sol --rpc-url http://localhost:8545 --private-key YOUR_PK"
    echo "   3. Limpia con: ./cleanup_anvil.sh y vuelve a ejecutar"
    kill $ANVIL_PID 2>/dev/null || true
    exit 1
fi

# Mantener Anvil vivo
echo "🔄 Anvil está corriendo en segundo plano..."
trap "echo ''; echo '🛑 Deteniendo Anvil...'; kill $ANVIL_PID; exit 0" INT TERM
wait $ANVIL_PID