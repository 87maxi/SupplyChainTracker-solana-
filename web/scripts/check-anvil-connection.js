#!/usr/bin/env node

/**
 * Script para verificar la conexión con Anvil
 * Útil para diagnóstico de problemas de timeout
 */

import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Configuración similar a la usada en la app
const anvilChain = {
  id: 31337,
  name: 'Anvil Local',
  network: 'anvil',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ANVIL_RPC_URL || 'http://127.0.0.1:8545'],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_ANVIL_RPC_URL || 'http://127.0.0.1:8545'],
    },
  },
  testnet: true,
};

async function checkAnvilConnection() {
  console.log('🔍 Verificando conexión con Anvil...');
  console.log(`URL: ${anvilChain.rpcUrls.default.http[0]}`);
  
  try {
    const publicClient = createPublicClient({
      chain: anvilChain,
      transport: http(),
    });

    // Intentar obtener el block number
    const blockNumber = await publicClient.getBlockNumber();
    console.log('✅ Conexión exitosa con Anvil');
    console.log(`📦 Block number: ${blockNumber}`);
    
    // Verificar chain ID
    const chainId = await publicClient.getChainId();
    console.log(`⛓️  Chain ID: ${chainId}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error de conexión con Anvil:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solución: Asegúrate de que Anvil esté ejecutándose:');
      console.log('   anvil --chain-id 31337 --port 8545');
    }
    
    return false;
  }
}

async function main() {
  console.log('=== Diagnóstico de Conexión Anvil ===\n');
  
  const isConnected = await checkAnvilConnection();
  
  if (!isConnected) {
    process.exit(1);
  }
  
  console.log('\n✅ Todo parece estar correctamente configurado');
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { checkAnvilConnection };