'use client'

import { useState } from 'react'
import { DataTable } from "./ui/data-table"
import { netbookColumns } from "./data/netbook-columns"
import { Netbook } from "@/types/supply-chain-types"
import { NetbookDetailsModal } from "@/components/dashboard/NetbookDetailsModal"

export function NetbookDataTable({ data, onFilterChange }: { data: Netbook[]; onFilterChange: (filter: { key: string; value: string }) => void }) {
  const [filter, setFilter] = useState({ key: '', value: '' })
  const [selectedNetbook, setSelectedNetbook] = useState<Netbook | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleFilterChange = ({ key, value }: { key: string; value: string }) => {
    setFilter({ key, value })
    onFilterChange({ key, value }) // Llamar a la función de filtro externa
  }

  const handleViewDetails = (netbook: Netbook) => {
    setSelectedNetbook(netbook)
    setIsModalOpen(true)
  }

  return (
    <>
      <DataTable
        columns={netbookColumns}
        data={data}
        onFilterChange={handleFilterChange}
        // @ts-ignore - Passing meta to DataTable
        meta={{ onViewDetails: handleViewDetails }}
      />

      <NetbookDetailsModal
        netbook={selectedNetbook}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  )
}