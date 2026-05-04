#!/bin/bash

# Script para limpiar el estado de Anvil y resetear el blockchain local
# Útil cuando tienes transacciones pendientes en Rabby Wallet

set -e

echo "🧹 Limpiando estado de Anvil..."

# 1. Matar todos los procesos de Anvil
echo "📍 Deteniendo procesos de Anvil..."
pkill -x anvil || echo "   ℹ️  No hay procesos de Anvil corriendo"

# 2. Eliminar archivo de estado persistente
if [ -f "anvil-state.json" ]; then
    echo "📍 Eliminando archivo de estado (anvil-state.json)..."
    rm anvil-state.json
    echo "   ✅ Estado eliminado"
else
    echo "   ℹ️  No existe archivo de estado"
fi

# 3. Limpiar historial de broadcast (opcional)
if [ -d "sc/broadcast" ]; then
    echo "📍 ¿Deseas limpiar el historial de broadcast? (s/n)"
    read -r response
    if [[ "$response" =~ ^[Ss]$ ]]; then
        echo "   Limpiando broadcast..."
        rm -rf sc/broadcast/Deploy.s.sol/31337/*
        echo "   ✅ Historial de broadcast limpiado"
    else
        echo "   ⏭️  Historial de broadcast conservado"
    fi
fi

# 4. Limpiar cache de forge (opcional)
if [ -d "sc/cache" ]; then
    echo "📍 ¿Deseas limpiar el cache de Forge? (s/n)"
    read -r response
    if [[ "$response" =~ ^[Ss]$ ]]; then
        echo "   Limpiando cache..."
        (cd sc && forge clean)
        echo "   ✅ Cache limpiado"
    else
        echo "   ⏭️  Cache conservado"
    fi
fi

echo ""
echo "✅ Limpieza completada!"
echo ""
echo "📝 IMPORTANTE - Resetear Rabby Wallet:"
echo "   1. Abre Rabby Wallet"
echo "   2. Ve a Settings (⚙️) → Advanced"
echo "   3. Busca 'Clear activity tab data' o 'Reset account'"
echo "   4. Confirma el reset"
echo ""
echo "   Alternativamente, puedes:"
echo "   - Eliminar y volver a agregar la red Anvil en Rabby"
echo "   - Usar MetaMask: Settings → Advanced → Reset Account"
echo ""
echo "🚀 Para iniciar Anvil nuevamente, ejecuta:"
echo "   ./deploy_anvil.sh"
echo ""
