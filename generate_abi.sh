#!/bin/bash

# Script para generar y actualizar ABIs usando forge inspect
# Extrae el ABI del contrato compilado y lo actualiza en el proyecto web

set -e

echo "🔧 Generando ABI para SupplyChainTracker..."

# 1. Verificar que estamos en el directorio correcto
if [ ! -d "sc" ] || [ ! -d "web" ]; then
    echo "❌ Error: Este script debe ejecutarse desde el directorio raíz del proyecto"
    exit 1
fi

# 2. Compilar el contrato
echo "📍 Compilando contratos..."
(cd sc && forge build)
echo "   ✅ Compilación exitosa"

# 3. Extraer ABI usando forge inspect
echo "📍 Extrayendo ABI del contrato SupplyChainTracker..."
# forge inspect ya devuelve el ABI como JSON array directamente
ABI_OUTPUT=$(cd sc && forge inspect SupplyChainTracker abi 2>&1 | grep -v "^note\[" | grep -v "^  |" | grep -v "^  =" | grep -v "^ -->" | grep -v "^$" || true)

# Si el output contiene una tabla, necesitamos usar el archivo out/
if echo "$ABI_OUTPUT" | grep -q "function"; then
    echo "   ℹ️  Usando ABI del archivo compilado..."
    ABI_FILE="sc/out/SupplyChainTracker.sol/SupplyChainTracker.json"
    if [ -f "$ABI_FILE" ]; then
        ABI_OUTPUT=$(jq -c '.abi' "$ABI_FILE")
    else
        echo "❌ Error: No se encontró el archivo compilado"
        exit 1
    fi
fi

# 4. Verificar que el ABI es válido JSON
echo "📍 Validando formato JSON..."
if echo "$ABI_OUTPUT" | jq empty 2>/dev/null; then
    echo "   ✅ ABI válido"
else
    echo "❌ Error: El ABI generado no es JSON válido"
    exit 1
fi

# 5. Crear directorio de destino si no existe
mkdir -p web/src/contracts/abi

# 6. Guardar ABI en el archivo de destino
echo "📍 Guardando ABI en web/src/contracts/abi/SupplyChainTracker.json..."
echo "$ABI_OUTPUT" | jq '.' > web/src/contracts/abi/SupplyChainTracker.json

# 7. Verificar el archivo generado
if [ -f "web/src/contracts/abi/SupplyChainTracker.json" ]; then
    FILE_SIZE=$(wc -c < web/src/contracts/abi/SupplyChainTracker.json)
    echo "   ✅ ABI guardado exitosamente ($FILE_SIZE bytes)"
else
    echo "❌ Error: No se pudo guardar el ABI"
    exit 1
fi

# 8. Mostrar resumen del ABI
echo ""
echo "📊 Resumen del ABI:"
FUNCTION_COUNT=$(echo "$ABI_OUTPUT" | jq '[.[] | select(.type == "function")] | length')
EVENT_COUNT=$(echo "$ABI_OUTPUT" | jq '[.[] | select(.type == "event")] | length')
ERROR_COUNT=$(echo "$ABI_OUTPUT" | jq '[.[] | select(.type == "error")] | length')

echo "   Funciones: $FUNCTION_COUNT"
echo "   Eventos: $EVENT_COUNT"
echo "   Errores: $ERROR_COUNT"

# 9. Listar funciones principales
echo ""
echo "📝 Funciones principales:"
echo "$ABI_OUTPUT" | jq -r '.[] | select(.type == "function") | "   - \(.name)"' | head -10

if [ "$FUNCTION_COUNT" -gt 10 ]; then
    echo "   ... y $((FUNCTION_COUNT - 10)) más"
fi

echo ""
echo "✅ ABI actualizado exitosamente!"
echo ""
echo "📁 Ubicación: web/src/contracts/abi/SupplyChainTracker.json"
echo ""
echo "💡 Tip: Si modificas el contrato, ejecuta este script nuevamente"
echo "   para actualizar el ABI en el proyecto web."
echo ""
