import { History } from 'lucide-react'
import { useTable } from '../hooks/useTable'
import { LoadingSpinner, EmptyState } from '../components/Feedback'
import { formatDate } from '../lib/format'

const ACTION_LABEL = { create: 'Created', update: 'Updated', delete: 'Deleted' }

export default function ActivityLog() {
  const { rows, loading } = useTable('activity_logs', { orderBy: { column: 'created_at', ascending: false } })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Activity log</h1>
        <p className="text-sm text-ink-soft">A read-only audit trail of every change made in TwaraFleet.</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : rows.length === 0 ? (
        <EmptyState icon={History} title="No activity yet" message="Every create, edit, and delete across the app will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper-raised scrollbar-thin">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(log => (
                <tr key={log.id} className="border-b border-line last:border-0 hover:bg-paper">
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatDate(log.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink">{ACTION_LABEL[log.action] ?? log.action}</td>
                  <td className="whitespace-nowrap px-4 py-3 capitalize text-ink">{log.entity_type?.replace('_', ' ')}</td>
                  <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-ink-soft">{log.details ? JSON.stringify(log.details) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
