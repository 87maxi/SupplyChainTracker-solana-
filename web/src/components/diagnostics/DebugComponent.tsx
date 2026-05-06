"use client";

import { useEffect, useState } from 'react';
import { SupplyChainService } from '@/services/SupplyChainService';
import { contractRegistry } from '@/services/contract-registry.service';

// Componente de depuración para inspeccionar la instancia del servicio
export default function DebugComponent() {
  const [diagnosticData, setDiagnosticData] = useState<any>(null);

  useEffect(() => {
    try {
      // Obtener instancia singleton
      const instance = SupplyChainService.getInstance();
      
      // Verificar propiedades básicas
      const hasService = !!instance;
      const isSingleton = instance === SupplyChainService.getInstance();
      
      // Verificar métodos disponibles
      const hasRegisterNetbook = typeof instance?.registerNetbook === 'function';
      const hasAuditHardware = typeof instance?.auditHardware === 'function';
      const hasValidateSoftware = typeof instance?.validateSoftware === 'function';
      const hasAssignToStudent = typeof instance?.assignToStudent === 'function';
      const hasHasRole = typeof instance?.hasRole === 'function';
      
      // Verificar registro
      const isRegistered = contractRegistry.has('SupplyChainTracker');
      
      // Guardar datos para posible inspección en UI
      setDiagnosticData({
        instance: hasService ? 'presente' : 'nula',
        singleton: isSingleton,
        hasRegisterNetbook,
        hasAuditHardware,
        hasValidateSoftware,
        hasAssignToStudent,
        hasHasRole,
        registered: isRegistered
      });
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error en diagnóstico:', error);
    }
  }, []);
  
  return (
    <div style={{display: 'none'}}>
      <pre>{diagnosticData && JSON.stringify(diagnosticData, null, 2)}</pre>
    </div>
  );
}
