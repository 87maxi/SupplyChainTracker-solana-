// web/src/services/contract-registry.service.ts
// Sistema centralizado para registro y gestión de múltiples contratos inteligentes

import { BaseContractService } from './contracts/base-contract.service';

// Interfaz para la configuración de un contrato
export interface ContractConfig {
  address: `0x${string}`;
  abi: any;
  version?: string;
  deployBlock?: number;
}

// Registro central de contratos
export class ContractRegistry {
  private contracts = new Map<string, BaseContractService>();
  private config = new Map<string, ContractConfig>();

  // Registrar un contrato
  register(name: string, service: BaseContractService, config: ContractConfig) {
    this.contracts.set(name, service);
    this.config.set(name, config);
  }

  // Obtener un contrato por nombre
  get(name: string): BaseContractService | undefined {
    return this.contracts.get(name);
  }

  // Verificar si un contrato está registrado
  has(name: string): boolean {
    return this.contracts.has(name);
  }

  // Listar todos los contratos registrados
  list(): string[] {
    return Array.from(this.contracts.keys());
  }

  // Obtener la configuración de un contrato
  getConfig(name: string): ContractConfig | undefined {
    return this.config.get(name);
  }
}

// Instancia singleton
export const contractRegistry = new ContractRegistry();