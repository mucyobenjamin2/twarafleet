import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatRWF, formatDate } from '../lib/format'
import { Target, Bike, RefreshCw, User, Plus, Calendar, FileText } from 'lucide-react'

export default function SavingsGoals() {
  const [loading, setLoading] = useState(true)
  const [motorcycles, setMotorcycles] = useState([])
  
  // 📊 Core Financial Equation States
  const [globalCollected, setGlobalCollected] = useState(0)
  const [globalExpenses, setGlobalExpenses] = useState(0)
  const [globalNetTotal, setGlobalNetTotal] = useState(0)

  // 🎯 Active Fleet Goal States
  const [fleetGoalAmount, setFleetGoalAmount] = useState(0)
  const [fleetGoalTitle, setFleetGoalTitle] = useState('')
  const [fleetGoalDesc, setFleetGoalDesc] = useState('')
  const [fleetTargetDate, setFleetTargetDate] = useState('')
  
  // 📝 Form Input States
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

      // 5. Soma Fleet Goal hamwe n'ibitabo byayo byose
      const { data: dbGoals } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('type', 'fleet_main')
        .maybeSingle()

      if (dbGoals) {
        setFleetGoalAmount(parseFloat(dbGoals.target_amount) || 0)
        setFleetGoalTitle(dbGoals.title || dbGoals.name || 'Fleet Savings Milestone')
        setFleetGoalDesc(dbGoals.description || '')
        setFleetTargetDate(dbGoals.target_date || '')
      } else {
        setFleetGoalAmount(0)
        setFleetGoalTitle('')
        setFleetGoalDesc('')
        setFleetTargetDate('')
      }

      // 6. KUBARA RUSANGE (Total Collected - Total Expenses = Net Total)
      const totalCollectedCalc = versements?.reduce((acc, curr) => acc + curr.amount, 0) || 0
      const totalExpensesCalc = expenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0
      const netTotalCalc = totalCollectedCalc - totalExpensesCalc

      setGlobalCollected(totalCollectedCalc)
      setGlobalExpenses(totalExpensesCalc)
      setGlobalNetTotal(netTotalCalc)

      // 7. KUBARA IMIBARE YA BURI MOTO (Versements - Expenses)
      const calculatedMotos = motos?.map(moto => {
        const assign = assignments?.find(a => a.motorcycle_id === moto.id)
        const driverName = assign?.drivers?.full_name || 'No Driver Assigned'
        const driverId = assign?.drivers?.id

        const motoPaid = versements?.filter(v => 
          v.motorcycle_id === moto.id || (driverId && v.driver_id === driverId)
        ).reduce((acc, curr) => acc + curr.amount, 0) || 0

        const motoExp = expenses?.filter(e => e.motorcycle_id === moto.id).reduce((acc, curr) => acc + curr.amount, 0) || 0

        return {
          plate: moto.plate_number,
          driver: driverName,
          grossPaid: motoPaid,
          expensesDeducted: motoExp,
          netTotal: motoPaid - motoExp
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

  // 🛠️ SUBMIT NEW FLEET GOAL YUZUYE IMYEYO
  const handleCreateFleetGoal = async (e) => {
    e.preventDefault()
    if (!titleInput || !goalInput || isNaN(goalInput) || parseFloat(goalInput) <= 0) {
      alert('Nyamuneka injiza Umutwe (Title) n\'Amafaranga y\'intego!')
      return
    }

    try {
      setSubmitting(true)
      const amount = parseFloat(goalInput)

      const { error } = await supabase
        .from('savings_goals')
        .upsert([{ 
          id: 'fleet-main-id-static', 
          type: 'fleet_main', 
          title: titleInput,
          name: titleInput, // Duhuze zombi ngo hatagira ishikisha
          description: descInput,
          target_amount: amount,
          target_date: dateInput || null
        }], { onConflict: 'id' })

      if (error) throw error
      alert('Intego nshya yaguzwe neza mu bitabo! 🎯')
      setTitleInput('')
      setDescInput('')
      setGoalInput('')
      setDateInput('')
      await loadSavingsGoalsCorePipeline()
    } catch (err) {
      alert('Habonetse ikosa: ' + err.message + '\n\nKora ya SQL command niba utarayikora.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-sm text-ink-soft animate-pulse">Iri gushaka imibare n'intego z'ubwizingame...</div>
  }

  const goalProgressPercentage = fleetGoalAmount > 0 
    ? Math.min(100, Math.round((globalNetTotal / fleetGoalAmount) * 100)) 
    : 0

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Fleet Financial Savings Goals</h1>
          <p className="text-sm text-ink-soft">Equation layout: Total Collected - Total Expenses = Net Fleet Balance.</p>
        </div>
        <button onClick={loadSavingsGoalsCorePipeline} className="p-2 border border-line rounded-lg text-ink-soft hover:text-ink bg-paper transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* 📊 INDIKATOR I: THE FINANCIAL EQUATION WIDGETS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper-raised p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Total Collected Amount</p>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatRWF(globalCollected)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper-raised p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Total Expenses Deducted</p>
          <p className="mt-2 font-display text-2xl font-bold text-rose-500">-{formatRWF(globalExpenses)}</p>
        </div>
        <div className="rounded-2xl border-2 border-moto-500/30 bg-paper-raised p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-moto-500">Total Net Amount (Fleet Total)</p>
          <p className="mt-2 font-display text-2xl font-black text-ink">{formatRWF(globalNetTotal)}</p>
        </div>
      </div>

      {/* 🎯 INDIKATOR II: ACTIVE GOAL PROGRESS DISPLAY */}
      {fleetGoalAmount > 0 && (
        <div className="rounded-2xl border border-line bg-paper-raised p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-moto-500 uppercase tracking-wider flex items-center gap-1.5"><Target size={15} /> Active Goal Overview</span>
              <h3 className="font-display text-xl font-bold text-ink mt-1">{fleetGoalTitle}</h3>
              {fleetGoalDesc && <p className="text-xs text-ink-soft max-w-xl mt-1">{fleetGoalDesc}</p>}
              {fleetTargetDate && (
                <p className="text-xs text-ink-soft flex items-center gap-1 font-mono mt-1.5">
                  <Calendar size={13} className="text-moto-500" /> Target Date: {formatDate(fleetTargetDate)}
                </p>
              )}
            </div>
            <div className="text-right whitespace-nowrap">
              <p className="text-xs text-ink-soft">Target Amount</p>
              <p className="font-display text-xl font-extrabold text-ink">{formatRWF(fleetGoalAmount)}</p>
              <p className="text-2xl font-mono font-black text-moto-500 mt-1">{goalProgressPercentage}%</p>
            </div>
          </div>
          <div className="w-full bg-paper rounded-full h-3 border border-line overflow-hidden p-0.5">
            <div className="bg-gradient-to-r from-moto-500 to-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${goalProgressPercentage}%` }}></div>
          </div>
        </div>
      )}

      {/* ➕ INDIKATOR III: CREATE NEW GOAL (IZINA, DESCRIPTION, ITARIKI, AMOUNT) */}
      <div className="rounded-2xl border border-line bg-paper-raised p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-line pb-2">
          <Plus size={16} className="text-moto-500" />
          <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wide">Configure Fleet Goal Target</h2>
        </div>
        
        <form onSubmit={handleCreateFleetGoal} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="space-y-1 w-full">
            <label className="text-[11px] font-bold uppercase text-ink-soft">Goal Name / Title *</label>
            <input 
              type="text" 
              placeholder="Umutwe w'intego..." 
              value={titleInput} 
              onChange={(e) => setTitleInput(e.target.value)} 
              className="p-2 text-sm rounded-lg border border-line bg-paper text-ink focus:outline-none w-full h-[38px]" 
            />
          </div>

          <div className="space-y-1 w-full">
            <label className="text-[11px] font-bold uppercase text-ink-soft">Description / Notes</label>
            <input 
              type="text" 
              placeholder="Gusobanura muri make..." 
              value={descInput} 
              onChange={(e) => setDescInput(e.target.value)} 
              className="p-2 text-sm rounded-lg border border-line bg-paper text-ink focus:outline-none w-full h-[38px]" 
            />
          </div>

          <div className="space-y-1 w-full">
            <label className="text-[11px] font-bold uppercase text-ink-soft">Target Amount (RWF) *</label>
            <input 
              type="number" 
              placeholder="Mfano: 5000000" 
              value={goalInput} 
              onChange={(e) => setGoalInput(e.target.value)} 
              className="p-2 text-sm rounded-lg border border-line bg-paper text-ink focus:outline-none w-full h-[38px]" 
            />
          </div>

          <div className="space-y-1 w-full">
            <label className="text-[11px] font-bold uppercase text-ink-soft">Target Date (Deadline) *</label>
            <input 
              type="date" 
              value={dateInput} 
              onChange={(e) => setDateInput(e.target.value)} 
              className="p-2 text-sm rounded-lg border border-line bg-paper text-ink focus:outline-none w-full h-[38px]" 
            />
          </div>

          <div className="lg:col-span-4 flex justify-end mt-2">
            <button 
              type="submit" 
              disabled={submitting} 
              className="bg-moto-500 hover:bg-moto-600 text-white px-6 py-2 rounded-lg text-xs font-bold h-[38px] transition-colors w-full sm:w-auto"
            >
              {submitting ? 'Iri kubika...' : fleetGoalAmount > 0 ? 'Update Active Goal' : 'Save New Goal'}
            </button>
          </div>
        </form>
      </div>

      {/* 🏍️ INDIKATOR IV: MOTORCYCLES PERFORMANCE TABLE */}
      <div className="rounded-2xl border border-line bg-paper-raised p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-line pb-2">
          <Bike size={18} className="text-moto-500" />
          <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wide">Motorcycles Performance Matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line text-xs font-bold uppercase tracking-wider text-ink-soft bg-paper">
                <th className="p-3">Plate Number</th>
                <th className="p-3">Driver</th>
                <th className="p-3">Total Versement</th>
                <th className="p-3">Total Expenses</th>
                <th className="p-3 text-right">Main Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm text-ink">
              {motorcycles.map((row, idx) => (
                <tr key={idx} className="hover:bg-paper/40 transition-colors">
                  <td className="p-3"><span className="plate text-[10px] font-mono">{row.plate}</span></td>
                  <td className="p-3 text-xs font-medium text-ink-soft flex items-center gap-1"><User size={12} /> {row.driver}</td>
                  <td className="p-3 font-mono text-emerald-600">+{formatRWF(row.grossPaid)}</td>
                  <td className="p-3 font-mono text-rose-500">-{formatRWF(row.expensesDeducted)}</td>
                  <td className="p-3 text-right font-mono font-bold text-ink">{formatRWF(row.netTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}