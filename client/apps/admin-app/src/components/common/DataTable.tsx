import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'

export type DataTableColumn<TRow> = {
  key: string
  header: string
  render: (row: TRow) => ReactNode
  className?: string
}

type DataTableProps<TRow> = {
  columns: DataTableColumn<TRow>[]
  rows: TRow[]
  getRowKey: (row: TRow) => string | number
  emptyTitle: string
}

export function DataTable<TRow>({
  columns,
  rows,
  getRowKey,
  emptyTitle,
}: DataTableProps<TRow>) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} />
  }

  return (
    <div className="overflow-x-auto rounded-voro-lg border border-line bg-card">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3 font-bold" key={column.key}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr className="align-top hover:bg-accent/40" key={getRowKey(row)}>
              {columns.map((column) => (
                <td className={`px-4 py-3 ${column.className || ''}`} key={column.key}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
