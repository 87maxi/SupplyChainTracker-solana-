'use client';

import { z } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { validateSoftware } from '@/lib/contracts/SupplyChainContract';
import { useProcessedUserAndNetbookData } from '@/hooks/useProcessedUserAndNetbookData';

// Define el esquema de validación para el formulario
const validationFormSchema = z.object({
  serialNumber: z.string().min(1, 'El número de serie es requerido').max(50, 'El número de serie es demasiado largo'),
  osVersion: z.string().min(1, 'La versión del sistema operativo es requerida').max(50, 'La versión del sistema operativo es demasiado larga'),
  passed: z.boolean(),
  notes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional()
});

// Define los tipos para el formulario
type ValidationFormValues = z.infer<typeof validationFormSchema>;

// Propiedades del componente
interface SoftwareValidationFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  initialSerial?: string;
}

export function SoftwareValidationForm({
  isOpen,
  onOpenChange,
  onComplete,
  initialSerial
}: SoftwareValidationFormProps) {
  const { toast } = useToast();
  const { refetch: refetchDashboardData } = useProcessedUserAndNetbookData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Inicializa el formulario con react-hook-form y zod
  const form = useForm<ValidationFormValues>({
    resolver: zodResolver(validationFormSchema),
    defaultValues: {
      serialNumber: initialSerial || '',
      osVersion: '',
      passed: false,
      notes: ''
    },
    mode: 'onChange'
  });

  const { handleSubmit, formState: { errors, isValid }, reset } = form;

  // Maneja el envío del formulario
  const onSubmit = async (data: ValidationFormValues) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Llama a la función del contrato para validar el software
      const txHash = await validateSoftware(data.serialNumber, data.osVersion, data.passed);

      toast({
        title: 'Éxito',
        description: `Software validado correctamente. Hash de transacción: ${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 8)}`,
        variant: 'default',
      });

      setSubmitStatus('success');

      // Refresca los datos del dashboard
      await refetchDashboardData();

      // Llama a la función de completado si está definida
      if (onComplete) {
        onComplete();
      }

      // Resetea el formulario
      reset();

    } catch (error: any) {
      console.error('Error validating software:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al validar el software. Por favor intenta nuevamente.',
        variant: 'destructive',
      });
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resetea el formulario cuando se cierra el diálogo
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
      setSubmitStatus('idle');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Validar Software</DialogTitle>
          <DialogDescription>
            Registra la validación del software instalado en una netbook.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="serialNumber" className="text-right text-sm font-medium">
                Número de Serie *
              </label>
              <Input
                id="serialNumber"
                placeholder="INT001"
                {...form.register('serialNumber')}
                disabled={isSubmitting || !!initialSerial}
                className={errors.serialNumber ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.serialNumber && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.serialNumber.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="osVersion" className="text-right text-sm font-medium">
                Versión del SO *
              </label>
              <Input
                id="osVersion"
                placeholder="Ubuntu 20.04 LTS"
                {...form.register('osVersion')}
                disabled={isSubmitting}
                className={errors.osVersion ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.osVersion && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.osVersion.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="passed"
                {...form.register('passed')}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="passed" className="text-sm font-medium leading-none">
                Aprobado
              </label>
            </div>

            <div className="grid gap-2">
              <label htmlFor="notes" className="text-right text-sm font-medium">
                Notas
              </label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales sobre la validación del software..."
                {...form.register('notes')}
                disabled={isSubmitting}
                className={errors.notes ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.notes && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.notes.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Validar Software
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}