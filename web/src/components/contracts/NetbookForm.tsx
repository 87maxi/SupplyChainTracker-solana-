import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { useWeb3 } from '@/hooks/useWeb3';
import { useToast } from '@/hooks/use-toast';

interface NetbookFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function NetbookForm({ isOpen, onOpenChange, onComplete }: NetbookFormProps) {
  const [serial, setSerial] = useState('');
  const [batch, setBatch] = useState('');
  const [specs, setSpecs] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { registerNetbooks } = useSupplyChainService();
  const { address } = useWeb3();

  const handleRegister = async () => {
    if (!serial || !batch || !specs) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos",
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
        batch,
        specs,
        manufacturer: address,
        timestamp: new Date().toISOString(),
        type: 'registration'
      };

      // The contract expects string[] for metadata, one per netbook
      const result = await registerNetbooks([serial], [batch], [specs], [JSON.stringify(metadata)]);

      if (result.success) {
        toast({
          title: "Éxito",
          description: `Netbook ${serial} registrada correctamente`,
        });
      } else {
        throw new Error(result.error);
      }

      // Reset form
      setSerial('');
      setBatch('');
      setSpecs('');

      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error registering netbook:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la netbook",
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
          <DialogTitle>Registrar Netbook</DialogTitle>
          <DialogDescription>
            Registre una nueva netbook proporcionando los detalles necesarios.
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
            <Label htmlFor="batch" className="text-right">
              Lote
            </Label>
            <Input
              id="batch"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="col-span-3"
              placeholder="L-2025-01"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="specs" className="text-right">
              Especificaciones
            </Label>
            <Textarea
              id="specs"
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              className="col-span-3"
              placeholder="Procesador Intel Celeron N4020, 4GB RAM, 64GB SSD..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleRegister} disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}