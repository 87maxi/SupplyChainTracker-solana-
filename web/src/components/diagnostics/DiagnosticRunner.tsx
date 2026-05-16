"use client";

import { useEffect } from 'react';

// Componente para ejecutar diagnósticos - Legacy contractRegistry removed
export default function DiagnosticRunner() {
  useEffect(() => {
    console.log('--- Inicio de Diagnóstico (Solana) ---');
    console.log('ℹ️ contractRegistry removed - use useSupplyChainService instead');
    console.log('--- Fin de Diagnóstico (Solana) ---');
  }, []);
  
  return null;
}
