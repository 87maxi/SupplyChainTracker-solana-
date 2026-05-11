"use client";

import { useEffect, useState } from 'react';
import { contractRegistry } from '@/services/contract-registry.service';

// Componente de depuración para inspeccionar la instancia del servicio (Solana)
export default function DebugComponent() {
  const [diagnosticData, setDiagnosticData] = useState<any>(null);

   
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      console.log('🔍 Iniciando diagnóstico detallado (Solana)...');
      
      // Verificar registro
      const isRegistered = contractRegistry.has('SupplyChainTracker');
      console.log('📝 ¿Registrado en contractRegistry?', isRegistered);
      
      if (isRegistered) {
        const registryInstance = contractRegistry.get('SupplyChainTracker');
        console.log('🔗 Instancia del registro:', registryInstance);
      }
      
      console.log('✅ Diagnóstico completado');
      
      // Guardar datos para posible inspección en UI
      setDiagnosticData({
        registered: isRegistered,
        platform: 'solana'
      });
      
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  
  return (
    <div style={{display: 'none'}}>
      <pre>{diagnosticData && JSON.stringify(diagnosticData, null, 2)}</pre>
    </div>
  );
}