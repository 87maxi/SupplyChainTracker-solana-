import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSupplyChainService } from "@/hooks/useSupplyChainService";
import { useWeb3 } from "@/hooks/useWeb3";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuditFormData {
  serial: string;
  deviceModel: string;
  auditDate: string;
  auditorName: string;
  components: {
    cpu: boolean;
    ram: boolean;
    storage: boolean;
    display: boolean;
    keyboard: boolean;
    ports: boolean;
    battery: boolean;
  };
  observations: string;
  timestamp: string;
}

interface HardwareAuditFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  initialSerial?: string;
  userAddress?: string;
}

export function HardwareAuditForm({
  isOpen,
  onOpenChange,
  onComplete,
  initialSerial,
}: HardwareAuditFormProps) {
  const [serial, setSerial] = useState(initialSerial || "");
  const [passed, setPassed] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { auditHardware } = useSupplyChainService();
  const { address } = useWeb3();

  // Añadir efecto para actualizar el serial cuando cambie initialSerial
  useEffect(() => {
    if (initialSerial) {
      setSerial(initialSerial);
    }
  }, [initialSerial]);

  const handleAudit = async () => {
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

      // Collect form data directly
      const currentAuditData: AuditFormData = {
        serial,
        deviceModel: (document.getElementById('deviceModel') as HTMLInputElement)?.value || '',
        auditDate: (document.getElementById('auditDate') as HTMLInputElement)?.value || '',
        auditorName: (document.getElementById('auditorName') as HTMLInputElement)?.value || '',
        components: {
          cpu: (document.getElementById('cpu') as HTMLInputElement)?.checked || false,
          ram: (document.getElementById('ram') as HTMLInputElement)?.checked || false,
          storage: (document.getElementById('storage') as HTMLInputElement)?.checked || false,
          display: (document.getElementById('display') as HTMLInputElement)?.checked || false,
          keyboard: (document.getElementById('keyboard') as HTMLInputElement)?.checked || false,
          ports: (document.getElementById('ports') as HTMLInputElement)?.checked || false,
          battery: (document.getElementById('battery') as HTMLInputElement)?.checked || false,
        },
        observations: (document.getElementById('observations') as HTMLTextAreaElement)?.value || '',
        timestamp: new Date().toISOString()
      };

      // Create a hash from the audit data for blockchain storage
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(currentAuditData));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const reportHash = `0x${hashHex.padStart(64, '0')}`;

      if (!address) {
        toast({
          title: "Error",
          description: "No se pudo obtener tu dirección. Recarga la página.",
          variant: "destructive",
        });
        return;
      }

      // Create metadata object including the hash and full audit details
      const metadata = {
        ...currentAuditData,
        reportHash,
        auditor: address,
        type: 'hardware_audit'
      };

      const result = await auditHardware(serial, passed, reportHash, JSON.stringify(metadata));

      if (result.success) {
        toast({
          title: "Registro completado",
          description:
            "El informe de auditoría se ha registrado en la blockchain",
        });
      } else {
        throw new Error(result.error);
      }

      // Reset form
      if (!initialSerial) setSerial("");
      setPassed(true);

      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error registering on blockchain:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar en la blockchain",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calcular altura máxima según el tamaño de pantalla
  const getDialogContentClass = () => {
    if (typeof window === "undefined")
      return "sm:max-w-[900px] h-[90vh] max-h-[90vh] flex flex-col";

    const width = window.innerWidth;
    const height = window.innerHeight;

    if (width < 640)
      return "max-w-full h-[95vh] max-h-[95vh] flex flex-col p-2"; // Mobile
    if (width < 768) return "max-w-[85vw] h-[90vh] max-h-[90vh] flex flex-col"; // Tablet
    if (height < 768)
      return "sm:max-w-[900px] h-[85vh] max-h-[85vh] flex flex-col"; // Small screens
    return "sm:max-w-[900px] h-[90vh] max-h-[90vh] flex flex-col"; // Default
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={getDialogContentClass()}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col h-full">
            <DialogHeader>
              <DialogTitle>Auditoría de Hardware</DialogTitle>
              <DialogDescription>
                Complete el informe de auditoría y regístrelo en la blockchain
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              <Card>
                <CardHeader>
                  <CardTitle>Complete el Informe de Auditoría</CardTitle>
                  <CardDescription>
                    Complete los campos para registrar la auditoría de hardware
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form id="auditForm" className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="auditSerial">Serial</Label>
                      <Input
                        id="auditSerial"
                        value={serial}
                        onChange={(e) => setSerial(e.target.value)}
                        placeholder="NB-001"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deviceModel">Modelo</Label>
                      <Input
                        id="deviceModel"
                        placeholder="Intel N100, 8GB RAM, 256GB SSD"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auditDate">Fecha</Label>
                      <Input id="auditDate" type="date" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auditorName">Auditor</Label>
                      <Input
                        id="auditorName"
                        placeholder="Nombre del auditor"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="components">Componentes</Label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="cpu" />
                          <label
                            htmlFor="cpu"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            CPU
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="ram" />
                          <label
                            htmlFor="ram"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            RAM
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="storage" />
                          <label
                            htmlFor="storage"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Almacenamiento
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="display" />
                          <label
                            htmlFor="display"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Pantalla
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="keyboard" />
                          <label
                            htmlFor="keyboard"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Teclado
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="ports" />
                          <label
                            htmlFor="ports"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Puertos
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="battery" />
                          <label
                            htmlFor="battery"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Batería
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="observations">Observaciones</Label>
                      <Textarea
                        id="observations"
                        placeholder="Observaciones adicionales sobre la auditoría..."
                        className="h-20"
                      />
                    </div>
                  </form>
                </CardContent>
              </Card>

              <div className="flex items-center space-x-2 mt-4">
                <Checkbox
                  id="passed"
                  checked={passed}
                  onCheckedChange={(checked: boolean) => setPassed(checked)}
                />
                <label
                  htmlFor="passed"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Auditoría Aprobada
                </label>
              </div>

              <Button type="button" onClick={handleAudit} className="mt-4" disabled={loading}>
                {loading ? "Registrando..." : "Registrar Auditoría"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}