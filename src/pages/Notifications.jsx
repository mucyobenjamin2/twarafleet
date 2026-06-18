import { useState } from 'react'
import { Bell, CheckCheck, RefreshCw, AlertTriangle, Wallet, PiggyBank, Info } from 'lucide-react'
import { useTable } from '../hooks/useTable'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../lib/format'
import { LoadingSpinner, EmptyState } from '../components/Feedback'

const TYPE_ICON = { reminder: AlertTriangle, debt: AlertTriangle, collection: Wallet, saving_goal: PiggyBank, system: Info }

export default function Notifications() {
  const { profile } = useAuth()
  const { rows, loading, refresh, update } = useTable('notifications', {
    orderBy: { column: 'created_at', ascending: false },
    filters: profile?.id ? [{ column: 'user_id', value: profile.id }] : []
  })
  const [generating, setGenerating] = useState(false)
  const [notice, setNotice] = useState(null)

  async function generateNow() {
    setGenerating(true)
    setNotice(null)
    const { error } = await supabase.rpc('generate_due_notifications')
    if (error) setNotice(`Could not generate: ${error.message}`)
    else setNotice('Checked all due dates — new notifications (if any) are listed below.')
    await refresh()
    setGenerating(false)
  }

  const unreadCount = rows.filter(n => !n.is_read).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Notifications</h1>
          <p className="text-sm text-ink-soft">{unreadCount} unread</p>
        </div>
        <button onClick={generateNow} disabled={generating} className="flex items-center gap-1.5 rounded-lg border border-line bg-paper-raised px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper disabled:opacity-60">
          <RefreshCw size={15} className={generating ? 'animate-spin' : ''} /> {generating ? 'Checking…' : 'Check due dates now'}
        </button>
      </div>

      {notice && <p className="rounded-lg bg-moto-50 px-3 py-2 text-sm text-moto-700">{notice}</p>}

      {loading ? (
        <LoadingSpinner />
      ) : rows.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" message="Insurance, tax, inspection and savings-goal alerts will show up here as their dates approach." />
      ) : (
        <div className="divide-y divide-line rounded-2xl border border-line bg-paper-raised">
          {rows.map(n => {
            const Icon = TYPE_ICON[n.type] ?? Info
            return (
              <div key={n.id} className={`flex items-start gap-3 px-4 py-3.5 ${!n.is_read ? 'bg-moto-50/40' : ''}`}>
                <span className={`mt-0.5 rounded-lg p-1.5 ${n.is_read ? 'bg-paper text-ink-soft' : 'bg-moto-100 text-moto-700'}`}><Icon size={15} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{n.title}</p>
                  {n.message && <p className="mt-0.5 text-sm text-ink-soft">{n.message}</p>}
                  <p className="mt-1 text-xs text-ink-soft">{formatDate(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <button onClick={() => update(n.id, { is_read: true })} className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-moto-600 hover:bg-moto-100" aria-label="Mark as read">
                    <CheckCheck size={13} /> Mark read
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
