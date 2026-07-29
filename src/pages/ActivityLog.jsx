import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../lib/format'
import { History, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'

export default function Activity() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadActivityLogs() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Soma audit_logs z'uyu Admin wenyine zanditswe
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching activity logs:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivityLogs()
  }, [])

  function getBadgeStyle(type) {
    if (type.includes('APPROVED')) {
      return {
        icon: CheckCircle,
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
      }
    }
    if (type.includes('REJECTED')) {
      return {
        icon: XCircle,
        bg: 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
      }
    }
    return {
      icon: Clock,
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Activity Logs</h1>
          <p className="text-sm text-ink-soft">Audit trail ya kilometero zose n'ibikorwa byakozwe kuri fleet yawe.</p>
        </div>
        <button 
          onClick={loadActivityLogs} 
          className="p-2 border border-line rounded-xl text-ink-soft hover:text-ink bg-paper-raised transition-colors shadow-sm"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="rounded-2xl border border-line bg-paper-raised overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-soft animate-pulse">Iri kugaragaza ibikorwa by'umunsi...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-ink-soft space-y-2">
            <History className="mx-auto text-ink-soft/40" size={32} />
            <p className="text-sm font-medium">Nta gikorwa (activity) kikirandikwa uyu munsi.</p>
            <p className="text-xs">Igihe cyose wemeje (Approve) cyangwa wanze (Reject) collection/expense, birahita byandikwa hano!</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {logs.map((log) => {
              const style = getBadgeStyle(log.action_type)
              const Icon = style.icon
              return (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-paper/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl border ${style.bg} mt-0.5`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{log.description}</p>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft">
                        Category: {log.entity_type}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-ink-soft bg-paper px-3 py-1 rounded-lg border border-line w-fit">
                    {formatDate(log.created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
