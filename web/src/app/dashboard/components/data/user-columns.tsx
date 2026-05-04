import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"

export type User = {
  id: string
  address: string
  role: string
  assignedAt: string
  status: string
  loginCount: number
  lastLogin: string
}

export const userColumns: ColumnDef<User>[] = [
  {
    accessorKey: "address",
    header: "Dirección",
    cell: ({ row }) => {
      const address = row.getValue("address") as string
      return (
        <div className='font-mono text-sm'>{address.slice(0, 6)}...{address.slice(-4)}</div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Rol",
    cell: ({ row }) => {
      const role = row.getValue("role") as string
      const variantColors = {
        ADMIN_ROLE: "default",
        MANUFACTURER_ROLE: "secondary",
        DISTRIBUTOR_ROLE: "secondary",
        RETAILER_ROLE: "secondary",
        CONSUMER_ROLE: "secondary",
        LOGISTICS_ROLE: "secondary",
        QUALITY_CONTROL_ROLE: "secondary",
        REGULATORY_COMPLIANCE_ROLE: "secondary",
      }

      return (
        <Badge variant={variantColors[role as keyof typeof variantColors] as any} className='font-mono'>
          {role.replace('_ROLE', '')}
        </Badge>
      );
    },
  },
  {
    accessorKey: "assignedAt",
    header: "Asignado",
    cell: ({ row }) => {
      const date = new Date(row.getValue("assignedAt"))
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge variant={status === 'active' ? "success" : "destructive"}>
          {status === 'active' ? 'Activo' : 'Inactivo'}
        </Badge>
      );
    },
  },
  {
    accessorKey: "loginCount",
    header: "Inicios",
    cell: ({ row }) => {
      return <div className='text-center'>{row.getValue("loginCount")}</div>;
    },
  },
  {
    accessorKey: "lastLogin",
    header: "Último",
    cell: ({ row }) => {
      const date = new Date(row.getValue("lastLogin"))
      return <div className='text-sm'>{date.toLocaleDateString()}</div>
    },
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row, table }) => {
      const user = row.original;
      const meta = table.options.meta as { onDelete?: (address: string) => void };

      return (
        <div className="flex justify-end">
          <button
            onClick={() => meta?.onDelete?.(user.address)}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
            title="Eliminar cuenta"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
          </button>
        </div>
      );
    },
  },
]