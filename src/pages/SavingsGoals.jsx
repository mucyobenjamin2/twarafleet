import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatRWF, formatDate } from '../lib/format'
import { Target, Bike, RefreshCw, User, Plus, Calendar, X, TrendingUp, TrendingDown } from 'lucide-react'

// 🎨 Palette array y'amabara atandukanye y'amakarita ya Moto
const MOTO_CARD_COLORS = [
  {
    bg: 'bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-950/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/30'
  },
  {
    bg: 'bg-indigo-500/10 border-indigo-500/30 dark:bg-indigo-950/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    badge: 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 border-indigo-500/30'
  },
  {
    bg: 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/20',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/30'
  },
  {
    bg: 'bg-violet-500/10 border-violet-500/30 dark:bg-violet-950/20',
    text: 'text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-500/20 text-violet-800 dark:text-violet-200 border-violet-500/30'
  },
  {
    bg: 'bg-sky-500/10 border-sky-500/30 dark:bg-sky-950/20',
    text: 'text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-500/20 text-sky-800 dark:text-sky-200 border-sky-500/30'
  },
  {
    bg: 'bg-rose-500/10 border-rose-500/30 dark:bg-rose-950/20',
    text: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/30'
  }
]

export default function SavingsGoals() {
  const [loading, setLoading] = useState(true)
  const [motorcycles, setMotorcycles] = useState([])
  const [rawMotos, setRawMotos] = useState([]) 
  
  // 📊 Core Financial Equation States
  const [globalCollected, setGlobalCollected] = useState(0)
  const [globalExpenses, setGlobalExpenses] = useState(0)
  const [globalNetTotal, setGlobalNetTotal] = useState(0)

  // 🎯 Active Fleet Goal States
  const [fleetGoalId, setFleetGoalId] = useState(null)
  const [fleetGoalAmount, setFleetGoalAmount] = useState(0)
  const [fleetGoalTitle, setFleetGoalTitle] = useState('')
  const [fleetGoalDesc, setFleetGoalDesc] = useState('')
  const [fleetTargetDate, setFleetTargetDate] = useState('')
  
  // 📝 Modal State & Form Input States
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [descInput, setDescInput] = useState('')
  const [goalInput, setGoalInput] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadSavingsGoalsCorePipeline() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Soma active motorcycles
      const { data: motos } = await supabase
        .from('motorcycles')
        .select('id, plate_number')
        .eq('owner_id', user.id)
        .eq('status', 'active')

      setRawMotos(motos || [])

      // 2. Soma active driver assignments
      const { data: assignments } = await supabase
        .from('driver_assignments')
        .select('*, drivers(id, full_name)')
        .eq('owner_id', user.id)
        .eq('is_active', true)

      // 3. Soma versements zose zishyuwe (Paid)
      const { data: versements } = await supabase
        .from('versements')
        .select('*')
        .eq('owner_id', user.id)
        .eq('status', 'paid')

      // 4. Soma expenses zose zemejwe (Approved)
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('owner_id', user.id)
        .eq('status', 'approved')

      // 5. Soma Fleet Goal hamwe n'ibitabo byayo
      const { data: dbGoals } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('owner_id', user.id)
        .eq('type', 'fleet_main')
        .maybeSingle()

      if (dbGoals) {
        setFleetGoalId(dbGoals.id)
        setFleetGoalAmount(parseFloat(dbGoals.target_amount) || 0)
        setFleetGoalTitle(dbGoals.goal_name || dbGoals.title || dbGoals.name || 'Fleet Savings Milestone')
        setFleetGoalDesc(dbGoals.description || '')
        setFleetTargetDate(dbGoals.target_date || '')

        // Populate modal inputs
        setTitleInput(dbGoals.goal_name || dbGoals.title || dbGoals.name || '')
        setDescInput(dbGoals.description || '')
        setGoalInput(dbGoals.target_amount || '')
        setDateInput(dbGoals.target_date || '')
      } else {
        setFleetGoalId(null)
        setFleetGoalAmount(0)
        setFleetGoalTitle('')
        setFleetGoalDesc('')
        setFleetTargetDate('')
      }

      // 6. KUBARA RUSANGE
      const totalCollectedCalc = versements?.reduce((acc, curr) => acc + curr.amount, 0) || 0
      const totalExpensesCalc = expenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0
      const netTotalCalc = totalCollectedCalc - totalExpensesCalc

      setGlobalCollected(totalCollectedCalc)
      setGlobalExpenses(totalExpensesCalc)
      setGlobalNetTotal(netTotalCalc)

      // 7. KUBARA IMIBARE YA BURI MOTO
      const calculatedMotos = motos?.map(moto => {
        const assign = assignments?.find(a => a.motorcycle_id === moto.id)
        const driverName = assign?.drivers?.full_name || 'No Driver Assigned'
        const driverId = assign?.drivers?.id

        const motoPaid = versements?.filter(v => 
          v.motorcycle_id === moto.id || (driverId && v.driver_id === driverId)
        ).reduce((acc, curr) => acc + curr.amount, 0) || 0

        const motoExp = expenses?.filter(e => e.motorcycle_id === moto.id).reduce((acc, curr) => acc + curr.amount, 0) || 0
        const netTotal = motoPaid - motoExp

        return {
          plate: moto.plate_number,
          driver: driverName,
          grossPaid: motoPaid,
          expensesDeducted: motoExp,
          netTotal
        }
      }) || []

      setMotorcycles(calculatedMotos)
    } catch (err) {
      console.error('Error fetching savings matrix:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSavingsGoalsCorePipeline()
  }, [])

  // 🛠️ SUBMIT NEW FLEET GOAL IN MODAL
  const handleCreateFleetGoal = async (e) => {
    e.preventDefault()
    if (!titleInput || !goalInput || isNaN(goalInput) || parseFloat(goalInput) <= 0) {
      alert('Nyamuneka injiza Umutwe (Title) n\'Amafaranga y\'intego!')
      return
    }

    try {
      setSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Nta mukoresha winjiye mu bitabo.")

      const amount = parseFloat(goalInput)
      const fallbackMotorcycleId = rawMotos[0]?.id || null

      const payload = {
        type: 'fleet_main',
        title: titleInput,
        name: titleInput,
        goal_name: titleInput,
        description: descInput,
        target_amount: amount,
        target_date: dateInput || null,
        owner_id: user.id,
        motorcycle_id: fallbackMotorcycleId
      }

      if (fleetGoalId) {
        payload.id = fleetGoalId
      }

      const { error } = await supabase
        .from('savings_goals')
        .upsert([payload], { onConflict: 'id' })

      if (error) throw error
      alert('Intego yaguzwe neza mu bitabo! 🎯')
      setShowGoalModal(false)
      await loadSavingsGoalsCorePipeline()
    } catch (err) {
      alert('Habonetse ikosa: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-sm font-bold text-ink-soft animate-pulse">Iri gushaka imibare n'intego z'ubwizigame...</div>
  }

  const goalProgressPercentage = fleetGoalAmount > 0
    ? Math.min(100, Math.round((globalNetTotal / fleetGoalAmount) * 100))
    : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* HEADER WITH ADD/UPDATE GOAL BUTTON */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-black text-ink flex items-center gap-2">
            <Target className="text-teal-600 dark:text-teal-400" size={28} /> Fleet Financial Savings Goals
          </h1>
          <p className="text-sm font-bold text-ink-soft">Total Collected - Total Expenses = Net Fleet Balance.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowGoalModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition whitespace-nowrap"
          >
            <Plus size={18} /> {fleetGoalAmount > 0 ? 'Update Goal' : 'Add New Goal'}
          </button>

          <button onClick={loadSavingsGoalsCorePipeline} className="p-2.5 border border-line rounded-xl text-ink-soft hover:text-ink bg-paper transition-colors shadow-sm">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* 📊 FINANCIAL EQUATION CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper-raised p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-ink-soft">Total Collected Amount</p>
          <p className="mt-2 font-display text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatRWF(globalCollected)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper-raised p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-ink-soft">Total Expenses Deducted</p>
          <p className="mt-2 font-display text-2xl font-black text-rose-600 dark:text-rose-400">-{formatRWF(globalExpenses)}</p>
        </div>
        <div className="rounded-2xl border-2 border-teal-500/40 bg-teal-500/10 dark:bg-teal-950/20 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-teal-700 dark:text-teal-400">Total Net Amount (Fleet Savings)</p>
          <p className="mt-2 font-display text-2xl font-black text-teal-600 dark:text-teal-400">{formatRWF(globalNetTotal)}</p>
        </div>
      </div>

      {/* 🎯 ACTIVE GOAL PROGRESS DISPLAY */}
      {fleetGoalAmount > 0 && (
        <div className="rounded-2xl border border-line bg-paper-raised p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target size={15} /> Active Goal Overview
              </span>
              <h3 className="font-display text-xl font-black text-ink mt-1">{fleetGoalTitle}</h3>
              {fleetGoalDesc && <p className="text-xs font-bold text-ink-soft max-w-xl mt-1">{fleetGoalDesc}</p>}
              {fleetTargetDate && (
                <p className="text-xs font-bold text-ink-soft flex items-center gap-1 font-mono mt-1.5">
                  <Calendar size={13} className="text-teal-600 dark:text-teal-400" /> Target Date: {formatDate(fleetTargetDate)}
                </p>
              )}
            </div>
            <div className="text-right whitespace-nowrap">
              <p className="text-xs font-bold text-ink-soft">Target Amount</p>
              <p className="font-display text-xl font-black text-ink">{formatRWF(fleetGoalAmount)}</p>
              <p className="text-2xl font-mono font-black text-teal-600 dark:text-teal-400 mt-1">{goalProgressPercentage}%</p>
            </div>
          </div>

          <div className="w-full bg-paper rounded-full h-3 border border-line overflow-hidden p-0.5">
            <div className="bg-teal-600 dark:bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${goalProgressPercentage}%` }}></div>
          </div>
        </div>
      )}

      {/* 🏍️ COLORFUL MOTORCYCLES PERFORMANCE MATRIX */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-ink flex items-center gap-2">
            <Bike size={16} className="text-teal-600 dark:text-teal-400" /> Motorcycles Net Performance ({motorcycles.length})
          </h2>
        </div>

        {/* COLORFUL COMPACT CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {motorcycles.map((row, idx) => {
            const theme = MOTO_CARD_COLORS[idx % MOTO_CARD_COLORS.length]
            return (
              <div 
                key={idx} 
                className={`p-4 rounded-2xl border transition-all shadow-sm space-y-3 hover:scale-105 ${theme.bg}`}
              >
                {/* Header: Plate & Driver */}
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2">
                  <span className={`plate text-xs font-mono font-black border px-2.5 py-0.5 rounded uppercase ${theme.badge}`}>
                    {row.plate}
                  </span>
                  <span className="text-[11px] font-black text-ink flex items-center gap-1 truncate max-w-[120px]">
                    <User size={12} className="opacity-70" /> {row.driver}
                  </span>
                </div>

                {/* Net Balance (Highlight Color) */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft">Net Balance</p>
                  <p className={`text-xl font-mono font-black mt-0.5 ${theme.text}`}>
                    {formatRWF(row.netTotal)}
                  </p>
                </div>

                {/* Breakdown Rows: Gross Paid vs Expenses */}
                <div className="pt-1.5 border-t border-black/10 dark:border-white/10 flex justify-between text-[11px] font-mono font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <TrendingUp size={12} /> +{formatRWF(row.grossPaid)}
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <TrendingDown size={12} /> -{formatRWF(row.expensesDeducted)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 📝 MODAL POPUP FOR CONFIGURE FLEET GOAL */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-paper rounded-2xl border border-line w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-lg font-black text-ink flex items-center gap-2">
                <Target className="text-teal-600 dark:text-teal-400" size={20} /> Configure Fleet Goal Target
              </h2>
              <button onClick={() => setShowGoalModal(false)} className="text-ink-soft hover:text-ink">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateFleetGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Goal Name / Title *
                </label>
                <input
                  type="text"
                  placeholder="Urugero: Kwishyura Moto Nshya"
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Target Amount (RWF) *
                </label>
                <input
                  type="number"
                  placeholder="5000000"
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm text-ink font-bold focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Target Date (Deadline) *
                </label>
                <input
                  type="date"
                  value={dateInput}
                  onChange={e => setDateInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm text-ink font-bold focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Description / Notes (Optionnel)
                </label>
                <textarea
                  placeholder="Gusobanura muri make..."
                  value={descInput}
                  onChange={e => setDescInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm text-ink font-bold focus:outline-none focus:border-teal-500"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-line font-bold text-ink-soft hover:bg-paper-raised transition"
                >
                  Siba
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 font-bold text-white hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Iri kubika...' : fleetGoalAmount > 0 ? 'Update Goal' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}