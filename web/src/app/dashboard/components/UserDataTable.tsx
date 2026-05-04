'use client'

import { useState } from 'react'
import { DataTable } from "./ui/data-table"
import { userColumns, User } from "./data/user-columns"

export function UserDataTable({
  data,
  onFilterChange,
  onDelete
}: {
  data: User[];
  onFilterChange: (filter: { key: string; value: string }) => void;
  onDelete?: (address: string) => void;
}) {
  const [filter, setFilter] = useState({ key: '', value: '' })

  const handleFilterChange = ({ key, value }: { key: string; value: string }) => {
    setFilter({ key, value })
    onFilterChange({ key, value }) // Llamar a la función de filtro externa
  }

  return (
    <DataTable
      columns={userColumns}
      data={data}
      onFilterChange={handleFilterChange}
      meta={{ onDelete }}
    />
  )
}