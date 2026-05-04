#!/bin/bash

# Script para generar ABIs desde contratos Solidity
# Ejecutar desde la raíz del proyecto

set -e

echo "Generando ABIs desde contratos Solidity..."

cd sc

# Generar ABI para SupplyChainTracker
forge inspect src/SupplyChainTracker.sol abi --json > ../web/src/contracts/abi/SupplyChainTracker.json

echo "✅ ABI generado: web/src/contracts/abi/SupplyChainTracker.json"

echo "
Todos los ABIs generados exitosamente!"

echo "
➡️  Recuerda ejecutar 'yarn dev' en la carpeta web para iniciar la aplicación"

echo "➡️  Asegúrate de tener anvil ejecutándose en otro terminal con 'anvil'"

echo "
📄 Documentación de cambios en docs/consistency-fixes.md"

# Volver al directorio raíz
cd ..

# Actualizar permisos
chmod +x web/scripts/generate-abis.sh

# Mensaje final
echo "
💡 Para regenerar ABIs en el futuro, ejecuta:"
echo "   ./web/scripts/generate-abis.sh"

echo "
✨ Configuración completada!"

echo "
Generated with [Continue](https://continue.dev)"
echo "
Co-Authored-By: Continue <noreply@continue.dev>"