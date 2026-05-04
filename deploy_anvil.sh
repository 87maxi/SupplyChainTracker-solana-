#!/bin/bash

################################################################################
# SCRIPT DE DESPLIEGUE DE SUPPLYCHAIN TRACKER EN ANVIL
################################################################################
#
# PROPÓSITO:
#   Este script automatiza el despliegue del contrato SupplyChainTracker en
#   una blockchain local usando Anvil (parte de Foundry).
#
# CARACTERÍSTICAS PRINCIPALES:
#   - Gestión automática de procesos de Anvil
#   - Estado persistente entre reinicios
#   - Generación automática de bloques cada 1 segundo
#   - Configuración optimizada para desarrollo con wallets como Rabby
#
# USO:
#   ./deploy_anvil.sh
#
# REQUISITOS:
#   - Foundry instalado (forge, anvil)
#   - Proyecto Foundry en el directorio ./sc
#
################################################################################

set -e  # Detener el script si cualquier comando falla

echo "🚀 Iniciando despliegue de SupplyChainTracker en Anvil..."

################################################################################
# SECCIÓN 1: GESTIÓN DE PROCESOS DE ANVIL
################################################################################
#
# OBJETIVO: Asegurar que no haya instancias previas de Anvil ejecutándose
#
################################################################################

echo "📍 Verificando procesos de Anvil existentes..."
if pgrep -x anvil > /dev/null; then
    echo "   ⚠️  Anvil ya está corriendo. Deteniendo proceso anterior..."
    pkill -x anvil
    sleep 2  # Esperar a que el proceso termine completamente
fi

 anvil --chain-id 31337  &


################################################################################
# SECCIÓN 2: INICIALIZACIÓN DE ANVIL
################################################################################
#
# OBJETIVO: Iniciar Anvil con configuración optimizada para desarrollo
#
# PARÁMETROS EXPLICADOS:
#
#   --chain-id 31337
#     └─> ID de la red blockchain local (estándar para desarrollo)
#         Rabby Wallet y MetaMask usan este ID para identificar la red
#
#   --block-time 1
#     └─> Genera un bloque cada 1 segundo
#         Asegura que las transacciones se confirmen inmediatamente
#         Evita timeouts en waitForTransaction
#
#   --state ./anvil-state.json
#     └─> CARGA el estado previo desde este archivo (si existe)
#         Esto permite que los contratos desplegados persistan entre reinicios
#
#   --state-interval 1
#     └─> Guarda el estado cada 1 segundo
#         Asegura que los cambios se persistan rápidamente
#
#   --dump-state ./anvil-state.json
#     └─> GUARDA el estado actual en este archivo
#         Se ejecuta periódicamente según --state-interval
#         También se guarda cuando Anvil se cierra correctamente
#
#   &
#     └─> Ejecuta Anvil en segundo plano
#         Permite que el script continúe ejecutándose
#
################################################################################

echo "📍 Iniciando Anvil con estado persistente..."
echo "   Chain ID: 31337"
echo "   Block Time: 1 segundo"
echo "   Estado: ./anvil-state.json"

anvil --chain-id 31337 \\
  --block-time 1 \\
  --state ./anvil-state.json \\
  --state-interval 1 \\
  --dump-state ./anvil-state.json \\
  --port 8545 &

# Capturar el PID (Process ID) de Anvil para gestión posterior
ANVIL_PID=$!
echo "   ✅ Anvil iniciado (PID: $ANVIL_PID)"

################################################################################
# SECCIÓN 3: ESPERA DE INICIALIZACIÓN
################################################################################
#
# OBJETIVO: Dar tiempo a Anvil para inicializar completamente
#
# DETALLES:
#   - Anvil necesita unos segundos para:
#     * Iniciar el servidor RPC en el puerto 8545
#     * Cargar el estado previo (si existe)
#     * Generar las cuentas de desarrollo
#   - 3 segundos es suficiente para la mayoría de los casos
#
################################################################################

echo "📍 Esperando a que Anvil inicialice..."
sleep 3

################################################################################
# SECCIÓN 4: COMPILACIÓN DE CONTRATOS
################################################################################
#
# OBJETIVO: Compilar los contratos Solidity usando Forge
#
# DETALLES:
#   - Se ejecuta en el directorio ./sc (proyecto Foundry)
#   - 'forge build' compila todos los contratos en ./sc/src
#   - Genera artefactos en ./sc/out
#
################################################################################

echo "📍 Compilando contratos..."
(cd sc && forge build)
echo "   ✅ Compilación exitosa"

################################################################################
# SECCIÓN 5: DESPLIEGUE DEL CONTRATO
################################################################################
#
# OBJETIVO: Desplegar el contrato SupplyChainTracker en Anvil
#
# PARÁMETROS DE FORGE SCRIPT:
#
#   script/Deploy.s.sol:DeploySupplyChainTracker
#     └─> Script de despliegue a ejecutar
#
#   --rpc-url http://localhost:8545
#     └─> URL del nodo Anvil (puerto por defecto)
#
#   --broadcast
#     └─> Ejecutar las transacciones (no solo simular)
#         Guarda los resultados en ./sc/broadcast
#
#   --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
#     └─> Dirección que firma las transacciones
#         Esta es la primera cuenta de desarrollo de Anvil
#         Tiene 10,000 ETH de prueba
#
#   --unlocked
#     └─> No requiere clave privada (cuenta desbloqueada en Anvil)
#
#   --skip-simulation
#     └─> Saltar la simulación previa (más rápido)
#
#   2>&1
#     └─> Redirigir stderr a stdout para capturar todo el output
#
################################################################################

