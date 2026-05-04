"use client";

import { useEffect, useState } from 'react';
import { SupplyChainService } from '@/services/SupplyChainService';
import { contractRegistry } from '@/services/contract-registry.service';

// Componente de depuración para inspeccionar la instancia del servicio
export default function DebugComponent() {
  const [diagnosticData, setDiagnosticData] = useState<any>(null);

  useEffect(() => {
    try {
      console.log('🔍 Iniciando diagnóstico detallado...');
      
      // Obtener instancia singleton
      const instance = SupplyChainService.getInstance();
      console.log('🎯 Instancia obtenida:', instance);
      
      // Verificar propiedades básicas
      console.log('🏠 contractAddress:', instance.contractAddress);
      console.log('📋 abi:', instance.abi ? 'presente' : 'falta');
      console.log('🔖 cachePrefix:', instance.cachePrefix);
      
      // Verificar métodos
      console.log('🔧 ¿readContract es función?', typeof instance.readContract === 'function');
      console.log('📝 ¿writeContract es función?', typeof instance.writeContract === 'function');
      console.log('⏳ ¿waitForTransactionReceipt es función?', typeof instance.waitForTransactionReceipt === 'function');
      console.log('📍 ¿getAddress es función?', typeof instance.getAddress === 'function');
      
      // Verificar prototipo
      console.log('🧪 Prototipo de readContract:', Object.getPrototypeOf(instance).hasOwnProperty('readContract'));
      
      // Verificar herencia
      console.log('👨‍👦 ¿Instancia de SupplyChainService?', instance instanceof SupplyChainService);
      console.log('🧬 ¿Instancia de BaseContractService?', instance instanceof (BaseContractService as any));
      
      // Verificar registro
      const isRegistered = contractRegistry.has('SupplyChainTracker');
      console.log('📝 ¿Registrado en contractRegistry?', isRegistered);
      
      if (isRegistered) {
        const registryInstance = contractRegistry.get('SupplyChainTracker');
        console.log('🔗 ¿Misma instancia que en registro?', instance === registryInstance);
      }
      
      // Intentar llamar a un método para forzar el error
      console.log('💥 Intentando método que causa error...');
      try {
        // Usar un método que eventualmente llama a readContract
        instance.read('getRoleByName', ['ADMIN']).catch(console.error);
      } catch (error) {
        console.error('❌ Error al intentar método:', error);
      }
      
      console.log('✅ Diagnóstico completado');
      
      // Guardar datos para posible inspección en UI
      setDiagnosticData({
        instance: instance ? 'presente' : 'nula',
        contractAddress: instance?.contractAddress,
        hasReadContract: typeof instance?.readContract === 'function',
        registered: isRegistered
      });
      
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
    }
  }, []);
  
  return (
    <div style={{display: 'none'}}>
      <pre>{diagnosticData && JSON.stringify(diagnosticData, null, 2)}</pre>
    </div>
  );
}

// Importar BaseContractService para la verificación de instancia
import { BaseContractService } from '@/services/contracts/base-contract.service';