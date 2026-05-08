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
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';

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
  const { assignToStudent } = useSupplyChainService();
  const refetchDashboardData = useCallback(() => Promise.resolve(), []);
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
      // Fix: assignToStudent expects (serial, schoolHash, studentHash, _metadata?) not object
      await assignToStudent({
        serialNumber: data.serialNumber,
        schoolHash: Array.from(Buffer.from(data.schoolHash.replace('0x', ''), 'hex')),
        studentHash: Array.from(Buffer.from(data.studentHash.replace('0x', ''), 'hex'))
      });

      toast({
        title: 'Éxito',
        description: 'Netbook asignada al estudiante correctamente',
        variant: 'default',
      });

      setSubmitStatus('success');
      await refetchDashboardData();

      if (onComplete) {
        onComplete();
      }

      reset({
        serialNumber: initialSerial || '',
        schoolHash: '',
        studentHash: '',
        notes: ''
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al asignar la netbook. Por favor intenta nuevamente.',
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
            Asigna una netbook a un estudiante de una escuela.
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
                placeholder="0x... (SHA256 de datos de la escuela)"
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
                placeholder="0x... (SHA256 del ID del estudiante)"
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
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {submitStatus === 'success' ? 'Éxito' : 'Procesando...'}
                </>
              ) : (
                <>
                  {submitStatus === 'success' ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Completado
                    </>
                  ) : 'Asignar Estudiante'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
