"use client";

import { Badge } from "@/components/ui/badge";
import { NetbookState } from "@/types/supply-chain-types";

interface StatusBadgeProps {
    status: string | NetbookState;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'FABRICADA':
                return { label: 'Fabricada', variant: 'secondary' as const };
            case 'HW_APROBADO':
                return { label: 'HW Aprobado', variant: 'success' as const };
            case 'SW_VALIDADO':
                return { label: 'SW Validado', variant: 'warning' as const };
            case 'DISTRIBUIDA':
                return { label: 'Distribuida', variant: 'outline' as const };
            default:
                return { label: status, variant: 'outline' as const };
        }
    };

    const { label, variant } = getStatusStyles(status);

    return (
        <Badge variant={variant}>
            {label}
        </Badge>
    );
}
