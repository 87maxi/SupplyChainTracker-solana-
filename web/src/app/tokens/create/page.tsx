// web/src/app/tokens/create/page.tsx
"use client";

import { useWeb3 } from '@/hooks/useWeb3';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast'; // Importar useToast
import { Loader2, Plus, Factory } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Para redireccionar
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getRoleHashes } from '@/lib/roleUtils'; // Para obtener los hashes de roles del contrato

// Esquema de validación con Zod
const formSchema = z.object({
  serials: z.string().min(1, 'Los números de serie son requeridos.').refine(val => val.split(',').every(s => s.trim().length > 0), { message: 'Cada número de serie debe tener un valor.' }),
  batches: z.string().min(1, 'Los lotes son requeridos.').refine(val => val.split(',').every(s => s.trim().length > 0), { message: 'Cada lote debe tener un valor.' }),
  modelSpecs: z.string().min(1, 'Las especificaciones del modelo son requeridas.').refine(val => val.split(',').every(s => s.trim().length > 0), { message: 'Cada especificación debe tener un valor.' }),
});

type FormInputs = z.infer<typeof formSchema>;

export default function CreateTokensPage() {
  const { address, isConnected, connectWallet } = useWeb3();
  const { registerNetbooks, hasRole, hasRoleByHash } = useSupplyChainService();
  const { toast } = useToast();
  const router = useRouter();

  const [loadingRole, setLoadingRole] = useState(true);
  const [isManufacturer, setIsManufacturer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormInputs>({
    resolver: zodResolver(formSchema),
  });

  // Verificar rol del usuario
  useEffect(() => {
    const checkRole = async () => {
      if (isConnected && address) {
        setLoadingRole(true);
        try {
          // Obtener todos los hashes de roles del contrato
          const roleHashes = await getRoleHashes();
          
          // Verificar si el usuario tiene el rol de fabricante
          const hasManufacturerRole = await hasRoleByHash(roleHashes.FABRICANTE, address);
          setIsManufacturer(hasManufacturerRole);
        } catch (error) {
          console.error("Error checking manufacturer role:", error);
          toast({
            title: "Error de rol",
            description: "No se pudo verificar tu rol de fabricante. Intenta de nuevo.",
            variant: "destructive",
          });
          setIsManufacturer(false); // Asumir que no es fabricante si hay error
        } finally {
          setLoadingRole(false);
        }
      } else {
        setIsManufacturer(false);
        setLoadingRole(false);
      }
    };
    checkRole();
  }, [isConnected, address, hasRole, toast]);

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setIsSubmitting(true);
    try {
      // Parsear inputs como arrays
      const serialArray = data.serials.split(',').map(s => s.trim()).filter(s => s.length > 0);
      const batchArray = data.batches.split(',').map(b => b.trim()).filter(b => b.length > 0);
      const modelArray = data.modelSpecs.split(',').map(m => m.trim()).filter(m => m.length > 0);

      // Validar que los arrays tengan la misma longitud
      if (serialArray.length !== batchArray.length || serialArray.length !== modelArray.length) {
        toast({
          title: "Error de entrada",
          description: "Todos los campos deben tener el mismo número de elementos separados por comas.",
          variant: "destructive",
        });
        return;
      }

      if (!address) {
        toast({
          title: "Error",
          description: "No se pudo obtener tu dirección. Recarga la página.",
          variant: "destructive",
        });
        return;
      }

      const result = await registerNetbooks(serialArray, batchArray, modelArray, address);

      if (result.success) {
        toast({
          title: "Registro Exitoso",
          description: `Se registraron ${serialArray.length} netbooks.`,
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
      reset(); // Limpiar formulario
      router.push('/tokens'); // Redirigir a la lista de tokens
    } catch (error: any) {
      console.error('Error registering netbooks:', error);
      toast({
        title: "Error al registrar netbooks",
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
            <h3 className="text-xl font-medium text-foreground mb-2">Acceso Restringido</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Por favor, conecta tu wallet para acceder a la creación de netbooks.
            </p>
            <Button size="lg" variant="gradient" onClick={() => connectWallet()} className="h-12 px-8">
              Conectar Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingRole) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="text-lg text-muted-foreground animate-pulse">Verificando rol de fabricante...</p>
        </div>
      </div>
    );
  }

  if (!isManufacturer) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
            <Factory className="h-12 w-12 text-primary/50 mb-4" />
            <h3 className="text-xl font-medium text-foreground mb-2">Permiso Denegado</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Solo los usuarios con el rol de FABRICANTE pueden registrar nuevas netbooks. Contacta al administrador si crees que es un error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Crear NFTs de Netbooks</h1>

      <Card>
        <CardHeader>
          <CardTitle>Registrar Nuevos Netbooks</CardTitle>
          <CardDescription>Registra una o múltiples netbooks en el sistema de trazabilidad, separando los valores por comas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serials">Números de Serie (separados por comas)</Label>
                <Input
                  id="serials"
                  type="text"
                  placeholder="S12345, S67890, S11223"
                  {...register("serials")}
                />
                {errors.serials && (
                  <p className="text-sm text-red-500">{errors.serials.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="batches">Lotes (separados por comas)</Label>
                <Input
                  id="batches"
                  type="text"
                  placeholder="Lote1, Lote2, Lote3"
                  {...register("batches")}
                />
                {errors.batches && (
                  <p className="text-sm text-red-500">{errors.batches.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelSpecs">Especificaciones del Modelo (separadas por comas)</Label>
                <Input
                  id="modelSpecs"
                  type="text"
                  placeholder="ModeloA, ModeloB, ModeloC"
                  {...register("modelSpecs")}
                />
                {errors.modelSpecs && (
                  <p className="text-sm text-red-500">{errors.modelSpecs.message}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Netbooks
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}