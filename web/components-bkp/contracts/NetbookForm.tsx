'use client';

import { z } from 'zod';
import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { registerNetbooks } from '@/lib/contracts/SupplyChainContract';
import { useProcessedUserAndNetbookData } from '@/hooks/useProcessedUserAndNetbookData';

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

type NetbookInput = z.infer<typeof netbookSchema>;

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
  const { refetch: refetchDashboardData } = useProcessedUserAndNetbookData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

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
    setSubmitStatus('idle');

    try {
      // Extrae los valores de las netbooks
      const serials = data.netbooks.map(n => n.serialNumber);
      const batches = data.netbooks.map(n => n.batchId);
      const specs = data.netbooks.map(n => n.initialModelSpecs);

      // Llama a la función del contrato para registrar las netbooks
      const txHash = await registerNetbooks(serials, batches, specs);

      toast({
        title: 'Éxito',
        description: `Netbooks registradas correctamente. Hash de transacción: ${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 8)}`,
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
      console.error('Error registering netbooks:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al registrar las netbooks. Por favor intenta nuevamente.',
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Netbooks</DialogTitle>
          <DialogDescription>
            Registra una o más netbooks en el sistema de trazabilidad.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 py-4">
            {/* Lista de netbooks */}
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-secondary/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Netbook {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
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
                        className={errors.netbooks?.[index]?.serialNumber ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {errors.netbooks?.[index]?.serialNumber && (
                        <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
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
                        className={errors.netbooks?.[index]?.batchId ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {errors.netbooks?.[index]?.batchId && (
                        <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
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
                        className={errors.netbooks?.[index]?.initialModelSpecs ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {errors.netbooks?.[index]?.initialModelSpecs && (
                        <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
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
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar otra netbook
            </Button>
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
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
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