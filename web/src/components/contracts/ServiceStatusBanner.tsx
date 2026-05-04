// web/src/components/contracts/ServiceStatusBanner.tsx
// Componente para mostrar el estado del servicio de cadena de suministro

'use client';

import React from 'react';
import { useSupplyChainServiceManager } from '@/hooks/useSupplyChainServiceManager';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';

export const ServiceStatusBanner: React.FC = () => {
  const { initialized, error, retry } = useSupplyChainServiceManager();

  if (initialized && !error) {
    return (
      <div className="fixed top-4 left-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
          <p className="font-medium">Conexión establecida con el contrato inteligente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-md z-50 max-w-md">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 mr-3 mt-0.5 text-yellow-500" />
        <div className="flex-1">
          <p className="font-medium">Conexión pendiente con el contrato</p>
          {error && <p className="text-sm mt-1">{error}</p>}
          <div className="mt-2 flex items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={retry}
              className="text-yellow-700 border-yellow-400 hover:bg-yellow-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
