#!/bin/bash
# Script para eliminar archivos problemáticos en el directorio mm

# Eliminar archivos específicos en web/src/lib/mm que están causando conflictos
rm -f web/src/lib/mm/useRoleRequests.ts
rm -f web/src/lib/mm/roleMapping.ts

# Verificar si los archivos fueron eliminados
if [ ! -f "web/src/lib/mm/useRoleRequests.ts" ] && [ ! -f "web/src/lib/mm/roleMapping.ts" ]; then
    echo "Archivos problemáticos eliminados con éxito"
    # Verificar qué otros archivos existen en el directorio mm
    echo "Contenido restante en web/src/lib/mm/:":
    ls -la web/src/lib/mm/
else
    echo "Error: No se pudieron eliminar los archivos problemáticos"
    exit 1
fi