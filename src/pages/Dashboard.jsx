import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, AlertTriangle, Bike, TrendingUp, ChevronRight } from 'lucide-react'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { LoadingSpinner } from '../components/Feedback'
import StatusBadge from '../components/StatusBadge'
import { formatRWF, formatDate, daysUntil } from '../lib/format'
import { supabase } from '../lib/supabaseClient'

function StatTile({ icon: Icon, label, value, sub, tone }) {
  const toneClass = { moto: 'text-moto-600 bg-moto-50', cash: 'text-cash-600 bg-cash-100/60', rust: 'text-rust-600 bg-rust-100/60' }[tone] ?? 'text-ink-soft bg-paper'
  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
        <span className={`rounded-lg p-1.5 ${toneClass}`}><Icon size={15} /></span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { data, loading } = useDashboardStats()
  const [pending, setPending] = useState([])

  useEffect(() => {
    async function getPending() {
      const { data: p } = await supabase
        .from('versements')
        .select('*, motorcycles(plate_number)')
        .eq('status', 'pending')
      if (p) setPending(p)
    }
    getPending()
  }, [])

  async function handleApprove(id) {
    await supabase.from('versements').update({ status: 'approved' }).eq('id', id)
    setPending(pending.filter(item => item.id !== id))
  }

  if (loading || !data) return <LoadingSpinner label="Pulling today's numbers…" />

  const collectionRate = data.targetTotal > 0 ? Math.round((data.collectedTotal / data.targetTotal) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-soft">Real-time snapshot across your fleet.</p>
      </div>

      {/* Pending Approvals Section */}
      {pending.length > 0 && (
        <div className="rounded-2xl border border-rust-200 bg-rust-50 p-4">
          <h2 className="font-display text-base font-semibold text-rust-700">Pending Approvals ({pending.length})</h2>
          <div className="mt-2 divide-y divide-rust-100">
            {pending.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">{p.motorcycles?.plate_number ?? 'Unknown'} - {formatRWF(p.amount)}</span>
                <button onClick={() => handleApprove(p.id)} className="rounded bg-moto-500 px-3 py-1 text-xs font-medium text-white hover:bg-moto-600">Approve</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Wallet} tone="moto" label="Collected today" value={formatRWF(data.collectedTotal)} sub={`${collectionRate}% of ${formatRWF(data.targetTotal)} target`} />
        <StatTile icon={Bike} tone="moto" label="Active motorcycles" value={data.activeFleetCount} sub={`${data.motorcyclesReported}/${data.activeFleetCount} reported today`} />
        <StatTile icon={AlertTriangle} tone="rust" label="Active debts" value={data.debtCount} sub={formatRWF(data.debtTotal) + ' outstanding'} />
        <StatTile icon={TrendingUp} tone="cash" label="Fleet size" value={data.fleetCount} sub={data.statusBreakdown.filter(s => s.status !== 'active').map(s => `${s.count} ${s.status}`).join(' · ') || 'All active'} />
      </div>

      <div className="rounded-2xl border border-line bg-paper-raised p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">Recent collections</h2>
            <Link to="/collections" className="flex items-center gap-1 text-sm text-moto-600 hover:underline">View all <ChevronRight size={14} /></Link>
          </div>
          <div className="divide-y divide-line">
              {data.recentVersements.map(v => (
                <div key={v.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="plate text-[11px]">{v.motorcycles?.plate_number ?? '—'}</span>
                    <span className="text-ink-soft">{formatDate(v.collection_date)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-ink">{formatRWF(v.amount)}</span>
                    <StatusBadge status={v.status} />
                  </div>
                </div>
              ))}
          </div>
      </div>
    </div>
  )
}