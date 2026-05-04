// web/scripts/debug-connection.mjs
// Script de depuración para verificar la conexión con el cliente Viem

import { createPublicClient, http } from 'viem';
import { localhost } from 'viem/chains';

const ANVIL_RPC_URL = process.env.NEXT_PUBLIC_ANVIL_RPC_URL || 'http://127.0.0.1:8545';

async function debugConnection() {
  console.log('🔍 Iniciando depuración de conexión blockchain...');
  console.log('🌐 URL RPC:', ANVIL_RPC_URL);
  
  try {
    console.log('\n🔧 Creando cliente público...');
    const publicClient = createPublicClient({
      chain: localhost,
      transport: http(ANVIL_RPC_URL)
    });
    
    console.log('✅ Cliente público creado exitosamente');
    
    console.log('\n📌 Obteniendo número de bloque...');
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`🎉 Conexión exitosa! Número de bloque actual: ${blockNumber}`);
    
    console.log('\n✅ La conexión con Anvil está funcionando correctamente');
    return true;
    
  } catch (error) {
    console.error('\n❌ Error de conexión:');
    console.error('Tipo de error:', error.name);
    console.error('Mensaje:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Solución: Asegúrate de que Anvil esté ejecutándose en http://127.0.0.1:8545');
      console.error('Ejecuta: anvil --port 8545 en otra terminal');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 Solución: Verifica la URL RPC en .env.local');
    }
    
    return false;
  }
}

// Ejecutar la función de depuración
debugConnection().then(success => {
  process.exit(success ? 0 : 1);
});