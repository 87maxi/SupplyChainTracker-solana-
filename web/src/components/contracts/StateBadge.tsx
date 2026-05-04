'use client';

import { NetbookState } from '@/types/supply-chain-types';
import { Badge } from '@/components/ui/badge';

import { ReactNode } from 'react';

interface StateBadgeProps {
  state: number;
  className?: string;
}

export function StateBadge({ state, className = '' }: StateBadgeProps) {
  // Get the label and variant for the given state
  const label = getStateLabel(state);
  const variant = getVariant(state);

     return <Badge variant={variant} className={className}>{label}</Badge>;
}



function getStateLabel(state: number): string {
  switch (state) {
    case 0:
      return 'Fabricada';
    case 1:
      return 'HW Aprobado';
    case 2:
      return 'SW Validado';
    case 3:
      return 'Distribuida';
    default:
      return 'Desconocido';
  }
}

function getVariant(state: number): 'outline' | 'success' | 'warning' | 'default' | 'secondary' {
  switch (state) {
    case 0:
      return 'outline';
    case 1:
      return 'success';
    case 2:
      return 'warning';
    case 3:
      return 'default';
    default:
      return 'secondary';
  }
}
