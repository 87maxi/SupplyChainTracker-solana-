// web/src/services/contracts/role.service.ts
// Servicio para manejar operaciones de roles de acceso en SupplyChainTracker

import { BaseContractService } from './base-contract.service';
import { PublicClient, WalletClient, formatEther, parseEther } from 'viem';
import { Config, useAccount } from 'wagmi';
import { CacheService } from '@/lib/cache/cache-service';
import { ErrorHandler } from '@/lib/errors/error-handler';
import { ActivityLogger, logActivity } from '@/lib/activity-logger';
import { publicClient, getWalletClient } from '@/lib/blockchain/client';
import { anvil } from 'viem/chains';
import { ROLE_HASHES, RoleName } from '@/lib/constants/roles';

export type Role = RoleName;

// Enumeración para los estados de procesamiento
export enum ProcessingState {
  IDLE = 'idle',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error'
}

// Interfaz para los resultados de procesamiento
export interface ProcessingResult {
  success: boolean;
  message: string;
  txHash?: string;
}

/**
 * Servicio para manejar roles de acceso
 */
export class RoleService extends BaseContractService {
  private config: Config;
  private publicClient: PublicClient | null = null;
  private walletClient: WalletClient | null = null;
  private account: `0x${string}` | null = null;
  private readonly ROLE_NAMES = [
    'FABRICANTE',
    'AUDITOR_HW',
    'TECNICO_SW',
    'ESCUELA'
  ];

  // Estado para seguimiento
  private processingState: ProcessingState = ProcessingState.IDLE;
  private processingMessage: string = '';

  constructor(
    contractAddress: `0x${string}`,
    abi: any,
    config: Config,
    account?: `0x${string}`
  ) {
    super(contractAddress, abi);
    this.config = config;
    this.account = account ?? null;
    // Client initialization is handled by the base contract service
    // through the virtual readContract/writeContract methods
  }

  // Removed initializeClients method that was calling React hooks
  // Client initialization is now handled by the base contract service
  // The publicClient and walletClient are provided through the base service methods

  /**
   * Verifica si el usuario actual es administrador
   */
  async isAdmin(): Promise<boolean> {
    try {
      const { address } = useAccount({ config: this.config });
      if (!address) return false;

      const adminRole = ROLE_HASHES.ADMIN as `0x${string}`;
      const result = await this.read<boolean>(
        'hasRole',
        [adminRole, address]
      );
      return result;
    } catch (error) {
      console.error('Error verificando rol de administrador:', error);
      return false;
    }
  }

  /**
   * Verifica si una cuenta tiene un rol específico
   */
  async hasRole(address: `0x${string}`, role: Role): Promise<boolean> {
    try {
      const roleHash = ROLE_HASHES[role] as `0x${string}`;
      const result = await this.read<boolean>(
        'hasRole',
        [roleHash, address]
      );
      return result;
    } catch (error) {
      throw ErrorHandler.handleWeb3Error(error);
    }
  }

  /**
   * Obtiene todos los miembros de un rol
   */
  async getRoleMembers(role: Role): Promise<string[]> {
    try {
      const roleHash = ROLE_HASHES[role] as `0x${string}`;
      const result = await this.read<string[]>(
        'getAllMembers',
        [roleHash]
      );
      return result;
    } catch (error) {
      throw ErrorHandler.handleWeb3Error(error);
    }
  }

