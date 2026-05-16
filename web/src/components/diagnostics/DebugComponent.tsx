"use client";

import { useEffect, useState } from 'react';

// Componente de depuración - Legacy contractRegistry removed
export default function DebugComponent() {
  const [diagnosticData, setDiagnosticData] = useState<any>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      console.log('🔍 Iniciando diagnóstico detallado (Solana)...');
      console.log('ℹ️ contractRegistry removed - use useSupplyChainService instead');
      
      console.log('✅ Diagnóstico completado');
      
      setDiagnosticData({
        registered: false,
        platform: 'solana',
        note: 'contractRegistry removed - use useSupplyChainService'
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
