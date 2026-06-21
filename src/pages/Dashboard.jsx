import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, AlertTriangle, Bike, TrendingUp, ChevronRight, CheckCircle } from 'lucide-react'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { LoadingSpinner } from '../components/Feedback'
import StatusBadge from '../components/StatusBadge'
import { formatRWF, formatDate } from '../lib/format'
import { supabase } from '../lib/supabaseClient'

function StatTile({ icon: Icon, label, value, sub, tone }) {
  const toneClass = { 
    moto: 'text-moto-600 bg-moto-50 dark:bg-moto-950/40 dark:text-moto-400', 
    cash: 'text-cash-600 bg-cash-100/60 dark:bg-cash-950/40 dark:text-cash-400', 
    rust: 'text-rust-600 bg-rust-100/60 dark:bg-rust-950/40 dark:text-rust-400' 
  }[tone] ?? 'text-ink-soft bg-paper'
  
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
  const statsReturn = useDashboardStats()
  const data = statsReturn?.data
  const loading = statsReturn?.loading
  
  const [pendingVersements, setPendingVersements] = useState([])
  const [pendingExpenses, setPendingExpenses] = useState([]) 

  async function loadPendingData() {
    const { data: v } = await supabase
      .from('versements')
      .select('*, motorcycles(plate_number), drivers(full_name)')
      .eq('status', 'pending') 
    if (v) setPendingVersements(v)

    const { data: e } = await supabase
      .from('expenses')
      .select('*, motorcycles(plate_number)')
      .eq('status', 'pending') 
    if (e) setPendingExpenses(e)
  }

  useEffect(() => {
    loadPendingData()
  }, [])

  async function handleApproveVersement(id) {
    try {
      const { error } = await supabase.from('versements').update({ status: 'paid' }).eq('id', id);
      if (error) throw error;
      setPendingVersements(prev => prev.filter(item => item.id !== id))
      window.location.reload()
    } catch (err) {
      console.error(err.message)
    }
  }

  async function handleApproveExpense(id) {
    try {
      const { error } = await supabase.from('expenses').update({ status: 'paid' }).eq('id', id);
      if (error) throw error;
      setPendingExpenses(prev => prev.filter(item => item.id !== id))
      window.location.reload()
    } catch (err) {
      console.error(err.message)
    }
  }

  if (loading || !data) return <LoadingSpinner label="Pulling today's numbers…" />

  const collectionRate = data.targetTotal > 0 ? Math.round((data.collectedTotal / data.targetTotal) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-soft">Real-time snapshot across your fleet.</p>
      </div>

      {/* 🌟 PENDING VERSEMENTS SECTION - BRAND CLEAN LOOK */}
      {pendingVersements.length > 0 && (
        <div className="rounded-2xl border border-line bg-paper-raised p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <span className="w-2 h-2 rounded-full bg-moto-500"></span>
            <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wide">
              Pending Collections ({pendingVersements.length})
            </h2>
          </div>
          
          <div className="mt-3 space-y-3 divide-y divide-line">
            {pendingVersements.map((p, index) => (
              <div key={p.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 ${index === 0 ? 'pt-0 border-t-0' : ''}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
                  <span className="px-2.5 py-1 text-xs font-mono font-bold bg-paper text-ink rounded-md border border-line uppercase tracking-wider">
                    {p.motorcycles?.plate_number ?? '—'}
                  </span>
                  <span className="text-ink-soft">|</span>
                  <span className="font-semibold">{p.drivers?.full_name || 'Unknown Driver'}</span>
                  <span className="text-ink-soft">·</span>
                  <span className="font-mono font-bold text-moto-600 dark:text-moto-400">
                    {formatRWF(p.amount)}
                  </span>
                  <span className="text-xs font-mono text-ink-soft bg-paper px-2 py-0.5 rounded border border-line">
                    REF: {p.reference_number || 'N/A'}
                  </span>
                </div>
                <button onClick={() => handleApproveVersement(p.id)} className="flex items-center justify-center gap-1.5 rounded-lg bg-moto-500 hover:bg-moto-600 text-white px-4 py-1.5 text-xs font-medium shadow-sm transition-all">
                  <CheckCircle size={14} /> Approve Collection
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🌟 PENDING EXPENSES SECTION - BRAND CLEAN LOOK */}
      {pendingExpenses.length > 0 && (
        <div className="rounded-2xl border border-line bg-paper-raised p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <span className="w-2 h-2 rounded-full bg-rust-500"></span>
            <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wide">
              Pending Expenses ({pendingExpenses.length})
            </h2>
          </div>
          
          <div className="mt-3 space-y-3 divide-y divide-line">
            {pendingExpenses.map((e, index) => (
              <div key={e.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 ${index === 0 ? 'pt-0 border-t-0' : ''}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
                  <span className="px-2.5 py-1 text-xs font-mono font-bold bg-paper text-ink rounded-md border border-line uppercase tracking-wider">
                    {e.motorcycles?.plate_number || 'No Plate'}
                  </span>
                  <span className="text-ink-soft">|</span>
                  <span className="font-medium text-xs uppercase tracking-wide bg-paper px-2 py-0.5 rounded border border-line">
                    {e.category}
                  </span>
                  <span className="text-ink-soft italic">"{e.description}"</span>
                  <span className="text-ink-soft">·</span>
                  <span className="font-mono font-bold text-rust-600 dark:text-rust-400">
                    {formatRWF(e.amount)}
                  </span>
                </div>
                <button onClick={() => handleApproveExpense(e.id)} className="flex items-center justify-center gap-1.5 rounded-lg bg-moto-500 hover:bg-moto-600 text-white px-4 py-1.5 text-xs font-medium shadow-sm transition-all">
                  <CheckCircle size={14} /> Approve Expense
                </button>
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
              {data.recentVersements?.map(v => (
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