'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { useEffect, useState } from 'react';
import { Netbook } from '@/types/supply-chain-types';

interface AuditTimelineProps {
  serial: string;
}

export function AuditTimeline({ serial }: AuditTimelineProps) {
  const { getNetbookReport } = useSupplyChainService();
  const [report, setReport] = useState<Netbook | null>(null);
  
  useEffect(() => {
    const fetchReport = async () => {
      if (serial) {
        const data = await getNetbookReport(serial);
        setReport(data);
      }
    };
    fetchReport();
  }, [serial, getNetbookReport]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seguimiento de Auditoría</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {report?.hwAuditor && (
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-800 text-sm font-medium">H</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Auditoría de Hardware
                </p>
                <p className="text-sm text-gray-500 truncate">
                  Auditor: {report.hwAuditor}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  Resultado: {report.hwIntegrityPassed ? 'Aprobado' : 'Rechazado'}
                </p>
              </div>
            </div>
          )}
          
          {report?.swTechnician && (
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-800 text-sm font-medium">S</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Validación de Software
                </p>
                <p className="text-sm text-gray-500 truncate">
                  Técnico: {report.swTechnician}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  OS: {report.osVersion} - {report.swValidationPassed ? 'Aprobado' : 'Rechazado'}
                </p>
              </div>
            </div>
          )}
          
          {report?.studentIdHash && (
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-800 text-sm font-medium">E</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Asignación a Estudiante
                </p>
                <p className="text-sm text-gray-500 truncate">
                  Escuela: {report.destinationSchoolHash}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  Estudiante: {report.studentIdHash}
                </p>
              </div>
            </div>
          )}
          
          {!report && !serial && (
            <p className="text-sm text-gray-500">Seleccione un serial para ver el seguimiento</p>
          )}
          
          {report && !report.hwAuditor && !report.swTechnician && !report.studentIdHash && (
            <p className="text-sm text-gray-500">No hay registros de auditoría para este dispositivo</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}