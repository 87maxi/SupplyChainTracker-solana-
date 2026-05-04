import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface StudentAssignmentFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  initialSerial?: string;
}

export function StudentAssignmentForm({ isOpen, onOpenChange, onComplete, initialSerial }: StudentAssignmentFormProps) {
  const [serial, setSerial] = useState(initialSerial || '');
  const [schoolHash, setSchoolHash] = useState('');
  const [studentHash, setStudentHash] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { assignToStudent } = useSupplyChainService();
  const { address } = useWeb3();

  useEffect(() => {
    if (initialSerial) {
      setSerial(initialSerial);
    }
  }, [initialSerial]);

  const isValidBytes32 = (value: string) => {
    return /^0x[0-9a-fA-F]{64}$/.test(value);
  };

  const handleAssign = async () => {
    if (!serial || !schoolHash || !studentHash) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos",
        variant: "destructive",
      });
      return;
    }

    if (!isValidBytes32(schoolHash)) {
      toast({
        title: "Error",
        description: "El hash de la escuela debe ser un formato bytes32 válido (0x + 64 caracteres hex)",
        variant: "destructive",
      });
      return;
    }

    if (!isValidBytes32(studentHash)) {
      toast({
        title: "Error",
        description: "El hash del estudiante debe ser un formato bytes32 válido (0x + 64 caracteres hex)",
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
        schoolHash,
        studentHash,
        assignedBy: address,
        timestamp: new Date().toISOString(),
        type: 'student_assignment'
      };

      const result = await assignToStudent(serial, schoolHash, studentHash, JSON.stringify(metadata));

      if (result.success) {
        toast({
          title: "Éxito",
          description: `Netbook ${serial} asignada al estudiante`,
        });
      } else {
        throw new Error(result.error);
      }

      // Reset form
      if (!initialSerial) setSerial('');
      setSchoolHash('');
      setStudentHash('');

      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error assigning to student:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo asignar la netbook al estudiante",
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
          <DialogTitle>Asignar a Estudiante</DialogTitle>
          <DialogDescription>
            Asigne una netbook a un estudiante final proporcionando los identificadores hash.
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
            <Label htmlFor="schoolHash" className="text-right">
              Hash Escuela
            </Label>
            <Input
              id="schoolHash"
              value={schoolHash}
              onChange={(e) => setSchoolHash(e.target.value)}
              className="col-span-3"
              placeholder="0x... (CID del registro)"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="studentHash" className="text-right">
              Hash Estudiante
            </Label>
            <Input
              id="studentHash"
              value={studentHash}
              onChange={(e) => setStudentHash(e.target.value)}
              className="col-span-3"
              placeholder="0x... (DNI hash)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleAssign} disabled={loading}>
            {loading ? 'Asignando...' : 'Asignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}