'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from 'react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onFilterChange: (filter: { key: string; value: string }) => void
  meta?: any
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onFilterChange,
  meta
}: DataTableProps<TData, TValue>) {
  const [filterValue, setFilterValue] = useState('')
  const [filterKey, setFilterKey] = useState('')

   
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
     
    getCoreRowModel: getCoreRowModel(),
     
    getPaginationRowModel: getPaginationRowModel(),
    meta,
  })


  const handleFilterChange = () => {
    onFilterChange({ key: filterKey, value: filterValue })
  }

  return (
    <Card className="glass-card overflow-hidden texture-noise">
      {/* Top accent gradient */}
      <div className="h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-lg tracking-tight">Registros</CardTitle>
            <CardDescription className="text-xs">Visualización de datos con paginación y filtros</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Input
              placeholder="Buscar..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="w-full sm:w-[200px] bg-muted/30 border-border/60 focus:border-primary/40 transition-colors"
            />
            <Select value={filterKey} onValueChange={setFilterKey}>
              <SelectTrigger className="w-full sm:w-[180px] bg-muted/30 border-border/60">
                <SelectValue placeholder="Filtrar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="address">Dirección</SelectItem>
                <SelectItem value="serialNumber">S/N</SelectItem>
                <SelectItem value="role">Rol</SelectItem>
                <SelectItem value="status">Estado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleFilterChange} className="whitespace-nowrap hover-lift">
              Aplicar Filtro
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="table-header-gradient border-border/40">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="row-highlight border-border/30"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No se encontraron resultados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-muted-foreground">
            {data.length} registro{data.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="hover-lift"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="hover-lift"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}