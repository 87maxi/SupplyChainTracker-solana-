import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { useWeb3 } from '@/hooks/useWeb3';

interface SoftwareValidationFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  initialSerial?: string;
}

export function SoftwareValidationForm({ isOpen, onOpenChange, onComplete, initialSerial }: SoftwareValidationFormProps) {
  const [serial, setSerial] = useState(initialSerial || '');
  const [version, setVersion] = useState('');
  const [passed, setPassed] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { validateSoftware } = useSupplyChainService();
  const { address } = useWeb3();

  useEffect(() => {
    if (initialSerial) {
      setSerial(initialSerial);
    }
  }, [initialSerial]);

  const handleValidate = async () => {
    if (!serial) {
      toast({
        title: "Error",
        description: "El número de serie es obligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      if (!address) {
        toast({
          title: "Error",
          description: "No se pudo obtener tu dirección. Recarga la página.",
          variant: "destructive",
        });
        return;
      }

      const metadata = {
        serial,
        osVersion: version,
        passed,
        technician: address,
        timestamp: new Date().toISOString(),
        type: 'software_validation'
      };

      const result = await validateSoftware(serial, version, passed, JSON.stringify(metadata));

      if (result.success) {
        toast({
          title: "Éxito",
          description: `Validación de software ${passed ? 'aprobada' : 'rechazada'} para netbook ${serial}`,
        });
      } else {
        throw new Error(result.error);
      }

      // Reset form
      if (!initialSerial) setSerial('');
      setVersion('');
      setPassed(true);

      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error validating software:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo validar el software",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Validación de Software</DialogTitle>
          <DialogDescription>
            Registre los resultados de la validación del software instalado en una netbook.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="serial" className="text-right">
              Serial
            </Label>
            <Input
              id="serial"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              className="col-span-3"
              placeholder="NB-001"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="version" className="text-right">
              Versión OS
            </Label>
            <Input
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="col-span-3"
              placeholder="Ubuntu 22.04 LTS"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="passed"
              checked={passed}
              onCheckedChange={(checked: boolean) => setPassed(checked)}
            />
            <label
              htmlFor="passed"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Validación Aprobada
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleValidate} disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar Validación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}