import type { ColumnDef } from "@tanstack/react-table"
import { Netbook } from "@/types/supply-chain-types"
import { StatusBadge } from "../StatusBadge"

export const netbookColumns: ColumnDef<Netbook>[] = [
  {
    accessorKey: "serialNumber",
    header: "S/N",
    cell: ({ row }) => {
      const serial = row.getValue("serialNumber") as string
      return <div className='font-mono text-sm font-medium'>{serial}</div>;
    },
  },
  {
    accessorKey: "batchId",
    header: "Lote",
    cell: ({ row }) => {
      return <div className="text-sm text-muted-foreground">{row.getValue("batchId")}</div>;
    },
  },
  {
    accessorKey: "initialModelSpecs",
    header: "Especificaciones",
    cell: ({ row }) => {
      const specs = row.getValue("initialModelSpecs") as string
      return <div className="text-xs max-w-[200px] truncate" title={specs}>{specs}</div>;
    },
  },
  {
    accessorKey: "distributionTimestamp",
    header: "Última Act.",
    cell: ({ row }) => {
      const timestamp = row.getValue("distributionTimestamp") as string
      // Handle timestamp if it's a unix timestamp or ISO string
      const date = !isNaN(Number(timestamp))
        ? new Date(Number(timestamp) * 1000)
        : new Date(timestamp);

      return <div className="text-xs text-muted-foreground">{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "currentState",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("currentState") as string
      return <StatusBadge status={status} />;
    },
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row, table }) => {
      const netbook = row.original;
      // @ts-ignore - We'll pass this through table meta
      const onViewDetails = (table.options.meta as any)?.onViewDetails;

      return (
        <button
          onClick={() => onViewDetails?.(netbook)}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          Ver más
        </button>
      );
    },
  },
]

export type { Netbook };