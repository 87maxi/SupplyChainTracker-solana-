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
import { cn } from "@/lib/utils";
import { ShieldCheck, AlertCircle, Check, Loader2, Cpu, Monitor, HardDrive, Keyboard, Battery, Plug } from "lucide-react";

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

// Component config for each hardware component
const COMPONENT_CONFIGS = [
  { id: "cpu", label: "CPU", icon: Cpu },
  { id: "ram", label: "RAM", icon: Cpu },
  { id: "storage", label: "Almacenamiento", icon: HardDrive },
  { id: "display", label: "Pantalla", icon: Monitor },
  { id: "keyboard", label: "Teclado", icon: Keyboard },
  { id: "ports", label: "Puertos", icon: Plug },
  { id: "battery", label: "Batería", icon: Battery },
] as const;

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
  /* eslint-disable react-hooks/set-state-in-effect */
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
      const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
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

      const signature = await auditHardware({
        serialNumber: serial,
        passed: passed,
        reportHash: hashArray
      });

      if (signature) {
        toast({
          title: "Registro completado",
          description: "El informe de auditoría se ha registrado en la blockchain",
        });
      }
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
      <DialogContent className={cn(getDialogContentClass(), "glass-card")}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col h-full">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle>Auditoría de Hardware</DialogTitle>
                  <DialogDescription>
                    Complete el informe de auditoría y regístrelo en la blockchain
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <Card className="border-border/50 bg-gradient-to-br from-card to-secondary/20">
                <CardHeader>
                  <CardTitle className="text-lg">Complete el Informe de Auditoría</CardTitle>
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
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deviceModel">Modelo</Label>
                      <Input
                        id="deviceModel"
                        placeholder="Intel N100, 8GB RAM, 256GB SSD"
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auditDate">Fecha</Label>
                      <Input
                        id="auditDate"
                        type="date"
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auditorName">Auditor</Label>
                      <Input
                        id="auditorName"
                        placeholder="Nombre del auditor"
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="space-y-3 md:col-span-2">
                      <Label htmlFor="components">Componentes Verificados</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {COMPONENT_CONFIGS.map(({ id, label, icon: Icon }) => (
                          <div
                            key={id}
                            className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/30 transition-all duration-200"
                          >
                            <Checkbox
                              id={id}
                              className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <label
                              htmlFor={id}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="observations">Observaciones</Label>
                      <Textarea
                        id="observations"
                        placeholder="Observaciones adicionales sobre la auditoría..."
                        className="h-20 transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </form>
                </CardContent>
              </Card>

              <div className={cn(
                "flex items-center gap-3 p-4 rounded-xl border transition-all duration-300",
                passed
                  ? "border-success/30 bg-success/5"
                  : "border-destructive/30 bg-destructive/5"
              )}>
                <Checkbox
                  id="passed"
                  checked={passed}
                  onCheckedChange={(checked: boolean) => setPassed(checked)}
                  className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <div className="flex flex-col">
                  <label
                    htmlFor="passed"
                    className="text-sm font-semibold cursor-pointer"
                  >
                    {passed ? "Auditoría Aprobada" : "Auditoría Rechazada"}
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {passed ? "El hardware cumple con los estándares" : "El hardware presenta defectos"}
                  </span>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="transition-all duration-200"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleAudit}
                  disabled={loading}
                  className={cn(
                    "transition-all duration-300 shadow-md hover:shadow-lg",
                    "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Registrar Auditoría
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
