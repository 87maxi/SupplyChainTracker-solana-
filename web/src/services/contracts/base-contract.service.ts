"use client";

// web/src/services/contracts/base-contract.service.ts
// Base contract service for blockchain interactions

import { PublicClient, WalletClient, formatEther, parseEther } from 'viem';
import { Config, useAccount, useConnect, useDisconnect } from 'wagmi';
import { useCallback, useEffect } from 'react';
import { CacheService } from '@/lib/cache/cache-service';
import { ErrorHandler } from '@/lib/errors/error-handler';
import { safeJsonStringify } from '@/lib/utils';

/**
 * Clase base para servicios de contratos inteligentes
 * Proporciona funcionalidad común para todos los servicios de contratos
 */
export class BaseContractService {
  protected contractAddress: `0x${string}`;
  protected abi: any;
  protected cachePrefix: string;
  protected transactionTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(contractAddress: `0x${string}`, abi: any, cachePrefix: string = 'contract') {
    this.contractAddress = contractAddress;
    this.abi = abi;
    this.cachePrefix = cachePrefix;
  }

  /**
   * Same initialization method as in the old version
   */
  initializeContract(contractAddress: `0x${string}`, abi: any) {
    this.contractAddress = contractAddress;
    this.abi = abi;
  }

  /**
   * Realiza una llamada de lectura al contrato
   * @param functionName Nombre de la función del contrato
   * @param args Argumentos para la función
   * @param useCache Si se debe usar caché (por defecto: true)
   * @returns Resultado de la llamada
   */
  read = async <T>(functionName: string, args: any[] = [], useCache = true): Promise<T> => {
    const cacheKey = `${this.cachePrefix}:${functionName}:${safeJsonStringify(args)}`;

    // Intentar obtener de caché si está habilitado
    if (useCache) {
      const cached = CacheService.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    try {
      // Usar wagmi para lectura
      const result = await this.readContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName,
        args
      });

      // Almacenar en caché si está habilitado
      if (useCache) {
        CacheService.set(cacheKey, result);
      }

      return result as T;
    } catch (error) {
      throw ErrorHandler.handleWeb3Error(error);
    }
  }

  /**
   * Lee del contrato usando caché si está disponible
   * @param cacheKey Clave de caché
   * @param fetcher Función para obtener datos si no hay caché
   * @returns Datos obtenidos
   */
  protected async readCacheable<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
    const fullKey = `${this.cachePrefix}:${cacheKey}`;
    const cached = CacheService.get<T>(fullKey);
    if (cached !== null) return cached;

    const result = await fetcher();
    CacheService.set(fullKey, result);
    return result;
  }

  /**
   * Realiza una llamada de escritura al contrato
   * @param functionName Nombre de la función del contrato
   * @param args Argumentos para la función
   * @returns Hash de la transacción
   */
  write = async (functionName: string, args: any[] = [], metadata?: Record<string, any>) => {
    try {
      // Usar wagmi para escritura
      const hash = await this.writeContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName,
        args
      });

      // Log transaction
      this.logTransactionToAPI(Object.assign({
        transactionHash: hash,
        functionName,
        args,
        from: await this.getAddress()
      }, metadata)).catch(error => {
        console.error('Error logging transaction via API:', error);
      });

      return { hash };
    } catch (error) {
      throw ErrorHandler.handleWeb3Error(error);
    }
  }

  /**
   * Espera a que una transacción sea confirmada
   * @param hash Hash de la transacción
   * @param timeout Tiempo máximo de espera en segundos (por defecto: 60)
   * @returns Recibo de la transacción
   */
  waitForTransaction = async (
    hash: `0x${string}`,
    timeout = 60
  ) => {
    try {
      const receipt = await this.waitForTransactionReceipt({
        hash,
        timeout: timeout * 1000
      });

      // Update transaction status
      this.updateTransactionInAPI({
        transactionHash: hash,
        status: 'success',
        blockNumber: Number(receipt.blockNumber),
        gasUsed: Number(receipt.gasUsed)
      }).catch(error => {
        console.error('Error updating transaction via API:', error);
      });

      return receipt;
    } catch (error) {
      this.updateTransactionInAPI({
        transactionHash: hash,
        status: 'failed'
      }).catch(error => {
        console.error('Error updating transaction status to failed:', error);
      });

      throw ErrorHandler.handleWeb3Error(error);
    }
  }

  /**
   * Invalida la caché para una clave específica
   * @param keyPart Parte de la clave a invalidar
   */
  invalidateCache = (keyPart: string): void => {
    try {
      Object.keys(localStorage)
        .filter(key => key.includes(this.cachePrefix) && key.includes(keyPart))
        .forEach(key => CacheService.remove(key));
    } catch (error) {
      console.warn('Error al invalidar caché:', error);
    }
  }

  /**
   * Invalida toda la caché relacionada con este servicio
   */
  invalidateAllCache = (): void => {
    try {
      Object.keys(localStorage)
        .filter(key => key.includes(this.cachePrefix))
        .forEach(key => CacheService.remove(key));
    } catch (error) {
      console.warn('Error al invalidar caché completa:', error);
    }
  }

  // Wagmi hook wrappers - these will be overridden by specific service implementations
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
  }): Promise<any> {
    throw new Error('readContract must be implemented by specific service');
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
    throw new Error('writeContract must be implemented by specific service');
  }

  protected async waitForTransactionReceipt({
    hash,
    timeout
  }: {
    hash: `0x${string}`;
    timeout: number;
  }): Promise<any> {
    throw new Error('waitForTransactionReceipt must be implemented by specific service');
  }

  protected async getAddress(): Promise<string> {
    throw new Error('getAddress must be implemented by specific service');
  }

  // Optional background operations that can be overridden
  protected logTransactionToAPI = async (data: any): Promise<void> => {
    // Default implementation - override in specific services if needed
    console.log('Transaction logged:', data);
  }

  protected updateTransactionInAPI = async (data: any): Promise<void> => {
    // Default implementation - override in specific services if needed
    console.log('Transaction updated:', data);
  }
}
