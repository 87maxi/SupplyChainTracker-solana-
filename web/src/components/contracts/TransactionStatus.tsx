"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Connection, PublicKey } from '@solana/web3.js';

interface TransactionStatusProps {
  hash: string | null;
  onSuccess?: () => void;
  onError?: () => void;
  showDetails?: boolean;
}

export function TransactionStatus({
  hash,
  onSuccess,
  onError,
  showDetails = true
}: TransactionStatusProps) {
  const [status, setStatus] = useState<'pending' | 'success' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any>(null);
  const { toast } = useToast();
  const checkCountRef = useRef(0);

  // Optimizar validaciones iniciales
  const resetState = useCallback(() => {
    setStatus(null);
    setError(null);
    setReceipt(null);
    checkCountRef.current = 0;
  }, []);

  useEffect(() => {
    if (!hash) {
      resetState();
      return;
    }

    setStatus('pending');
    setError(null);
    setReceipt(null);
    checkCountRef.current = 0;

    // Issue #39 fix: Real Solana transaction confirmation monitoring
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const maxChecks = 60; // Check for up to 5 minutes (every 5 seconds)
    
    const checkTransaction = async () => {
      if (checkCountRef.current >= maxChecks) {
        setStatus('error');
        setError('Timeout: La transacción no fue confirmada en el tiempo esperado');
        toast({
          title: "Timeout",
          description: "La transacción no fue confirmada en el tiempo esperado.",
          variant: "destructive"
        });
        if (onError) onError();
        return;
      }

      try {
        const signature = new PublicKey(hash);
        const result = await connection.getSignatureStatus(signature, {
          searchTransactionHistory: true
        });

        if (!result.value) {
          // Transaction not found yet, check again
          checkCountRef.current++;
          setTimeout(checkTransaction, 5000);
          return;
        }

        const { confirmations, err, confirmationStatus } = result.value;

        // Check if transaction succeeded
        if (err) {
          setStatus('error');
          setError(`Transacción fallida: ${err.toString()}`);
          toast({
            title: "Error en la transacción",
            description: `La operación no pudo completarse: ${err.toString()}`,
            variant: "destructive"
          });
          if (onError) onError();
        } else if (confirmationStatus === 'finalized' || (confirmations !== null && confirmations >= 32)) {
          // Transaction is finalized
          setStatus('success');
          setReceipt({
            signature: hash,
            confirmations: confirmations || 0,
            confirmationStatus
          });
          toast({
            title: "Transacción confirmada",
            description: "La operación fue confirmada y finalizada en la blockchain.",
            variant: "default"
          });
          if (onSuccess) onSuccess();
        } else {
          // Still confirming
          checkCountRef.current++;
          setTimeout(checkTransaction, 5000);
        }
      } catch (err) {
        console.error('Error checking transaction:', err);
        checkCountRef.current++;
        setTimeout(checkTransaction, 5000);
      }
    };

    // Start checking after a short delay
    const timer = setTimeout(checkTransaction, 3000);

    return () => clearTimeout(timer);
  }, [hash, onSuccess, onError, toast, resetState]);

  if (!hash) return null;

  const renderContent = () => {
    switch (status) {
      case 'pending':
        return (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Transacción Pendiente</AlertTitle>
            <AlertDescription className="text-yellow-700">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Esperando confirmación en la red...</span>
              </div>
              {showDetails && (
                <div className="mt-2 text-sm">
                  <div><strong>Hash:</strong> {hash}</div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        );
      
      case 'success':
        return (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Éxito</AlertTitle>
            <AlertDescription className="text-green-700">
              Transacción confirmada exitosamente
              {showDetails && receipt && (
                <div className="mt-2 text-sm space-y-1">
                  <div><strong>Hash:</strong> {receipt.transactionHash}</div>
                  <div><strong>Bloque:</strong> {receipt.blockNumber}</div>
                  <div><strong>Gas utilizado:</strong> {receipt.gasUsed.toLocaleString()}</div>
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal"
                    onClick={() => window.open(`https://explorer.solana.com/tx/${hash}?cluster=devnet`, '_blank')}
                  >
                    Ver en Solana Explorer →
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        );
      
      case 'error':
        return (
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Error</AlertTitle>
            <AlertDescription className="text-red-700">
              {error}
              {showDetails && (
                <div className="mt-2 text-sm">
                  <div><strong>Hash:</strong> {hash}</div>
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal"
                    onClick={() => window.open(`https://explorer.solana.com/tx/${hash}?cluster=devnet`, '_blank')}
                  >
                    Ver en Solana Explorer →
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        );
      
      default:
        return null;
    }
  };

  return <div className="space-y-4">{renderContent()}</div>;
}