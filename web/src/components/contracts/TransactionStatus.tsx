"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

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

  // Optimizar validaciones iniciales
  const resetState = useCallback(() => {
    setStatus(null);
    setError(null);
    setReceipt(null);
  }, []);

  useEffect(() => {
    if (!hash) {
      resetState();
      return;
    }

    setStatus('pending');
    setError(null);
    setReceipt(null);

    // Simulate transaction monitoring
    const timer = setTimeout(() => {
      // In a real implementation, you would check the transaction receipt
      // This is a simulation for demonstration purposes
      const success = Math.random() > 0.3; // 70% success rate for demo
      
      if (success) {
        setStatus('success');
        setReceipt({
          transactionHash: hash,
          blockNumber: 12345678,
          gasUsed: 21000,
          effectiveGasPrice: 1000000000 // 1 gwei
        });
        toast({
          title: "Transacción completada",
          description: "La operación se completó exitosamente.",
          variant: "default"
        });
        if (onSuccess) onSuccess();
      } else {
        setStatus('error');
        setError('La transacción fue rechazada por la red');
        toast({
          title: "Error en la transacción",
          description: "La operación no pudo completarse.",
          variant: "destructive"
        });
        if (onError) onError();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [hash, onSuccess, onError, toast]);

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
                    onClick={() => window.open(`https://etherscan.io/tx/${hash}`, '_blank')}
                  >
                    Ver en Etherscan →
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
                    onClick={() => window.open(`https://etherscan.io/tx/${hash}`, '_blank')}
                  >
                    Ver en Etherscan →
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