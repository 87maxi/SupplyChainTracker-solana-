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
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { auditHardware } from '@/lib/contracts/SupplyChainContract';
import { useProcessedUserAndNetbookData } from '@/hooks/useProcessedUserAndNetbookData';

// Define el esquema de validación para el formulario
const auditFormSchema = z.object({
  serialNumber: z.string().min(1, 'El número de serie es requerido').max(50, 'El número de serie es demasiado largo'),
  reportHash: z.string().min(66, 'El hash del reporte debe ser un hash SHA256 válido (66 caracteres con prefijo 0x)').max(66, 'El hash del reporte debe ser un hash SHA256 válido (66 caracteres con prefijo 0x)'),
  passed: z.boolean().default(false),
  notes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional()
});

// Define los tipos para el formulario
type AuditFormValues = z.infer<typeof auditFormSchema>;

// Propiedades del componente
interface HardwareAuditFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  initialSerial?: string;
}

export function HardwareAuditForm({ 
  isOpen, 
  onOpenChange, 
  onComplete, 
  initialSerial 
}: HardwareAuditFormProps) {
  const { toast } = useToast();
  const { refetch: refetchDashboardData } = useProcessedUserAndNetbookData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Inicializa el formulario con react-hook-form y zod
  const form = useForm<AuditFormValues>({
    resolver: zodResolver(auditFormSchema),
    defaultValues: {
      serialNumber: initialSerial || '',
      reportHash: '',
      passed: false,
      notes: ''
    },
    mode: 'onChange'
  });

  const { handleSubmit, formState: { errors, isValid }, reset } = form;

  // Maneja el envío del formulario
  const onSubmit = async (data: AuditFormValues) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      // Llama a la función del contrato para auditar el hardware
      const txHash = await auditHardware(data.serialNumber, data.passed, data.reportHash);
      
      toast({
        title: 'Éxito',
        description: `Hardware auditado correctamente. Hash de transacción: ${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 8)}`,
        variant: 'success',
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
      console.error('Error auditing hardware:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al auditar el hardware. Por favor intenta nuevamente.',
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
          <DialogTitle>Auditar Hardware</DialogTitle>
          <DialogDescription>
            Registra el resultado de la auditoría de hardware para una netbook.
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
              <label htmlFor="reportHash" className="text-right text-sm font-medium">
                Hash del Reporte *
              </label>
              <Input
                id="reportHash"
                placeholder="0x... (SHA256 del reporte en IPFS)"
                {...form.register('reportHash')}
                disabled={isSubmitting}
                className={errors.reportHash ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.reportHash && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.reportHash.message}
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
                placeholder="Notas adicionales sobre la auditoría..."
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
                  {submitStatus === 'success' ? 'Éxito' : 'Procesando...'}
                </>
              ) : (
                <>
                  {submitStatus === 'success' ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Completado
                    </>
                  ) : 'Auditar Hardware'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
