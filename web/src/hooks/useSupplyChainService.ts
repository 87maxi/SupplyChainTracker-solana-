// web/src/hooks/useSupplyChainService.ts
// Migrated to Solana - uses SolanaSupplyChainService and useSolanaWeb3
import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { SolanaSupplyChainService, TransactionResult, NetbookInfo } from '@/services/SolanaSupplyChainService';
import { useSolanaWeb3 } from '@/hooks/useSolanaWeb3';

// Netbook state constants
export const NetbookState = {
  Fabricada: 0,
  HwAprobado: 1,
  SwValidado: 2,
  Distribuida: 3,
} as const;

export type NetbookStateType = typeof NetbookState[keyof typeof NetbookState];

export const useSupplyChainService = () => {
  const { publicKey } = useWallet();
  const { sendTransaction, transactionLoading } = useSolanaWeb3();
  
  // Helper to get current user's public key
  const getUserPublicKey = useCallback((): PublicKey | null => {
    if (!publicKey) return null;
    return publicKey;
  }, [publicKey]);

  // Helper to create error result
  const errorResult = (message: string): TransactionResult => ({
    signature: '',
    success: false,
    error: message
  });

  // Helper to create success result
  const successResult = (signature: string): TransactionResult => ({
    signature,
    success: true
  });

  // Register netbook
  const registerNetbook = useCallback(async (
    serial: string,
    batchId: string,
    modelSpecs: string
  ): Promise<TransactionResult> => {
    const userPubkey = getUserPublicKey();
    if (!userPubkey) {
      return errorResult('Wallet not connected');
    }

    try {
      const service = SolanaSupplyChainService.getInstance();
      const result = await service.registerNetbook(serial, batchId, modelSpecs);
      return result;
    } catch (error: any) {
      return errorResult(error.message || 'Failed to register netbook');
    }
  }, [getUserPublicKey]);

  // Batch register netbooks
  const registerNetbooks = useCallback(async (
    serials: string[],
    batches: string[],
    specs: string[],
    metadata: string[]
  ): Promise<TransactionResult> => {
    const userPubkey = getUserPublicKey();
    if (!userPubkey) {
      return errorResult('Wallet not connected');
    }

    try {
      const service = SolanaSupplyChainService.getInstance();
      const result = await service.registerNetbooks(serials, batches, specs, metadata, userPubkey);
      return result;
    } catch (error: any) {
      return errorResult(error.message || 'Failed to register netbooks');
    }
  }, [getUserPublicKey]);

  // Audit hardware
  const auditHardware = useCallback(async (
    serial: string,
    passed: boolean,
    reportHash: string,
    _metadata?: string
  ): Promise<TransactionResult> => {
    const userPubkey = getUserPublicKey();
    if (!userPubkey) {
      return errorResult('Wallet not connected');
    }

    try {
      // Convert hash string to bytes
      let hashBytes: number[];
      if (reportHash.startsWith('0x')) {
        const hex = reportHash.slice(2);
        hashBytes = Array.from({ length: hex.length / 2 }, (_, i) => 
          parseInt(hex.substr(i * 2, 2), 16)
        );
      } else {
        hashBytes = Array.from({ length: reportHash.length / 2 }, (_, i) => 
          parseInt(reportHash.substr(i * 2, 2), 16)
        );
      }
      while (hashBytes.length < 32) hashBytes.unshift(0);
      if (hashBytes.length > 32) hashBytes = hashBytes.slice(0, 32);

      const service = SolanaSupplyChainService.getInstance();
      const result = await service.auditHardware(serial, passed, hashBytes);
      return result;
    } catch (error: any) {
      return errorResult(error.message || 'Failed to audit hardware');
    }
  }, [getUserPublicKey]);

  // Validate software
  const validateSoftware = useCallback(async (
    serial: string,
    osVersion: string,
    passed: boolean,
    _metadata?: string
  ): Promise<TransactionResult> => {
    const userPubkey = getUserPublicKey();
    if (!userPubkey) {
      return errorResult('Wallet not connected');
    }

    try {
      const service = SolanaSupplyChainService.getInstance();
      const result = await service.validateSoftware(serial, osVersion, passed);
      return result;
    } catch (error: any) {
      return errorResult(error.message || 'Failed to validate software');
    }
  }, [getUserPublicKey]);

  // Assign to student
  const assignToStudent = useCallback(async (
    serial: string,
    schoolHash: string,
    studentHash: string,
    _metadata?: string
  ): Promise<TransactionResult> => {
    const userPubkey = getUserPublicKey();
    if (!userPubkey) {
      return errorResult('Wallet not connected');
    }

    try {
      const parseHash = (hash: string): number[] => {
        let hex = hash;
        if (hex.startsWith('0x')) hex = hex.slice(2);
        const bytes = Array.from({ length: hex.length / 2 }, (_, i) => 
          parseInt(hex.substr(i * 2, 2), 16)
        );
        while (bytes.length < 32) bytes.unshift(0);
        return bytes.slice(0, 32);
      };

      const service = SolanaSupplyChainService.getInstance();
      const result = await service.assignToStudent(serial, parseHash(schoolHash), parseHash(studentHash));
      return result;
    } catch (error: any) {
      return errorResult(error.message || 'Failed to assign to student');
    }
  }, [getUserPublicKey]);

  // Grant role
  const grantRole = useCallback(async (
    role: string,
    targetAddress: string
  ): Promise<TransactionResult> => {
    const userPubkey = getUserPublicKey();
    if (!userPubkey) {
      return errorResult('Wallet not connected');
    }

    try {
      const targetPubkey = new PublicKey(targetAddress);
      const service = SolanaSupplyChainService.getInstance();
      const result = await service.grantRole(role, targetPubkey);
      return result;
    } catch (error: any) {
      return errorResult(error.message || 'Failed to grant role');
    }
  }, [getUserPublicKey]);

  // Revoke role
  const revokeRole = useCallback(async (
    role: string,
    targetAddress: string
  ): Promise<TransactionResult> => {
    const userPubkey = getUserPublicKey();
    if (!userPubkey) {
      return errorResult('Wallet not connected');
    }

    try {
      const targetPubkey = new PublicKey(targetAddress);
      const service = SolanaSupplyChainService.getInstance();
      const result = await service.revokeRole(role, targetPubkey);
      return result;
    } catch (error: any) {
      return errorResult(error.message || 'Failed to revoke role');
    }
  }, [getUserPublicKey]);

  // Request role
  const requestRole = useCallback(async (
    role: string
  ): Promise<TransactionResult> => {
    const userPubkey = getUserPublicKey();
    if (!userPubkey) {
      return errorResult('Wallet not connected');
    }

    try {
      const service = SolanaSupplyChainService.getInstance();
      const result = await service.requestRole(role);
      return result;
    } catch (error: any) {
      return errorResult(error.message || 'Failed to request role');
    }
  }, [getUserPublicKey]);

  // Approve role request
  const approveRoleRequest = useCallback(async (
    userAddress: string
  ): Promise<TransactionResult> => {
    const userPubkey = getUserPublicKey();
    if (!userPubkey) {
      return errorResult('Wallet not connected');
    }

    try {
      const targetPubkey = new PublicKey(userAddress);
      const service = SolanaSupplyChainService.getInstance();
      // Use a placeholder request ID - this should be updated based on actual request ID
      const result = await service.approveRoleRequest(0, targetPubkey);
      return result;
    } catch (error: any) {
      return errorResult(error.message || 'Failed to approve role request');
    }
  }, [getUserPublicKey]);

  // Reject role request
  const rejectRoleRequest = useCallback(async (
    userAddress: string
  ): Promise<TransactionResult> => {
    const userPubkey = getUserPublicKey();
    if (!userPubkey) {
      return errorResult('Wallet not connected');
    }

    try {
      const service = SolanaSupplyChainService.getInstance();
      // Use a placeholder request ID - this should be updated based on actual request ID
      const result = await service.rejectRoleRequest(0);
      return result;
    } catch (error: any) {
      return errorResult(error.message || 'Failed to reject role request');
    }
  }, [getUserPublicKey]);

  // Check if user has role
  const hasRole = useCallback(async (role: string, userAddress: string): Promise<boolean> => {
    try {
      const pubkey = new PublicKey(userAddress);
      const service = SolanaSupplyChainService.getInstance();
      return await service.hasRole(role, pubkey);
    } catch {
      return false;
    }
  }, []);

  // Check if user has role by hash (backward compatibility)
  const hasRoleByHash = useCallback(async (roleName: string, userAddress: string): Promise<boolean> => {
    return hasRole(roleName, userAddress);
  }, [hasRole]);

  // Get account balance
  const getAccountBalance = useCallback(async (userAddress: string): Promise<number> => {
    try {
      const pubkey = new PublicKey(userAddress);
      const service = SolanaSupplyChainService.getInstance();
      return await service.getAccountBalance(pubkey);
    } catch {
      return 0;
    }
  }, []);

  // Get all roles summary
  const getAllRolesSummary = useCallback(async () => {
    try {
      const service = SolanaSupplyChainService.getInstance();
      return await service.getAllRolesSummary();
    } catch {
      return {};
    }
  }, []);

  // Get role by name
  const getRoleByName = useCallback(async (roleName: string): Promise<string | null> => {
    try {
      const service = SolanaSupplyChainService.getInstance();
      return await service.getRoleByName(roleName);
    } catch {
      return null;
    }
  }, []);

  // Get role hash
  const getRoleHash = useCallback(async (roleName: string): Promise<string> => {
    try {
      const service = SolanaSupplyChainService.getInstance();
      return await service.getRoleHash(roleName);
    } catch {
      return '';
    }
  }, []);

  // Read operations
  const getNetbook = useCallback(async (serial: string): Promise<NetbookInfo | null> => {
    try {
      const service = SolanaSupplyChainService.getInstance();
      return await service.getNetbook(serial);
    } catch {
      return null;
    }
  }, []);

  const getNetbookReport = useCallback(async (serial: string): Promise<NetbookInfo | null> => {
    try {
      const service = SolanaSupplyChainService.getInstance();
      return await service.getNetbookReport(serial);
    } catch {
      return null;
    }
  }, []);

  const getNetbookState = useCallback(async (serial: string): Promise<number | null> => {
    try {
      const service = SolanaSupplyChainService.getInstance();
      return await service.getNetbookState(serial);
    } catch {
      return null;
    }
  }, []);

  const getAllSerialNumbers = useCallback(async (): Promise<string[]> => {
    try {
      const service = SolanaSupplyChainService.getInstance();
      return await service.getAllSerialNumbers();
    } catch {
      return [];
    }
  }, []);

  const getConfig = useCallback(async () => {
    try {
      const service = SolanaSupplyChainService.getInstance();
      return await service.getConfig();
    } catch {
      return null;
    }
  }, []);

  const getRoleRequest = useCallback(async (userAddress: string) => {
    try {
      const pubkey = new PublicKey(userAddress);
      const service = SolanaSupplyChainService.getInstance();
      return await service.getRoleRequest(pubkey);
    } catch {
      return null;
    }
  }, []);

  // Check if wallet is connected
  const isWalletConnected = useCallback((): boolean => {
    return publicKey !== null;
  }, [publicKey]);

  return {
    // Write operations
    registerNetbook,
    registerNetbooks,
    auditHardware,
    validateSoftware,
    assignToStudent,
    grantRole,
    revokeRole,
    requestRole,
    approveRoleRequest,
    rejectRoleRequest,
    // Read operations
    getNetbook,
    getNetbookReport,
    getNetbookState,
    getAllSerialNumbers,
    getConfig,
    getRoleRequest,
    // Role management
    hasRole,
    hasRoleByHash,
    getAccountBalance,
    getAllRolesSummary,
    getRoleByName,
    getRoleHash,
    // Wallet status
    isWalletConnected,
    // Loading state
    loading: transactionLoading,
  };
};
