'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Check, AlertCircle } from 'lucide-react';

// Propiedades del componente
interface TransactionConfirmationProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => Promise<void>;
  title?: string;
  description?: string;
  confirmLabel?: string;
  isLoading?: boolean;
  isSuccess?: boolean;
  error?: string;
}

export function TransactionConfirmation({
  isOpen,
  onOpenChange,
  onConfirm,
  title = 'Confirmar Transacción',
  description = '¿Estás seguro de que deseas realizar esta acción?',
  confirmLabel = 'Confirmar',
  isLoading = false,
  isSuccess = false,
  error,
}: TransactionConfirmationProps) {
  const [internalLoading, setInternalLoading] = useState(isLoading);
  const [internalSuccess, setInternalSuccess] = useState(isSuccess);
  const [internalError, setInternalError] = useState(error);

  const handleConfirm = async () => {
    if (!onConfirm) return;
    
    setInternalLoading(true);
    setInternalSuccess(false);
    setInternalError(undefined);

    try {
      await onConfirm();
      setInternalSuccess(true);
    } catch (err: any) {
      setInternalError(err.message || 'Error desconocido');
    } finally {
      if (!internalSuccess) {
        setInternalLoading(false);
      }
    }
  };

  const handleClose = () => {
    setInternalLoading(false);
    setInternalSuccess(false);
    setInternalError(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {internalSuccess ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : internalError ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Loader2 className={`h-5 w-5 ${internalLoading ? 'animate-spin' : 'hidden'}`} />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        {internalError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{internalError}</p>
          </div>
        )}

        {internalSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">¡Operación completada exitosamente!</p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={internalLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={internalLoading || internalSuccess}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
          >
            {internalLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : internalSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Completado
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
