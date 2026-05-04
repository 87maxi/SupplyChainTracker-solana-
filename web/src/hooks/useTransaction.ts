// web/src/hooks/useTransaction.ts
'use client';

import { useState, useCallback } from 'react';
import { useTransactionNotifications } from './use-notifications';

export interface TransactionState {
  isProcessing: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  txHash: string | null;
}

export interface UseTransactionReturn {
  state: TransactionState;
  execute: <T>(transactionFn: () => Promise<T>, options?: TransactionOptions) => Promise<T | null>;
  reset: () => void;
}

export interface TransactionOptions {
  successMessage?: string;
  errorMessage?: string;
  pendingMessage?: string;
}

const initialState: TransactionState = {
  isProcessing: false,
  isSuccess: false,
  isError: false,
  error: null,
  txHash: null
};

export const useTransaction = (): UseTransactionReturn => {
  const [state, setState] = useState<TransactionState>(initialState);
  const { transaction: notify } = useTransactionNotifications();

  const execute = useCallback(async <T>(
    transactionFn: () => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T | null> => {
    const {
      successMessage = 'Transacción completada exitosamente',
      errorMessage = 'Error en la transacción',
      pendingMessage = 'Procesando transacción...'
    } = options;

    setState({
      isProcessing: true,
      isSuccess: false,
      isError: false,
      error: null,
      txHash: null
    });

    let notificationId: string | undefined;

    try {
      const result = await transactionFn();
      
      // Extraer hash de transacción si está disponible
      let txHash: string | null = null;
      if (result && typeof result === 'object' && 'transactionHash' in result) {
        txHash = result && typeof result === 'object' && 'transactionHash' in result ? (result as { transactionHash: string }).transactionHash : null;
      }

      setState({
        isProcessing: false,
        isSuccess: true,
        isError: false,
        error: null,
        txHash
      });

      if (txHash) {
        notify.success(txHash, successMessage);
      } else {
        notify.success('', successMessage);
      }

      return result;

    } catch (error) {
      console.error('Transaction error:', error);
      
      const errorMessageText = error.message || error.toString();
      
      setState({
        isProcessing: false,
        isSuccess: false,
        isError: true,
        error: errorMessageText,
        txHash: null
      });

      // Manejar diferentes tipos de errores
      if (errorMessageText.includes('user rejected') || errorMessageText.includes('User rejected')) {
        notify.rejected('El usuario rechazó la transacción');
      } else if (errorMessageText.includes('reverted')) {
        notify.error(error, 'La transacción fue revertida en la blockchain');
      } else {
        notify.error(error, errorMessage);
      }

      return null;
    }
  }, [notify]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    execute,
    reset
  };
};

// Hook especializado para operaciones de roles
export const useRoleTransaction = () => {
  const transaction = useTransaction();
  
  const grantRole = useCallback(async (
    grantRoleFn: (role: string, address: string) => Promise<unknown>,
    role: string,
    userAddress: string,
    roleName: string
  ) => {
    return transaction.execute(
      () => grantRoleFn(role, userAddress),
      {
        successMessage: `Rol ${roleName} otorgado exitosamente`,
        errorMessage: `Error al otorgar el rol ${roleName}`,
        pendingMessage: `Otorgando rol ${roleName}...`
      }
    );
  }, [transaction]);

  const revokeRole = useCallback(async (
    revokeRoleFn: (role: `0x${string}`, address: string) => Promise<unknown>,
    role: string,
    userAddress: string,
    roleName: string
  ) => {
    return transaction.execute(
      () => revokeRoleFn(role as `0x${string}`, userAddress as `0x${string}`),
      {
        successMessage: `Rol ${roleName} revocado exitosamente`,
        errorMessage: `Error al revocar el rol ${roleName}`,
        pendingMessage: `Revocando rol ${roleName}...`
      }
    );
  }, [transaction]);

  return {
    ...transaction,
    grantRole,
    revokeRole
  };
};