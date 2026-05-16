'use client';

import { z } from 'zod';
import { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, AlertCircle, Plus, Trash2, Package } from 'lucide-react';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { cn } from '@/lib/utils';

// Define el esquema de validación para una sola netbook
const netbookSchema = z.object({
  serialNumber: z.string().min(1, 'El número de serie es requerido').max(50, 'El número de serie es demasiado largo'),
  batchId: z.string().min(1, 'El ID de batch es requerido').max(50, 'El ID de batch es demasiado largo'),
  initialModelSpecs: z.string().min(1, 'Las especificaciones del modelo son requeridas').max(200, 'Las especificaciones del modelo son demasiado largas')
});

// Define el esquema de validación para el formulario (múltiples netbooks)
const netbookFormSchema = z.object({
  netbooks: z.array(netbookSchema).min(1, 'Debes agregar al menos una netbook')
});

// Define los tipos para el formulario
type NetbookFormValues = z.infer<typeof netbookFormSchema>;

// Propiedades del componente
interface NetbookFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function NetbookForm({
  isOpen,
  onOpenChange,
  onComplete
}: NetbookFormProps) {
  const { toast } = useToast();
  const { registerNetbook } = useSupplyChainService();
  const refetchDashboardData = useCallback(() => Promise.resolve(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  // Inicializa el formulario con react-hook-form y zod
  const form = useForm<NetbookFormValues>({
    resolver: zodResolver(netbookFormSchema),
    defaultValues: {
      netbooks: [{
        serialNumber: '',
        batchId: '',
        initialModelSpecs: ''
      }]
    },
    mode: 'onChange'
  });

  // Configura el manejo de arrays para múltiples netbooks
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'netbooks'
  });

  const { handleSubmit, formState: { errors }, reset } = form;

  // Maneja el envío del formulario
  const onSubmit = async (data: NetbookFormValues) => {
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // Note: registerNetbook is used instead of registerNetbooksBatch from legacy Ethereum version
      for (const netbook of data.netbooks) {
        await registerNetbook({
          serialNumber: netbook.serialNumber,
          batchId: netbook.batchId,
          modelSpecs: netbook.initialModelSpecs
        });
      }

      toast({
        title: 'Éxito',
        description: `Netbooks registradas correctamente: ${fields.length} registradas`,
        variant: 'default',
      });

      setSubmitMessage(`Netbooks registradas correctamente: ${fields.length} registradas`);
      await refetchDashboardData();

      if (onComplete) {
        onComplete();
      }

      reset({
        netbooks: [{ serialNumber: '', batchId: '', initialModelSpecs: '' }]
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al registrar las netbooks. Por favor intenta nuevamente.',
        variant: 'destructive',
      });
      setSubmitMessage(`Error: ${error.message || 'Error al registrar las netbooks'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resetea el formulario cuando se cierra el diálogo
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
      setSubmitMessage(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto glass-card">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Registrar Netbooks</DialogTitle>
              <DialogDescription>
                Registra una o más netbooks en el sistema de trazabilidad.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 py-4">
            {/* Lista de netbooks */}
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className={cn(
                  "p-4 border rounded-xl space-y-4 transition-all duration-300 animate-spring-in",
                  "bg-gradient-to-br from-secondary/30 to-card border-border/50",
                  "hover:border-primary/20 hover:shadow-md"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-primary/10 text-primary text-xs font-bold">
                        {index + 1}
                      </div>
                      <h4 className="text-sm font-semibold">Netbook {index + 1}</h4>
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <div className="grid gap-2">
                      <label htmlFor={`netbooks.${index}.serialNumber`} className="text-right text-sm font-medium">
                        Número de Serie *
                      </label>
                      <Input
                        id={`netbooks.${index}.serialNumber`}
                        {...form.register(`netbooks.${index}.serialNumber` as const)}
                        placeholder="INT001"
                        disabled={isSubmitting}
                        className={cn(
                          "transition-all duration-200 focus:ring-2",
                          errors.netbooks?.[index]?.serialNumber ? 'border-destructive focus-visible:ring-destructive/30' : 'focus:ring-primary/30'
                        )}
                      />
                      {errors.netbooks?.[index]?.serialNumber && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-1 animate-shake">
                          <AlertCircle className="h-3 w-3" />
                          {errors.netbooks[index].serialNumber.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label htmlFor={`netbooks.${index}.batchId`} className="text-right text-sm font-medium">
                        ID de Batch *
                      </label>
                      <Input
                        id={`netbooks.${index}.batchId`}
                        {...form.register(`netbooks.${index}.batchId` as const)}
                        placeholder="BATCH-001"
                        disabled={isSubmitting}
                        className={cn(
                          "transition-all duration-200 focus:ring-2",
                          errors.netbooks?.[index]?.batchId ? 'border-destructive focus-visible:ring-destructive/30' : 'focus:ring-primary/30'
                        )}
                      />
                      {errors.netbooks?.[index]?.batchId && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-1 animate-shake">
                          <AlertCircle className="h-3 w-3" />
                          {errors.netbooks[index].batchId.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label htmlFor={`netbooks.${index}.initialModelSpecs`} className="text-right text-sm font-medium">
                        Especificaciones *
                      </label>
                      <Input
                        id={`netbooks.${index}.initialModelSpecs`}
                        {...form.register(`netbooks.${index}.initialModelSpecs` as const)}
                        placeholder="Intel i5, 8GB RAM"
                        disabled={isSubmitting}
                        className={cn(
                          "transition-all duration-200 focus:ring-2",
                          errors.netbooks?.[index]?.initialModelSpecs ? 'border-destructive focus-visible:ring-destructive/30' : 'focus:ring-primary/30'
                        )}
                      />
                      {errors.netbooks?.[index]?.initialModelSpecs && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-1 animate-shake">
                          <AlertCircle className="h-3 w-3" />
                          {errors.netbooks[index].initialModelSpecs.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Botón para agregar más netbooks */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ serialNumber: '', batchId: '', initialModelSpecs: '' })}
              disabled={isSubmitting}
              className="w-full border-dashed hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar otra netbook
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {submitMessage && (
              <div className={cn(
                "mb-2 p-3 rounded-lg text-sm flex items-center gap-2 w-full animate-fade-in",
                submitMessage.startsWith('Error:')
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : 'bg-success/10 text-success border border-success/20'
              )}>
                {submitMessage.startsWith('Error:') ? (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <Check className="h-4 w-4 shrink-0" />
                )}
                {submitMessage}
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
              disabled={isSubmitting}
              className={cn(
                "transition-all duration-300 shadow-md hover:shadow-lg",
                "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Registrar {fields.length} Netbook{fields.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
