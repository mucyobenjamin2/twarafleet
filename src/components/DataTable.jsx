import { Pencil, Trash2 } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatRWF, formatDate } from '../lib/format'

function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
}

export default function DataTable({ columns, rows, onEdit, onDelete }) {
  if (rows.length === 0) return null
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-paper-raised scrollbar-thin">
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
            {columns.map(col => (
              <th key={col.key} className="whitespace-nowrap px-4 py-3 font-medium">{col.label}</th>
            ))}
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-line last:border-0 hover:bg-paper">
              {columns.map(col => {
                const value = getNested(row, col.key)
                return (
                  <td key={col.key} className="whitespace-nowrap px-4 py-3 text-ink">
                    {col.plate ? (
                      <span className="plate text-xs">{value ?? '—'}</span>
                    ) : col.badge ? (
                      <StatusBadge status={value} />
                    ) : col.money ? (
                      <span className="font-mono text-sm">{formatRWF(value)}</span>
                    ) : col.date ? (
                      formatDate(value)
                    ) : col.boolean ? (
                      value ? 'Yes' : 'No'
                    ) : (
                      value ?? '—'
                    )}
                  </td>
                )
              })}
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <button onClick={() => onEdit(row)} aria-label="Edit" className="rounded-lg p-1.5 text-ink-soft hover:bg-moto-50 hover:text-moto-700">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => onDelete(row)} aria-label="Delete" className="rounded-lg p-1.5 text-ink-soft hover:bg-rust-100 hover:text-rust-600">
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
