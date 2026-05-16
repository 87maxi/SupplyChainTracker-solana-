// web/src/lib/diagnostics/service-debug.ts
// Diagnóstico de servicios - Legacy contractRegistry removed
// All services now use useSupplyChainService hook directly

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
   
  console.log(`[AUDIT] ${message}`, service ? `(${service})` : '', method ? `-> ${method}` : '', error ? `: ${error}` : '');
}

// Legacy service registry check removed - use useSupplyChainService instead
export function checkRegistration(retries = 0, delay = 0) {
  logAudit('ℹ️ contractRegistry removed - use useSupplyChainService instead');
}

export function diagnoseServiceInitialization() {
  logAudit('ℹ️ contractRegistry removed - use useSupplyChainService instead');
}

export function getAuditLog() {
  return serviceAuditLog;
}
