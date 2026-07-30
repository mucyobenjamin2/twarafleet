import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Wallet, 
  AlertTriangle, 
  Bike, 
  TrendingUp, 
  Clock, 
  Target, 
  Wrench, 
  CalendarOff, 
  History,
  ShieldAlert
} from 'lucide-react'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { LoadingSpinner } from '../components/Feedback'
import { formatRWF } from '../lib/format'
import { supabase } from '../lib/supabaseClient'

function StatTile({ icon: Icon, label, value, sub, tone }) {
  const toneClass = { 
    moto: 'text-moto-600 bg-moto-100 dark:bg-moto-950/50 dark:text-moto-400', 
    cash: 'text-cash-600 bg-cash-200/80 dark:bg-cash-950/50 dark:text-cash-400', 
    rust: 'text-rust-600 bg-rust-200/80 dark:bg-rust-950/50 dark:text-rust-400' 
  }[tone] ?? 'text-ink-soft bg-paper'
  
  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
        <span className={`rounded-lg p-2 ${toneClass}`}><Icon size={16} /></span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const statsReturn = useDashboardStats()
  const data = statsReturn?.data
  const loading = statsReturn?.loading
  
  const [pendingCounts, setPendingCounts] = useState({
    versements: 0,
    expenses: 0,
    fines: 0
  })

  const [extraStats, setExtraStats] = useState({
    savingsGoal: { target: 0, saved: 0 },
    nonWorkingCount: 0,
    expensesApprovedSum: 0,
    finesStats: {
      pendingCount: 0,
      paidCount: 0
    }
  })

  async function loadDashboardSummaryData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Pending Collections Count
      const { count: pendingVCount } = await supabase
        .from('versements')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('owner_id', user.id)

      // 2. Pending Expenses Count
      const { data: myMotos } = await supabase
        .from('motorcycles')
        .select('id')
        .eq('owner_id', user.id)

      const myMotoIds = myMotos?.map(m => m.id) || []
      let pendingECount = 0

      if (myMotoIds.length > 0) {
        const { count: eCount } = await supabase
          .from('expenses')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .in('motorcycle_id', myMotoIds)
        
        pendingECount = eCount || 0
      }

      // 3. Traffic Fines Summary & Pending Approval Count
      const { data: finesData } = await supabase
        .from('fines')
        .select('status')
        .eq('owner_id', user.id)

      let fPendingCount = 0
      let fPaidCount = 0
      let fDriverPendingCount = 0

      if (finesData) {
        fPendingCount = finesData.filter(f => f.status !== 'approved').length
        fPaidCount = finesData.filter(f => f.status === 'approved').length
        fDriverPendingCount = finesData.filter(f => f.status === 'paid_by_driver').length
      }

      setPendingCounts({
        versements: pendingVCount || 0,
        expenses: pendingECount,
        fines: fDriverPendingCount
      })

      // 4. Savings & Expenses Approved Sum
      const { data: dbGoals } = await supabase.from('savings_goals').select('*').eq('owner_id', user.id)
      let mainGoalAmount = 5000000
      dbGoals?.forEach(g => {
        if (g.type === 'fleet_main') mainGoalAmount = parseFloat(g.target_amount)
      })

      const { data: approvedV } = await supabase.from('versements').select('amount').eq('status', 'paid').eq('owner_id', user.id)
      const { data: approvedE } = await supabase.from('expenses').select('amount').eq('status', 'approved').eq('owner_id', user.id)
      
      const vSum = approvedV?.reduce((acc, curr) => acc + curr.amount, 0) || 0
      const eSum = approvedE?.reduce((acc, curr) => acc + curr.amount, 0) || 0
      const netSaved = Math.max(0, vSum - eSum)

      const { count: nwCount } = await supabase
        .from('non_working_days')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)

      setExtraStats({
        savingsGoal: { target: mainGoalAmount, saved: netSaved },
        nonWorkingCount: nwCount || 0,
        expensesApprovedSum: eSum,
        finesStats: {
          pendingCount: fPendingCount,
          paidCount: fPaidCount
        }
      })

    } catch (err) {
      console.error('Error loading summary dashboard data:', err.message)
    }
  }

  useEffect(() => {
    loadDashboardSummaryData()
  }, [])

  if (loading || !data) return <LoadingSpinner label="Pulling today's numbers…" />

  const collectionRate = data.targetTotal > 0 ? Math.round((data.collectedTotal / data.targetTotal) * 100) : 0
  const totalActionPending = pendingCounts.versements + pendingCounts.expenses + pendingCounts.fines

  return (
    <div className="space-y-6">
      {/* HEADER WITH OVERALL PENDING ACTION BADGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-soft">Real-time snapshot across your fleet.</p>
        </div>
        
        {totalActionPending > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-xl text-xs font-bold animate-pulse">
            <Clock size={14} />
            <span>Actions Pending Approval: {totalActionPending}</span>
          </div>
        )}
      </div>

      {/* 📊 CORE METRICS TILES */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Wallet} tone="moto" label="Collected today" value={formatRWF(data.collectedTotal)} sub={`${collectionRate}% of ${formatRWF(data.targetTotal)} target`} />
        <StatTile icon={Bike} tone="moto" label="Active motorcycles" value={data.activeFleetCount} sub={`${data.motorcyclesReported}/${data.activeFleetCount} reported today`} />
        <StatTile icon={AlertTriangle} tone="rust" label="Active debts" value={data.debtCount} sub={formatRWF(data.debtTotal) + ' outstanding'} />
        <StatTile icon={TrendingUp} tone="cash" label="Fleet size" value={data.fleetCount} sub={data.statusBreakdown.filter(s => s.status !== 'active').map(s => `${s.count} ${s.status}`).join(' · ') || 'All active'} />
      </div>

      {/* 📂 HIGH CONTRAST CHANNELS (CARDS WITH PULSE ANIMATED BADGES) */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          
          {/* 🟢 1. COLLECTIONS CARD */}
          <Link to="/collections" className="group flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-950/10 hover:border-emerald-500 hover:bg-emerald-500/[0.12] transition-all shadow-sm relative">
            {pendingCounts.versements > 0 && (
              <span className="absolute -top-2 -right-2 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 shadow-md items-center gap-1">
                  <Clock size={10} /> {pendingCounts.versements}
                </span>
              </span>
            )}
            <div className="rounded-2xl p-4 bg-emerald-500 text-white mb-3 shadow-md group-hover:scale-110 transition-transform"><Wallet size={24} /></div>
            <h4 className="text-sm font-bold text-ink tracking-tight">Collections</h4>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1">{formatRWF(data.collectedTotal)}</span>
          </Link>

          {/* 🔴 2. DEBTS CARD */}
          <Link to="/debts" className="group flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-rose-500/30 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-950/10 hover:border-rose-500 hover:bg-rose-500/[0.12] transition-all shadow-sm">
            <div className="rounded-2xl p-4 bg-rose-500 text-white mb-3 shadow-md group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
            <h4 className="text-sm font-bold text-ink tracking-tight">Debts</h4>
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 mt-1">{formatRWF(data.debtTotal)}</span>
          </Link>

          {/* 🟣 3. TRAFFIC FINES CARD */}
          <Link to="/fines" className="group flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-violet-500/30 dark:border-violet-500/20 bg-violet-50/70 dark:bg-violet-950/10 hover:border-violet-500 hover:bg-violet-500/[0.12] transition-all shadow-sm relative">
            {pendingCounts.fines > 0 && (
              <span className="absolute -top-2 -right-2 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 shadow-md items-center gap-1">
                  <Clock size={10} /> {pendingCounts.fines}
                </span>
              </span>
            )}
            <div className="rounded-2xl p-4 bg-violet-600 text-white mb-3 shadow-md group-hover:scale-110 transition-transform"><ShieldAlert size={24} /></div>
            <h4 className="text-sm font-bold text-ink tracking-tight">Traffic Fines</h4>
            <span className="text-[11px] font-bold text-violet-700 dark:text-violet-400 mt-1">
              {extraStats.finesStats.pendingCount} Pending · {extraStats.finesStats.paidCount} Paid
            </span>
          </Link>

          {/* 🔵 4. SAVINGS CARD */}
          <Link to="/savings" className="group flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-teal-500/30 dark:border-teal-500/20 bg-teal-50/70 dark:bg-teal-950/10 hover:border-teal-500 hover:bg-teal-500/[0.12] transition-all shadow-sm">
            <div className="rounded-2xl p-4 bg-teal-500 text-white mb-3 shadow-md group-hover:scale-110 transition-transform"><Target size={24} /></div>
            <h4 className="text-sm font-bold text-ink tracking-tight">Savings</h4>
            <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 mt-1">{Math.round((extraStats.savingsGoal.saved / extraStats.savingsGoal.target) * 100)}% Goal</span>
          </Link>

          {/* 🟠 5. EXPENSES CARD */}
          <Link to="/expenses" className="group flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-amber-500/30 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-950/10 hover:border-amber-500 hover:bg-amber-500/[0.12] transition-all shadow-sm relative">
            {pendingCounts.expenses > 0 && (
              <span className="absolute -top-2 -right-2 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 shadow-md items-center gap-1">
                  <Clock size={10} /> {pendingCounts.expenses}
                </span>
              </span>
            )}
            <div className="rounded-2xl p-4 bg-amber-500 text-white mb-3 shadow-md group-hover:scale-110 transition-transform"><Wrench size={24} /></div>
            <h4 className="text-sm font-bold text-ink tracking-tight">Expenses</h4>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-500 mt-1">{formatRWF(extraStats.expensesApprovedSum)}</span>
          </Link>

          {/* 🟣 6. HOLIDAYS CARD */}
          <Link to="/non-working-days" className="group flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-indigo-500/30 dark:border-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-950/10 hover:border-indigo-500 hover:bg-indigo-500/[0.12] transition-all shadow-sm">
            <div className="rounded-2xl p-4 bg-indigo-500 text-white mb-3 shadow-md group-hover:scale-110 transition-transform"><CalendarOff size={24} /></div>
            <h4 className="text-sm font-bold text-ink tracking-tight">Holidays</h4>
            <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 mt-1">{extraStats.nonWorkingCount} Off-days</span>
          </Link>

          {/* 🟤 7. LOGS CARD */}
          <Link to="/activity" className="group flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-sky-500/30 dark:border-sky-500/20 bg-sky-50/70 dark:bg-sky-950/10 hover:border-sky-500 hover:bg-sky-500/[0.12] transition-all shadow-sm">
            <div className="rounded-2xl p-4 bg-sky-500 text-white mb-3 shadow-md group-hover:scale-110 transition-transform"><History size={24} /></div>
            <h4 className="text-sm font-bold text-ink tracking-tight">Logs</h4>
            <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400 mt-1">Audit Trail</span>
          </Link>

        </div>
      </div>
    </div>
  )
}