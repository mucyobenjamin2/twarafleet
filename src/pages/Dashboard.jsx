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
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      
      {/* HEADER WITH TITLE & OVERALL PENDING ACTION BADGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">Real-time snapshot across your fleet.</p>
        </div>
        
        {totalActionPending > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 px-3.5 py-2 rounded-xl text-xs font-black animate-pulse self-start sm:self-auto">
            <Clock size={14} />
            <span>Actions Pending Approval: {totalActionPending}</span>
          </div>
        )}
      </div>

      {/* 📊 COMBINED BIG METRICS CARD (ARRANGED AS CLEAN ROOMS/SECTIONS) */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Fleet Performance Overview</p>
            <h2 className="font-display text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">Collections & Fleet Status</h2>
          </div>
          <span className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <TrendingUp size={24} />
          </span>
        </div>

        {/* ARRANGED ROOMS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Room 1: Collected Today */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs font-black uppercase">
              <span>Collected Today</span>
              <Wallet size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="font-display text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
              {formatRWF(data.collectedTotal)}
            </p>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {collectionRate}% of {formatRWF(data.targetTotal)} target
            </p>
          </div>

          {/* Room 2: Active Motorcycles */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs font-black uppercase">
              <span>Active Motorcycles</span>
              <Bike size={18} className="text-teal-600 dark:text-teal-400" />
            </div>
            <p className="font-display text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
              {data.activeFleetCount}
            </p>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {data.motorcyclesReported}/{data.activeFleetCount} reported today
            </p>
          </div>

          {/* Room 3: Fleet Size */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs font-black uppercase">
              <span>Total Fleet Size</span>
              <Target size={18} className="text-sky-600 dark:text-sky-400" />
            </div>
            <p className="font-display text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
              {data.fleetCount}
            </p>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">
              {data.statusBreakdown.filter(s => s.status !== 'active').map(s => `${s.count} ${s.status}`).join(' · ') || 'All active'}
            </p>
          </div>
        </div>
      </div>

      {/* 📂 HIGH CONTRAST CHANNELS (MOBILE RESPONSIVE CARDS) */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          
          {/* 🟢 1. COLLECTIONS CARD */}
          <Link to="/collections" className="group flex flex-col items-center justify-center text-center p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/20 hover:border-emerald-500 transition-all shadow-sm relative">
            {pendingCounts.versements > 0 && (
              <span className="absolute -top-2 -right-2 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 shadow-md items-center gap-1">
                  <Clock size={10} /> {pendingCounts.versements}
                </span>
              </span>
            )}
            <div className="rounded-2xl p-3 sm:p-4 bg-emerald-600 text-white mb-2 shadow-md group-hover:scale-110 transition-transform"><Wallet size={20} /></div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">Collections</h4>
            <span className="text-[10px] sm:text-[11px] font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatRWF(data.collectedTotal)}</span>
          </Link>

          {/* 🔴 2. DEBTS CARD */}
          <Link to="/debts" className="group flex flex-col items-center justify-center text-center p-4 sm:p-5 rounded-2xl border-2 border-rose-500/40 bg-rose-500/10 dark:bg-rose-950/20 hover:border-rose-500 transition-all shadow-sm">
            <div className="rounded-2xl p-3 sm:p-4 bg-rose-600 text-white mb-2 shadow-md group-hover:scale-110 transition-transform"><AlertTriangle size={20} /></div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">Debts</h4>
            <span className="text-[10px] sm:text-[11px] font-mono font-black text-rose-600 dark:text-rose-400 mt-1">
              {formatRWF(data.debtTotal)}
            </span>
          </Link>

          {/* 🟣 3. TRAFFIC FINES CARD */}
          <Link to="/fines" className="group flex flex-col items-center justify-center text-center p-4 sm:p-5 rounded-2xl border-2 border-violet-500/40 bg-violet-500/10 dark:bg-violet-950/20 hover:border-violet-500 transition-all shadow-sm relative">
            {extraStats.finesStats.pendingCount > 0 && (
              <span className="absolute -top-2 -left-2 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 shadow-md items-center gap-1">
                  {extraStats.finesStats.pendingCount} Unpaid
                </span>
              </span>
            )}

            {pendingCounts.fines > 0 && (
              <span className="absolute -top-2 -right-2 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 shadow-md items-center gap-1">
                  <Clock size={10} /> {pendingCounts.fines}
                </span>
              </span>
            )}

            <div className="rounded-2xl p-3 sm:p-4 bg-violet-600 text-white mb-2 shadow-md group-hover:scale-110 transition-transform"><ShieldAlert size={20} /></div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">Traffic Fines</h4>
            <span className="text-[10px] sm:text-[11px] font-mono font-black text-violet-600 dark:text-violet-400 mt-1 truncate max-w-full">
              {extraStats.finesStats.pendingCount} Pending · {extraStats.finesStats.paidCount} Paid
            </span>
          </Link>

          {/* 🔵 4. SAVINGS CARD */}
          <Link to="/savings" className="group flex flex-col items-center justify-center text-center p-4 sm:p-5 rounded-2xl border-2 border-teal-500/40 bg-teal-500/10 dark:bg-teal-950/20 hover:border-teal-500 transition-all shadow-sm">
            <div className="rounded-2xl p-3 sm:p-4 bg-teal-600 text-white mb-2 shadow-md group-hover:scale-110 transition-transform"><Target size={20} /></div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">Savings</h4>
            <span className="text-[10px] sm:text-[11px] font-mono font-black text-teal-600 dark:text-teal-400 mt-1">{Math.round((extraStats.savingsGoal.saved / extraStats.savingsGoal.target) * 100)}% Goal</span>
          </Link>

          {/* 🟠 5. EXPENSES CARD */}
          <Link to="/expenses" className="group flex flex-col items-center justify-center text-center p-4 sm:p-5 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20 hover:border-amber-500 transition-all shadow-sm relative">
            {pendingCounts.expenses > 0 && (
              <span className="absolute -top-2 -right-2 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 shadow-md items-center gap-1">
                  <Clock size={10} /> {pendingCounts.expenses}
                </span>
              </span>
            )}
            <div className="rounded-2xl p-3 sm:p-4 bg-amber-500 text-white mb-2 shadow-md group-hover:scale-110 transition-transform"><Wrench size={20} /></div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">Expenses</h4>
            <span className="text-[10px] sm:text-[11px] font-mono font-black text-amber-600 dark:text-amber-500 mt-1">{formatRWF(extraStats.expensesApprovedSum)}</span>
          </Link>

          {/* 🟣 6. HOLIDAYS CARD */}
          <Link to="/non-working-days" className="group flex flex-col items-center justify-center text-center p-4 sm:p-5 rounded-2xl border-2 border-indigo-500/40 bg-indigo-500/10 dark:bg-indigo-950/20 hover:border-indigo-500 transition-all shadow-sm">
            <div className="rounded-2xl p-3 sm:p-4 bg-indigo-600 text-white mb-2 shadow-md group-hover:scale-110 transition-transform"><CalendarOff size={20} /></div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">Holidays</h4>
            <span className="text-[10px] sm:text-[11px] font-mono font-black text-indigo-600 dark:text-indigo-400 mt-1">{extraStats.nonWorkingCount} Off-days</span>
          </Link>

          {/* 🟤 7. LOGS CARD */}
          <Link to="/activity" className="group flex flex-col items-center justify-center text-center p-4 sm:p-5 rounded-2xl border-2 border-sky-500/40 bg-sky-500/10 dark:bg-sky-950/20 hover:border-sky-500 transition-all shadow-sm">
            <div className="rounded-2xl p-3 sm:p-4 bg-sky-600 text-white mb-2 shadow-md group-hover:scale-110 transition-transform"><History size={20} /></div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">Logs</h4>
            <span className="text-[10px] sm:text-[11px] font-mono font-black text-sky-600 dark:text-sky-400 mt-1">Audit Trail</span>
          </Link>

        </div>
      </div>
    </div>
  )
}