echo "📍 Desplegando contrato SupplyChainTracker..."
DEPLOY_OUTPUT=$(cd sc && forge script script/Deploy.s.sol:DeploySupplyChainTracker \\
    --rpc-url http://localhost:8545 \\
    --broadcast \\
    --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \\
    --unlocked \\
    --skip-simulation 2>&1)

echo "$DEPLOY_OUTPUT"

################################################################################
# SECCIÓN 6: EXTRACCIÓN DE DIRECCIÓN DEL CONTRATO
################################################################################
#
# OBJETIVO: Obtener la dirección donde se desplegó el contrato
#
# MÉTODOS:
#   1. Buscar en el output del comando (patrón: "0: contract SupplyChainTracker 0x...")
#   2. Si falla, buscar en el archivo de broadcast JSON
#
# DETALLES:
#   - grep -oE: busca con expresión regular y solo muestra la coincidencia
#   - El archivo run-latest.json contiene el último despliegue
#
################################################################################

echo "📍 Extrayendo dirección del contrato..."
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE '0: contract SupplyChainTracker 0x[0-9a-fA-F]{40}' | grep -oE '0x[0-9a-fA-F]{40}')

# Si no se encuentra, intentar desde el archivo de broadcast
if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "   Buscando en archivo de broadcast..."
    CONTRACT_ADDRESS=$(cd sc && cat broadcast/Deploy.s.sol/31337/run-latest.json 2>/dev/null | grep -oE '"contractAddress": *"0x[0-9a-fA-F]{40}"' | head -1 | grep -oE '0x[0-9a-fA-F]{40}')
fi

################################################################################
# SECCIÓN 7: VERIFICACIÓN Y REPORTE
################################################################################
#
# OBJETIVO: Verificar que el despliegue fue exitoso y mostrar información
#
# ACCIONES:
#   - Si CONTRACT_ADDRESS está vacío, el despliegue falló
#   - Si tiene valor, mostrar información y guardarla en variables.txt
#   - Proporcionar instrucciones para configurar Rabby Wallet
#
################################################################################

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
    
    # Guardar información en archivo para referencia
    cat > variables.txt <<EOF
Dirección del contrato: $CONTRACT_ADDRESS
URL de RPC: http://localhost:8545
Chain ID: 31337
Estado persistente: ./anvil-state.json
Despliegue completado: $(date)
Anvil PID: $ANVIL_PID
EOF

# Actualizar .env.local en web/
if [ -n "$CONTRACT_ADDRESS" ]; then
    echo "📝 Actualizando .env.local con la dirección del contrato..."
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
    echo "✅ .env.local actualizado en web/"
fi


    echo ""
    echo "💾 Información guardada en: variables.txt"
    echo ""
    echo "🔧 Configuración de Rabby Wallet:"
    echo "   Network Name: Anvil Local"
    echo "   RPC URL: http://localhost:8545"
    echo "   Chain ID: 31337"
    echo "   Currency Symbol: ETH"
    echo ""
    echo "⚠️  Si tienes transacciones pendientes en Rabby:"
    echo "   1. Ejecuta: ./cleanup_anvil.sh"
    echo "   2. Resetea tu cuenta en Rabby Wallet"
    echo "   3. Vuelve a ejecutar este script"
    echo ""
    echo "📚 Más información: docs/troubleshooting-wallet.md"
    echo ""
else
    echo ""
    echo "❌ Error: No se pudo obtener la dirección del contrato"
    echo "   Revisa el output del despliegue arriba"
    kill $ANVIL_PID
    exit 1
fi

################################################################################
# SECCIÓN 8: MANTENER ANVIL EJECUTÁNDOSE
################################################################################
#
# OBJETIVO: Mantener Anvil corriendo en segundo plano
#
# DETALLES:
#   - Anvil seguirá generando bloques cada 1 segundo
#   - El script espera a que Anvil termine (wait $ANVIL_PID)
#   - Trap captura Ctrl+C para cerrar Anvil limpiamente
#
# ¿POR QUÉ SIGUE GENERANDO BLOQUES?
#   - Es el comportamiento configurado con --block-time 1
#   - Simula una blockchain real que siempre está activa
#   - Permite que las transacciones se confirmen automáticamente
#   - NO es un error, es el comportamiento esperado
#
# PARA DETENER ANVIL:
#   - Presiona Ctrl+C en esta terminal
#   - O ejecuta: kill $ANVIL_PID
#   - O ejecuta: ./cleanup_anvil.sh
#
################################################################################

echo "🔄 Anvil está corriendo en segundo plano..."
echo "   ⏱️  Generando bloques cada 1 segundo"
echo "   💾 Guardando estado cada 1 segundo en anvil-state.json"
echo ""
echo "   Para detener: kill $ANVIL_PID"
echo "   O presiona Ctrl+C"
echo ""

# Trap para manejar Ctrl+C y cerrar Anvil limpiamente
trap "echo ''; echo '🛑 Deteniendo Anvil...'; kill $ANVIL_PID; exit 0" INT TERM

# Esperar a que Anvil termine (se ejecuta indefinidamente hasta que se mate)
wait $ANVIL_PID"
