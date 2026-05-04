// web/src/lib/wagmi/config.ts
// Configuración simplificada de Wagmi - Solo para gestión de wallet
// Las operaciones blockchain se manejan through el cliente unificado en lib/blockchain

import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';

// Configuración mínima para desarrollo local con Anvil
export const config = createConfig({
  chains: [{
    id: 31337,
    name: 'Anvil Local',
    network: 'anvil',
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    rpcUrls: {
      default: { http: ['http://localhost:8545'] },
      public: { http: ['http://localhost:8545'] },
    },
    testnet: true,
  }],
  
  // Solo connectors esenciales para desarrollo
  connectors: [
    injected(), // Soporta MetaMask, Rabby y otras wallets injectadas
  ],
  
  // Configuración mínima de transporte
  transports: {
    31337: http('http://localhost:8545'),
  },
  
  ssr: false, // Mejor performance para desarrollo
});