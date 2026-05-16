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
import { Loader2, Check, AlertCircle, GraduationCap } from 'lucide-react';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { cn } from '@/lib/utils';

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
      <DialogContent className="sm:max-w-[550px] glass-card">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Asignar a Estudiante</DialogTitle>
              <DialogDescription>
                Asigna una netbook a un estudiante de una escuela.
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
              <label htmlFor="schoolHash" className="text-right text-sm font-medium">
                Hash de la Escuela *
              </label>
              <Input
                id="schoolHash"
                placeholder="0x... (SHA256 de datos de la escuela)"
                {...form.register('schoolHash')}
                disabled={isSubmitting}
                className={cn(
                  "transition-all duration-200 focus:ring-2 font-mono text-xs",
                  errors.schoolHash ? 'border-destructive focus-visible:ring-destructive/30' : 'focus:ring-primary/30'
                )}
              />
              {errors.schoolHash && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1 animate-shake">
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
                className={cn(
                  "transition-all duration-200 focus:ring-2 font-mono text-xs",
                  errors.studentHash ? 'border-destructive focus-visible:ring-destructive/30' : 'focus:ring-primary/30'
                )}
              />
              {errors.studentHash && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1 animate-shake">
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
                {submitStatus === 'success' ? 'Asignación registrada' : 'Error al procesar'}
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
                "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600"
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
                'Asignar Estudiante'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