  /**
   * Asigna un rol a una cuenta
   */
  async grantRole(role: Role, account: `0x${string}`): Promise<ProcessingResult> {
    try {
      // ✓ Validar que tenemos una cuenta de admin configurada
      if (!this.account) {
        throw new Error('No hay cuenta configurada para ejecutar grantRole. Se requiere una cuenta con permisos de administrador.');
      }

      console.log('=== grantRole Debug ===', {
        executingAccount: this.account,  // Quien ejecuta (debe ser admin)
        targetAccount: account,           // Quien recibe el rol
        role,
        roleHash: ROLE_HASHES[role],
        contractAddress: this.contractAddress
      });

      this.setProcessingState(ProcessingState.PROCESSING, `Asignando rol ${role}...`);

      const roleHash = ROLE_HASHES[role] as `0x${string}`;

      const { hash } = await this.write(
        'grantRole',
        [roleHash, account],
        {
          role,
          account,
          action: 'grantRole'
        }
      );

      console.log('Transacción de asignación de rol enviada:', { hash });

      this.setProcessingState(ProcessingState.PROCESSING, `Esperando confirmación de red para ${role}...`);

      // Esperar confirmación de la transacción
      const receipt = await this.waitForTransaction(hash);
      console.log('Transacción confirmada:', receipt);

      this.setProcessingState(ProcessingState.SUCCESS, `Rol ${role} asignado exitosamente`);

      // Registrar actividad
      logActivity({
        type: 'role_change',
        action: 'grant_role',
        description: `Asignado rol ${role} a ${account}`,
        address: account,
        status: 'success',
        metadata: { role }
      });

      return {
        success: true,
        message: `Rol ${role} asignado exitosamente`,
        txHash: hash
      };
    } catch (error) {
      const errorObj = ErrorHandler.handleWeb3Error(error);
      this.setProcessingState(ProcessingState.ERROR, `Error: ${errorObj.message}`);

      console.error('Error detallado en grantRole:', error);
      console.error('Contexto de la falla:', {
        functionName: 'grantRole',
        role,
        account,
        roleHash: ROLE_HASHES[role],
        errorObj
      });

      return {
        success: false,
        message: errorObj.message
      };
    }
  }

  /**
   * Revoca un rol de una cuenta
   */
  async revokeRole(role: Role, account: `0x${string}`): Promise<ProcessingResult> {
    try {
      console.log('Intentando revocar rol:', {
        role,
        account,
        roleHash: ROLE_HASHES[role],
        contractAddress: this.contractAddress
      });

      this.setProcessingState(ProcessingState.PROCESSING, `Revocando rol ${role}...`);

      const roleHash = ROLE_HASHES[role] as `0x${string}`;

      const { hash } = await this.write(
        'revokeRole',
        [roleHash, account],
        {
          role,
          account,
          action: 'revokeRole'
        }
      );

      console.log('Transacción de revocación de rol enviada:', { hash });

      this.setProcessingState(ProcessingState.PROCESSING, `Esperando confirmación de red para revocar ${role}...`);

      // Esperar confirmación de la transacción
      const receipt = await this.waitForTransaction(hash);
      console.log('Transacción de revocación confirmada:', receipt);

      this.setProcessingState(ProcessingState.SUCCESS, `Rol ${role} revocado exitosamente`);

      // Registrar actividad
      logActivity({
        type: 'role_change',
        action: 'revoke_role',
        description: `Revocado rol ${role} de ${account}`,
        address: account,
        status: 'success',
        metadata: { role }
      });

      return {
        success: true,
        message: `Rol ${role} revocado exitosamente`,
        txHash: hash
      };
    } catch (error) {
      const errorObj = ErrorHandler.handleWeb3Error(error);
      this.setProcessingState(ProcessingState.ERROR, `Error: ${errorObj.message}`);

      console.error('Error detallado en revokeRole:', error);
      console.error('Contexto de la falla:', {
        functionName: 'revokeRole',
        role,
        account,
        roleHash: ROLE_HASHES[role],
        errorObj
      });

      return {
        success: false,
        message: errorObj.message
      };
    }
  }

  /**
   * Obtiene información del cliente de wallet para debugging
   */
  async getWalletClientDebugInfo(account?: `0x${string}`) {
    try {
      const walletClient = account
        ? await getWalletClient(account)
        : await getWalletClient();

      return {
        hasClient: !!walletClient,
        hasWriteContract: !!walletClient?.writeContract,
        hasAccount: !!walletClient?.account,
        accountAddress: walletClient?.account?.address,
        chainId: walletClient?.chain?.id,
        transport: walletClient?.transport?.name
      };
    } catch (error) {
      console.error('Error getting wallet client debug info:', error);
      return null;
    }
  }

  /**
   * Establece el estado de procesamiento
   */
  private setProcessingState(state: ProcessingState, message: string) {
    this.processingState = state;
    this.processingMessage = message;
  }

  /**
   * Obtiene el estado actual de procesamiento
   */
  getProcessingState() {
    return {
      state: this.processingState,
      message: this.processingMessage
    };
  }

  /**
   * Reinicia el estado de procesamiento
   */
  resetProcessing() {
    this.setProcessingState(ProcessingState.IDLE, '');
  }

