"use client";

import { useEffect } from 'react';
import { contractRegistry } from '@/services/contract-registry.service';
import { SupplyChainService } from '@/services/SupplyChainService';

// Componente para ejecutar diagnósticos y verificar el estado del servicio
export default function DiagnosticRunner() {
  useEffect(() => {
    console.log('--- Inicio de Diagnóstico ---');
    
    // Verificar instancia singleton
    const instance1 = SupplyChainService.getInstance();
    const instance2 = SupplyChainService.getInstance();
    
    console.log('¿Singleton correcto?', instance1 === instance2);
    
    // Verificar tipo de instancia
    console.log('¿Es instancia de SupplyChainService?', instance1 instanceof SupplyChainService);
    console.log('¿Es instancia de BaseContractService?', instance1 instanceof (BaseContractService as any));
    
    // Verificar métodos
    console.log('¿Tiene método readContract?', typeof instance1.readContract === 'function');
    
    // Verificar registro
    console.log('¿Está registrado en contractRegistry?', contractRegistry.has('SupplyChainTracker'));
    
    // Intentar obtener instancia del registro
    const registryInstance = contractRegistry.get('SupplyChainTracker');
    console.log('¿Instancia del registro existe?', registryInstance !== undefined);
    console.log('¿Instancia del registro es la misma?', instance1 === registryInstance);
    
    console.log('--- Fin de Diagnóstico ---');
  }, []);
  
  return null;
}

// Importar BaseContractService para la verificación de instancia
import { BaseContractService } from '@/services/contracts/base-contract.service';