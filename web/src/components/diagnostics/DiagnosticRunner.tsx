"use client";

import { useEffect } from 'react';
import { contractRegistry } from '@/services/contract-registry.service';

// Componente para ejecutar diagnósticos y verificar el estado del servicio (Solana)
export default function DiagnosticRunner() {
  useEffect(() => {
    console.log('--- Inicio de Diagnóstico (Solana) ---');
    
    // Verificar registro
    console.log('¿Está registrado en contractRegistry?', contractRegistry.has('SupplyChainTracker'));
    
    // Intentar obtener instancia del registro
    const registryInstance = contractRegistry.get('SupplyChainTracker');
    console.log('¿Instancia del registro existe?', registryInstance !== undefined);
    
    console.log('--- Fin de Diagnóstico (Solana) ---');
  }, []);
  
  return null;
}