  // Implementaciones necesarias de BaseContractService

  protected async readContract({
    address,
    abi,
    functionName,
    args
  }: {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args: any[];
  }) {
    // Usamos el cliente público del contexto global
    return await publicClient.readContract({
      address,
      abi,
      functionName,
      args
    });
  }

  protected async writeContract({
    address,
    abi,
    functionName,
    args
  }: {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args: any[];
  }): Promise<`0x${string}`> {
    // Validamos que todos los parámetros requeridos estén presentes
    if (!this.account) {
      throw new Error('Cuenta no disponible. Debe proporcionar una cuenta para operaciones de escritura');
    }

    if (!address) {
      throw new Error('Dirección del contrato no disponible');
    }

    if (!abi) {
      throw new Error('ABI no disponible');
    }

    if (!functionName) {
      throw new Error('Nombre de función no disponible');
    }

    // Creamos el cliente de wallet con la cuenta
    const walletClient = await getWalletClient(this.account);

    if (!walletClient) {
      throw new Error('No se pudo crear el cliente de wallet');
    }

    // Validamos que el walletClient tenga la capacidad de writeContract
    if (!walletClient.writeContract) {
      throw new Error('El cliente de wallet no tiene el método writeContract');
    }

    // Log para debugging del estado del cliente
    // Log detallado para debugging del estado del cliente
    console.log('=== Wallet Client Debug Info ===', {
      walletClientType: typeof walletClient,
      hasWriteContract: !!walletClient.writeContract,
      writeContractType: typeof walletClient.writeContract,
      hasAccount: !!walletClient.account,
      accountAddress: walletClient.account?.address,
      accountType: typeof walletClient.account,
      chainId: walletClient.chain?.id,
      transport: walletClient.transport?.name,
      functionName,
      argsLength: args?.length ?? 0,
      argsType: typeof args,
      args: args ?? []
    });

    // Validación adicional de parámetros
    if (!args || !Array.isArray(args)) {
      console.error('Parámetros de contrato no válidos:', args);
      throw new Error('Parámetros de contrato deben ser un array válido');
    }

    // Validación específica por función
    if (functionName === 'grantRole' || functionName === 'revokeRole') {
      if (args.length !== 2) {
        console.error(`Número incorrecto de parámetros para ${functionName}:`, args);
        throw new Error(`Se requieren exactamente 2 parámetros para ${functionName}`);
      }

      // Validamos que los hashes de roles sean válidos
      if (!args[0] || typeof args[0] !== 'string' || !args[0].startsWith('0x')) {
        throw new Error('Hash de rol inválido');
      }

      // Validamos que la dirección sea válida
      if (!args[1] || typeof args[1] !== 'string' || !args[1].startsWith('0x') || args[1].length !== 42) {
        throw new Error('Dirección inválida');
      }
    }

    // Validación adicional de que el cliente de wallet está completamente inicializado
    if (!walletClient || !walletClient.writeContract) {
      throw new Error('Cliente de wallet no disponible o sin método writeContract');
    }

    try {
      console.log('=== writeContract params ===', {
        address,
        functionName,
        args: args ?? [],
        walletClientExists: !!walletClient,
        writeContractExists: !!walletClient.writeContract,
        accountAddress: walletClient.account?.address
      });

      const hash = await walletClient.writeContract({
        address,
        abi,
        functionName,
        args: args || [],
        chain: anvil,
        account: this.account as `0x${string}`
      });

      console.log('Transacción exitosa:', {
        transactionHash: hash,
        functionName,
        args
      });

      return hash;
    } catch (error) {
      console.error('Error en writeContract:', {
        error,
        functionName,
        args,
        address,
        hasWalletClient: !!walletClient,
        hasWriteContract: !!walletClient?.writeContract
      });
      throw error;
    }
  }


  protected async waitForTransactionReceipt({
    hash,
    timeout
  }: {
    hash: `0x${string}`;
    timeout: number;
  }) {
    // Usamos el cliente público del contexto global
    return await publicClient.waitForTransactionReceipt({
      hash,
      timeout
    });
  }

  protected async getAddress(): Promise<string> {
    return this.account || '0x0000000000000000000000000000000000000000';
  }

  // Métodos adicionales específicos del servicio de roles
}