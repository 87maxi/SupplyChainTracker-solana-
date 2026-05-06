// web/src/services/contract-registry.service.ts
// Sistema centralizado para registro y gestión de servicios
// @deprecated Legacy Ethereum-based registry - migrated to Solana (useSupplyChainService)
// This file is kept for backward compatibility but all functionality has been removed.

// Interfaz para la configuración de un servicio (Solana)
export interface ServiceConfig {
  programId: string;
  version?: string;
}

// Registro central de servicios - Legacy Ethereum service registry removed
export class ServiceRegistry {
  private services = new Map<string, unknown>();
  private config = new Map<string, ServiceConfig>();

  // Registrar un servicio
  register(name: string, service: unknown, config: ServiceConfig) {
    this.services.set(name, service);
    this.config.set(name, config);
  }

  // Obtener un servicio por nombre
  get(name: string): unknown {
    return this.services.get(name);
  }

  // Verificar si un servicio está registrado
  has(name: string): boolean {
    return this.services.has(name);
  }

  // Listar todos los servicios registrados
  list(): string[] {
    return Array.from(this.services.keys());
  }

  // Obtener la configuración de un servicio
  getConfig(name: string): ServiceConfig | undefined {
    return this.config.get(name);
  }
}

// Instancia singleton
export const serviceRegistry = new ServiceRegistry();

// Legacy export for backward compatibility
export const contractRegistry = serviceRegistry;
