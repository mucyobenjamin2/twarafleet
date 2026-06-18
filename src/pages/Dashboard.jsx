import { Link } from 'react-router-dom'
import { Wallet, AlertTriangle, Bike, TrendingUp, ChevronRight } from 'lucide-react'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { LoadingSpinner } from '../components/Feedback'
import StatusBadge from '../components/StatusBadge'
import { formatRWF, formatDate, daysUntil } from '../lib/format'

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

function UpcomingRow({ label, plate, date }) {
  const d = daysUntil(date)
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <div>
        <p className="text-ink">{label}</p>
        {plate && <span className="plate mt-0.5 inline-block text-[11px]">{plate}</span>}
      </div>
      <div className="text-right">
        <p className="text-ink-soft">{formatDate(date)}</p>
        <p className={`text-xs ${d <= 3 ? 'text-rust-500' : 'text-ink-soft'}`}>{d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `in ${d} days`}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data, loading } = useDashboardStats()

  if (loading || !data) return <LoadingSpinner label="Pulling today's numbers…" />

  const collectionRate = data.targetTotal > 0 ? Math.round((data.collectedTotal / data.targetTotal) * 100) : 0
  const upcomingItems = [
    ...data.upcoming.insurance.map(i => ({ label: 'Insurance expiry', plate: i.motorcycles?.plate_number, date: i.expiry_date })),
    ...data.upcoming.tax.map(t => ({ label: 'Tax due', plate: t.motorcycles?.plate_number, date: t.due_date })),
    ...data.upcoming.inspections.map(i => ({ label: 'Inspection due', plate: i.motorcycles?.plate_number, date: i.next_due_date })),
    ...data.upcoming.reminders.map(r => ({ label: r.title, plate: null, date: r.due_date }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-soft">Real-time snapshot across your fleet.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Wallet} tone="moto" label="Collected today" value={formatRWF(data.collectedTotal)} sub={`${collectionRate}% of ${formatRWF(data.targetTotal)} target`} />
        <StatTile icon={Bike} tone="moto" label="Active motorcycles" value={data.activeFleetCount} sub={`${data.motorcyclesReported}/${data.activeFleetCount} reported today`} />
        <StatTile icon={AlertTriangle} tone="rust" label="Active debts" value={data.debtCount} sub={formatRWF(data.debtTotal) + ' outstanding'} />
        <StatTile icon={TrendingUp} tone="cash" label="Fleet size" value={data.fleetCount} sub={data.statusBreakdown.filter(s => s.status !== 'active').map(s => `${s.count} ${s.status}`).join(' · ') || 'All active'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper-raised p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">Recent collections</h2>
            <Link to="/collections" className="flex items-center gap-1 text-sm text-moto-600 hover:underline">View all <ChevronRight size={14} /></Link>
          </div>
          {data.recentVersements.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">No collections recorded yet.</p>
          ) : (
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
          )}
        </div>

        <div className="rounded-2xl border border-line bg-paper-raised p-4">
          <h2 className="mb-3 font-display text-base font-semibold text-ink">Coming up</h2>
          {upcomingItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">Nothing due in the next 14 days.</p>
          ) : (
            <div className="divide-y divide-line">
              {upcomingItems.map((item, i) => <UpcomingRow key={i} {...item} />)}
            </div>
          )}
        </div>
      </div>

      {(data.savingsGoals.length > 0 || data.fleetGoals.length > 0) && (
        <div className="rounded-2xl border border-line bg-paper-raised p-4">
          <h2 className="mb-3 font-display text-base font-semibold text-ink">Savings progress</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[...data.fleetGoals.map(g => ({ ...g, plate: 'Fleet-wide' })), ...data.savingsGoals.map(g => ({ ...g, plate: g.motorcycles?.plate_number }))].map(goal => {
              const pct = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0
              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink">{goal.goal_name}</span>
                    <span className="text-xs text-ink-soft">{goal.plate}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-paper">
                    <div className="h-full rounded-full bg-moto-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">{formatRWF(goal.current_amount)} of {formatRWF(goal.target_amount)} ({pct}%)</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
