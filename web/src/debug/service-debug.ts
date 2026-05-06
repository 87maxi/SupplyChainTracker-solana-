// web/src/debug/service-debug.ts
// Debug utilities for SupplyChainService

import { SupplyChainService } from '@/services/SupplyChainService';

export const debugServiceInitialization = () => {
  console.log('🔍 Iniciando debug del servicio SupplyChainService');
  
  try {
    // Intentar obtener la instancia
    const service = SupplyChainService.getInstance();
    console.log('✅ Instancia obtenida:', service);
    
    // Verificar los métodos clave
    console.log('📋 Métodos disponibles:');
    console.log('   - readContract:', typeof service['readContract']);
    console.log('   - writeContract:', typeof service['writeContract']);
    console.log('   - waitForTransactionReceipt:', typeof service['waitForTransactionReceipt']);
    console.log('   - getAddress:', typeof service['getAddress']);
    
    // Verificar si los métodos son funciones
    const methods = ['readContract', 'writeContract', 'waitForTransactionReceipt', 'getAddress'];
    methods.forEach(method => {
      const methodFn = (service as any)[method];
      if (typeof methodFn === 'function') {
        console.log(`✅ ${method}: Es una función`);
      } else {
        console.log(`❌ ${method}: No es una función, tipo: ${typeof methodFn}`);
      }
    });
    
    // Verificar la jerarquía de clases
    console.log('\n🧱 Jerarquía de clases:');
    console.log('   - Instancia de SupplyChainService:', service instanceof SupplyChainService);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    console.log('   - Instancia de BaseContractService:', service instanceof (require('@/services/contracts/base-contract.service').BaseContractService));
    
    return service;
  } catch (error) {
    console.error('❌ Error al inicializar el servicio:', error);
    return null;
  }
};

// Ejecutar debug al cargar el módulo
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 Inicializando debug de servicio...');
  setTimeout(() => {
    debugServiceInitialization();
  }, 1000);
}
