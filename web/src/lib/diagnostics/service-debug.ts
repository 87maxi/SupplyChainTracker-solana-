// web/src/lib/diagnostics/service-debug.ts
// Diagnóstico de servicios para identificar problemas de inicialización
// Legacy Ethereum-based diagnostics - migrated to Solana

import { serviceRegistry } from '@/services/contract-registry.service';

// Interface para la configuración del servicio (Solana)
interface ServiceConfig {
  programId: string;
  version: string;
}

// Registro para auditoría
const serviceAuditLog: Array<{
  timestamp: Date;
  message: string;
  service?: string;
  method?: string;
  error?: unknown;
}> = [];

// Función para registrar auditorías
function logAudit(message: string, service?: string, method?: string, error?: unknown) {
  const entry = {
    timestamp: new Date(),
    message,
    service,
    method,
    error
  };
  serviceAuditLog.push(entry);
  // eslint-disable-next-line no-console
  console.log(`[AUDIT] ${message}`, service ? `(${service})` : '', method ? `-> ${method}` : '', error ? `: ${error}` : '');
}

// Retry mechanism for service registry check
function checkRegistration(retries = 5, delay = 1000) {
  const check = () => {
    if (retries <= 0) {
      logAudit('❌ SupplyChainTracker no está registrado en serviceRegistry después de varios intentos');
      return;
    }
    
    const hasSupplyChain = serviceRegistry.has('SupplyChainTracker');
    if (!hasSupplyChain) {
      retries--;
      logAudit(`Intento ${6-retries}/5: SupplyChainTracker aún no registrado. Reintentando en ${delay}ms...`);
      setTimeout(check, delay);
    } else {
      logAudit('✅ SupplyChainTracker está registrado en serviceRegistry');
      
      const config = serviceRegistry.getConfig('SupplyChainTracker');
      if (config) {
        logAudit(`✅ Program ID: ${config.programId}`, 'ServiceRegistry');
        logAudit(`✅ Versión: ${config.version}`, 'ServiceRegistry');
      }
    }
  };
  
  setTimeout(check, delay);
}

// Inicialización principal del sistema de diagnóstico
function initializeDiagnostics() {
  logAudit('Iniciando sistema de diagnóstico');
  
  try {
    // Verificar registro de servicios
    logAudit('Verificando registro de servicios');
    
    // Iniciar verificación con reintento
    checkRegistration();
    
    logAudit('✅ Sistema de diagnóstico inicializado correctamente');
  }
  catch (error) {
    logAudit('❌ Error durante la inicialización del sistema de diagnóstico', 'Diagnostics', 'initializeDiagnostics', error);
  }
}

// Función para obtener el log de auditoría
function getAuditLog() {
  return serviceAuditLog;
}

// Función para limpiar el log de auditoría
function clearAuditLog() {
  serviceAuditLog.length = 0;
}

// Ejecutar diagnóstico si este módulo se importa directamente
if (typeof window !== 'undefined') {
  initializeDiagnostics();
}

export {
  initializeDiagnostics,
  getAuditLog,
  clearAuditLog,
  serviceAuditLog
};
