'use client';

import { z } from 'zod';
import { useState, useCallback } from 'react';
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
import { Loader2, Check, AlertCircle, Code2 } from 'lucide-react';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { cn } from '@/lib/utils';

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
  const { validateSoftware } = useSupplyChainService();
  const refetchDashboardData = useCallback(() => Promise.resolve(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Inicializa el formulario con react-hook-form y zod
  const form = useForm<ValidationFormValues>({
    resolver: zodResolver(validationFormSchema),
    defaultValues: {
      serialNumber: initialSerial || '',
      osVersion: '',
      passed: true,
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
      await validateSoftware({
        serialNumber: data.serialNumber,
        osVersion: data.osVersion,
        passed: data.passed
      });

      toast({
        title: 'Éxito',
        description: 'Software validado correctamente',
        variant: 'default',
      });

      setSubmitStatus('success');
      await refetchDashboardData();

      if (onComplete) {
        onComplete();
      }

      reset({
        serialNumber: initialSerial || '',
        osVersion: '',
        passed: true,
        notes: ''
      });

    } catch (error: any) {
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
      <DialogContent className="sm:max-w-[550px] glass-card">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Validar Software</DialogTitle>
              <DialogDescription>
                Registra el resultado de la validación de software para una netbook.
              </DialogDescription>
            </div>
          </div>
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
                className={cn(
                  "transition-all duration-200 focus:ring-2",
                  errors.serialNumber ? 'border-destructive focus-visible:ring-destructive/30' : 'focus:ring-primary/30'
                )}
              />
              {errors.serialNumber && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1 animate-shake">
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
                placeholder="Ubuntu 22.04 LTS"
                {...form.register('osVersion')}
                disabled={isSubmitting}
                className={cn(
                  "transition-all duration-200 focus:ring-2",
                  errors.osVersion ? 'border-destructive focus-visible:ring-destructive/30' : 'focus:ring-primary/30'
                )}
              />
              {errors.osVersion && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1 animate-shake">
                  <AlertCircle className="h-3 w-3" />
                  {errors.osVersion.message}
                </p>
              )}
            </div>

            <div className={cn(
              "flex items-center gap-3 p-4 rounded-xl border transition-all duration-300",
              form.watch('passed')
                ? "border-success/30 bg-success/5"
                : "border-destructive/30 bg-destructive/5"
            )}>
              <input
                type="checkbox"
                id="passed"
                {...form.register('passed')}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="flex flex-col">
                <label htmlFor="passed" className="text-sm font-semibold cursor-pointer">
                  {form.watch('passed') ? "Validación Aprobada" : "Validación Rechazada"}
                </label>
                <span className="text-xs text-muted-foreground">
                  {form.watch('passed') ? "El software cumple con los requisitos" : "El software presenta problemas"}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="notes" className="text-right text-sm font-medium">
                Notas
              </label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales sobre la validación..."
                {...form.register('notes')}
                disabled={isSubmitting}
                className={cn(
                  "transition-all duration-200 focus:ring-2",
                  errors.notes ? 'border-destructive focus-visible:ring-destructive/30' : 'focus:ring-primary/30'
                )}
              />
              {errors.notes && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1 animate-shake">
                  <AlertCircle className="h-3 w-3" />
                  {errors.notes.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {submitStatus !== 'idle' && (
              <div className={cn(
                "mb-2 p-3 rounded-lg text-sm flex items-center gap-2 w-full animate-fade-in",
                submitStatus === 'success'
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              )}>
                {submitStatus === 'success' ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                {submitStatus === 'success' ? 'Validación registrada' : 'Error al procesar'}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="transition-all duration-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={cn(
                "transition-all duration-300 shadow-md hover:shadow-lg",
                "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : submitStatus === 'success' ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Completado
                </>
              ) : (
                'Validar Software'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
