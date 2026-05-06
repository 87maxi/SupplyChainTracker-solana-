// web/src/services/contract-registry.service.ts
// Sistema centralizado para registro y gestión de servicios
// Legacy Ethereum-based registry - migrated to Solana (useSupplyChainService)

import { BaseContractService } from './contracts/base-contract.service';

// Interfaz para la configuración de un servicio (Solana)
export interface ServiceConfig {
  programId: string;
  version?: string;
}

// Registro central de servicios
export class ServiceRegistry {
  private services = new Map<string, BaseContractService>();
  private config = new Map<string, ServiceConfig>();

  // Registrar un servicio
  register(name: string, service: BaseContractService, config: ServiceConfig) {
    this.services.set(name, service);
    this.config.set(name, config);
  }

  // Obtener un servicio por nombre
  get(name: string): BaseContractService | undefined {
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
