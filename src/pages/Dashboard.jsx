import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Wallet, 
  AlertTriangle, 
  Bike, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Target, 
  Wrench, 
  CalendarOff, 
  History,
  XCircle
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
  
  const [pendingVersements, setPendingVersements] = useState([])
  const [pendingExpenses, setPendingExpenses] = useState([])
  
  const [extraStats, setExtraStats] = useState({
    savingsGoal: { target: 0, saved: 0 },
    nonWorkingCount: 0,
    expensesApprovedSum: 0
  })

  async function loadPendingAndExtraData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Pending My Collections
      const { data: v } = await supabase
        .from('versements')
        .select('*, motorcycles(plate_number, owner_id), drivers(full_name)')
        .eq('status', 'pending')
        .eq('owner_id', user.id) 
        .order('created_at', { ascending: false })
      if (v) setPendingVersements(v)

      // 2. Pending My Expenses
      const { data: myMotos } = await supabase
        .from('motorcycles')
        .select('id, owner_id')
        .eq('owner_id', user.id)

      const myMotoIds = myMotos?.map(m => m.id) || []

      if (myMotoIds.length > 0) {
        const { data: e } = await supabase
          .from('expenses')
          .select('*, motorcycles(plate_number, owner_id)')
          .eq('status', 'pending')
          .in('motorcycle_id', myMotoIds)
          .order('created_at', { ascending: false })
        
        if (e) {
          const finalExps = e.filter(item => item.motorcycles?.owner_id === user.id)
          setPendingExpenses(finalExps)
        }
      } else {
        setPendingExpenses([])
      }

      // 3. Extra Stats
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
        expensesApprovedSum: eSum
      })

    } catch (err) {
      console.error('Error loading extra dashboard stats:', err.message)
    }
  }

  useEffect(() => {
    loadPendingAndExtraData()
  }, [])

  // ✅ ACTION 1: APPROVE VERSEMENT
  async function handleApproveVersement(id) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('versements')
        .update({ status: 'paid', owner_id: user.id })
        .eq('id', id);

      if (error) throw error;
      setPendingVersements(prev => prev.filter(item => item.id !== id))
      window.location.reload()
    } catch (err) {
      console.error(err.message)
    }
  }

  // ❌ ACTION 2: REJECT VERSEMENT (IKORA DEBT UTABONYE AMAFARANGA)
  async function handleRejectVersement(id) {
    if (!window.confirm('Ese urashaka kwanga (Reject) iyi versement? Ibi birahita byandika ideni ry\'uwo munsi ku mu-driver!')) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('versements')
        .update({ status: 'rejected', owner_id: user.id })
        .eq('id', id);

      if (error) throw error;
      setPendingVersements(prev => prev.filter(item => item.id !== id))
      window.location.reload()
    } catch (err) {
      console.error(err.message)
    }
  }

  async function handleApproveExpense(id) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('expenses')
        .update({ status: 'approved', owner_id: user.id })
        .eq('id', id);

      if (error) throw error;
      setPendingExpenses(prev => prev.filter(item => item.id !== id))
      window.location.reload()
    } catch (err) {
      console.error(err.message)
    }
  }

  async function handleRejectExpense(id) {
    if (!window.confirm('Ese urashaka kwanga (Reject) iyi depanse?')) return
    try {
      const { error } = await supabase.from('expenses').update({ status: 'rejected' }).eq('id', id);
      if (error) throw error;
      setPendingExpenses(prev => prev.filter(item => item.id !== id))
      window.location.reload()
    } catch (err) {
      console.error(err.message)
    }
  }

  if (loading || !data) return <LoadingSpinner label="Pulling today's numbers…" />

  const collectionRate = data.targetTotal > 0 ? Math.round((data.collectedTotal / data.targetTotal) * 100) : 0
  const totalPendingCount = pendingVersements.length + pendingExpenses.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-soft">Real-time snapshot across your fleet.</p>
        </div>
        
        {totalPendingCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-xl text-xs font-bold animate-pulse">
            <Clock size={14} />
            <span>Actions Pending: {totalPendingCount}</span>
          </div>
        )}
      </div>

      {/* 🌟 MY PENDING VERSEMENTS WITH REJECT OPTION */}
      {pendingVersements.length > 0 && (
        <div className="rounded-2xl border border-line bg-paper-raised p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <span className="w-2 h-2 rounded-full bg-moto-500"></span>
            <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wide">
              Pending Collections Verification ({pendingVersements.length})
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

                {/* 🌟 UTUBUTO TWBIRI: APPROVE & REJECT */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleApproveVersement(p.id)} 
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-medium shadow-sm transition-all"
                  >
                    <CheckCircle size={14} /> Approve Payment
                  </button>
                  <button 
                    onClick={() => handleRejectVersement(p.id)} 
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 text-xs font-medium shadow-sm transition-all"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🌟 MY PENDING EXPENSES */}
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
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleApproveExpense(e.id)} 
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium shadow-sm transition-all"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleRejectExpense(e.id)} 
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 text-xs font-medium shadow-sm transition-all"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📊 CORE METRICS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Wallet} tone="moto" label="Collected today" value={formatRWF(data.collectedTotal)} sub={`${collectionRate}% of ${formatRWF(data.targetTotal)} target`} />
        <StatTile icon={Bike} tone="moto" label="Active motorcycles" value={data.activeFleetCount} sub={`${data.motorcyclesReported}/${data.activeFleetCount} reported today`} />
        <StatTile icon={AlertTriangle} tone="rust" label="Active debts" value={data.debtCount} sub={formatRWF(data.debtTotal) + ' outstanding'} />
        <StatTile icon={TrendingUp} tone="cash" label="Fleet size" value={data.fleetCount} sub={data.statusBreakdown.filter(s => s.status !== 'active').map(s => `${s.count} ${s.status}`).join(' · ') || 'All active'} />
      </div>

      {/* 📂 HIGH CONTRAST CHANNELS */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link to="/collections" className="group flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-950/10 hover:border-emerald-500 hover:bg-emerald-500/[0.12] transition-all shadow-sm">
            <div className="rounded-2xl p-4 bg-emerald-500 text-white mb-3 shadow-md group-hover:scale-110 transition-transform"><Wallet size={24} /></div>
            <h4 className="text-sm font-bold text-ink tracking-tight">Collections</h4>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1">{formatRWF(data.collectedTotal)}</span>
          </Link>

          <Link to="/debts" className="group flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-rose-500/30 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-950/10 hover:border-rose-500 hover:bg-rose-500/[0.12] transition-all shadow-sm">
            <div className="rounded-2xl p-4 bg-rose-500 text-white mb-3 shadow-md group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
            <h4 className="text-sm font-bold text-ink tracking-tight">Debts</h4>
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 mt-1">{formatRWF(data.debtTotal)}</span>
          </Link>

          <Link to="/savings" className="group flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-teal-500/30 dark:border-teal-500/20 bg-teal-50/70 dark:bg-teal-950/10 hover:border-teal-500 hover:bg-teal-500/[0.12] transition-all shadow-sm">
            <div className="rounded-2xl p-4 bg-teal-500 text-white mb-3 shadow-md group-hover:scale-110 transition-transform"><Target size={24} /></div>
            <h4 className="text-sm font-bold text-ink tracking-tight">Savings</h4>
            <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 mt-1">{Math.round((extraStats.savingsGoal.saved / extraStats.savingsGoal.target) * 100)}% Goal</span>
          </Link>

          <Link to="/expenses" className="group flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-amber-500/30 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-950/10 hover:border-amber-500 hover:bg-amber-500/[0.12] transition-all shadow-sm">
            <div className="rounded-2xl p-4 bg-amber-500 text-white mb-3 shadow-md group-hover:scale-110 transition-transform"><Wrench size={24} /></div>
            <h4 className="text-sm font-bold text-ink tracking-tight">Expenses</h4>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-500 mt-1">{formatRWF(extraStats.expensesApprovedSum)}</span>
          </Link>

          <Link to="/non-working-days" className="group flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-indigo-500/30 dark:border-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-950/10 hover:border-indigo-500 hover:bg-indigo-500/[0.12] transition-all shadow-sm">
            <div className="rounded-2xl p-4 bg-indigo-500 text-white mb-3 shadow-md group-hover:scale-110 transition-transform"><CalendarOff size={24} /></div>
            <h4 className="text-sm font-bold text-ink tracking-tight">Holidays</h4>
            <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 mt-1">{extraStats.nonWorkingCount} Off-days</span>
          </Link>

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
