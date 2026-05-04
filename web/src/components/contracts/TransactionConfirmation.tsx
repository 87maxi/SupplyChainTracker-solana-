"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface TransactionConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  warning?: string;
  confirmText?: string;
  cancelText?: string;
  transactionDetails?: {
    gasEstimate: number;
    maxFee: number;
    fromAddress: string;
    toAddress?: string;
  };
}

export function TransactionConfirmation({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  warning,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  transactionDetails
}: TransactionConfirmationProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Transaction confirmation error:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {warning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Advertencia</AlertTitle>
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        )}

        {transactionDetails && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Detalles de la transacción:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Dirección desde:</span>
                <span className="font-mono text-xs">{transactionDetails.fromAddress.slice(0, 6)}...{transactionDetails.fromAddress.slice(-4)}</span>
              </div>
              {transactionDetails.toAddress && (
                <div className="flex justify-between">
                  <span>Dirección a:</span>
                  <span className="font-mono text-xs">{transactionDetails.toAddress.slice(0, 6)}...{transactionDetails.toAddress.slice(-4)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Gas estimado:</span>
                <span>{transactionDetails.gasEstimate.toLocaleString()} unidades</span>
              </div>
              <div className="flex justify-between">
                <span>Comisión máxima:</span>
                <span>{transactionDetails.maxFee} ETH</span>
              </div>
            </div>
          </div>
        )}
        
        <DialogFooter className="sm:justify-end">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            {cancelText}
          </Button>
          <Button 
            type="button" 
            onClick={handleConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                {confirmText}
              </>
            ) : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}