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
import { assignToStudent } from '@/lib/contracts/SupplyChainContract';
import { useProcessedUserAndNetbookData } from '@/hooks/useProcessedUserAndNetbookData';

// Define el esquema de validación para el formulario
const assignmentFormSchema = z.object({
  serialNumber: z.string().min(1, 'El número de serie es requerido').max(50, 'El número de serie es demasiado largo'),
  schoolHash: z.string().min(66, 'El hash de la escuela debe ser un hash SHA256 válido (66 caracteres con prefijo 0x)').max(66, 'El hash de la escuela debe ser un hash SHA256 válido (66 caracteres con prefijo 0x)'),
  studentHash: z.string().min(66, 'El hash del estudiante debe ser un hash SHA256 válido (66 caracteres con prefijo 0x)').max(66, 'El hash del estudiante debe ser un hash SHA256 válido (66 caracteres con prefijo 0x)'),
  notes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional()
});

// Define los tipos para el formulario
type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

// Propiedades del componente
interface StudentAssignmentFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  initialSerial?: string;
}

export function StudentAssignmentForm({
  isOpen,
  onOpenChange,
  onComplete,
  initialSerial
}: StudentAssignmentFormProps) {
  const { toast } = useToast();
  const { refetch: refetchDashboardData } = useProcessedUserAndNetbookData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Inicializa el formulario con react-hook-form y zod
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      serialNumber: initialSerial || '',
      schoolHash: '',
      studentHash: '',
      notes: ''
    },
    mode: 'onChange'
  });

  const { handleSubmit, formState: { errors, isValid }, reset } = form;

  // Maneja el envío del formulario
  const onSubmit = async (data: AssignmentFormValues) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Llama a la función del contrato para asignar la netbook al estudiante
      const txHash = await assignToStudent(data.serialNumber, data.schoolHash, data.studentHash);

      toast({
        title: 'Éxito',
        description: `Netbook asignada correctamente al estudiante. Hash de transacción: ${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 8)}`,
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
      console.error('Error assigning to student:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al asignar la netbook al estudiante. Por favor intenta nuevamente.',
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
          <DialogTitle>Asignar a Estudiante</DialogTitle>
          <DialogDescription>
            Registra la asignación de una netbook a un estudiante específico.
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
              <label htmlFor="schoolHash" className="text-right text-sm font-medium">
                Hash de la Escuela *
              </label>
              <Input
                id="schoolHash"
                placeholder="0x... (SHA256 del nombre/código de la escuela)"
                {...form.register('schoolHash')}
                disabled={isSubmitting}
                className={errors.schoolHash ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.schoolHash && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.schoolHash.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="studentHash" className="text-right text-sm font-medium">
                Hash del Estudiante *
              </label>
              <Input
                id="studentHash"
                placeholder="0x... (SHA256 del documento de identidad)"
                {...form.register('studentHash')}
                disabled={isSubmitting}
                className={errors.studentHash ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.studentHash && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.studentHash.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="notes" className="text-right text-sm font-medium">
                Notas
              </label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales sobre la asignación..."
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
              className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Asignando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Asignar a Estudiante
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}