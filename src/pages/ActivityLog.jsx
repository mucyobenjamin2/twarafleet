import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { History, RefreshCw } from 'lucide-react'
import { LoadingSpinner, EmptyState } from '../components/Feedback'
import { formatDate } from '../lib/format'

const ACTION_LABEL = { create: 'Created', update: 'Updated', delete: 'Deleted' }

export default function ActivityLog() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadLogs() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Soma directly activity_logs nta handi unyuze
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('owner_id', user.id) // 🔥 Kuyungurura ku makuru y'uyu Admin gusa
        .order('created_at', { ascending: false }) // 🔥 Ibyanditswe vuba bije hejuru!

      if (error) throw error
      setRows(data || [])
    } catch (err) {
      console.error('Error loading activity logs:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Activity log</h1>
          <p className="text-sm text-ink-soft">A read-only audit trail of every change made in TwaraFleet.</p>
        </div>
        <button 
          onClick={loadLogs} 
          className="p-2 border border-line rounded-lg text-ink-soft hover:text-ink bg-paper transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : rows.length === 0 ? (
        <EmptyState 
          icon={History} 
          title="No activity yet" 
          message="Every create, edit, and delete across the app will appear here." 
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper-raised scrollbar-thin">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft bg-paper">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(log => (
                <tr key={log.id} className="border-b border-line last:border-0 hover:bg-paper/40 transition-colors">
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft font-mono text-xs">{formatDate(log.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      log.action === 'create' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                      log.action === 'update' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400' :
                      'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
                    }`}>
                      {ACTION_LABEL[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 capitalize font-semibold text-ink">{log.entity_type?.replace('_', ' ')}</td>
                  <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-ink-soft">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}