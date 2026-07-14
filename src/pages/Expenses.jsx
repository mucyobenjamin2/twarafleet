import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatRWF, formatDate } from '../lib/format'
import { Wrench, Plus, RefreshCw, Trash2 } from 'lucide-react'

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [motorcycles, setMotorcycles] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Form States
  const [selectedMotoId, setSelectedMotoId] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('maintenance')
  const [descInput, setDescInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadExpensesPipeline() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Soma moto z'uyu Admin gusa ngo abe ari zo ahitamo muri Form
      const { data: motos } = await supabase
        .from('motorcycles')
        .select('id, plate_number')
        .eq('owner_id', user.id)
      setMotorcycles(motos || [])

      // 2. 🔥 ISUKU NYAYO: Soma expenses z'uyu Admin gusa (.eq('owner_id', user.id))
      const { data: exps, error } = await supabase
        .from('expenses')
        .select('*, motorcycles(plate_number)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setExpenses(exps || [])
    } catch (err) {
      console.error('Error loading expenses:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpensesPipeline()
  }, [])

  const handleCreateExpense = async (e) => {
    e.preventDefault()
    if (!selectedMotoId || !amountInput || isNaN(amountInput) || parseFloat(amountInput) <= 0) {
      alert('Nyamuneka hitamo moto n\'amafaranga ya depanse!')
      return
    }

    try {
      setSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Nta mukoresha winjiye mu bitabo.")

      // 🔥 KUBIKANA NA OWNER_ID YA ADMIN WINJIYE
      const payload = {
        motorcycle_id: selectedMotoId,
        amount: parseFloat(amountInput),
        category: categoryInput,
        description: descInput,
        status: 'approved', 
        owner_id: user.id   
      }

      const { error } = await supabase
        .from('expenses')
        .insert([payload])

      if (error) throw error
      alert('Depanse yanditswe neza mu bitabo! 🛠️')
      setAmountInput('')
      setDescInput('')
      await loadExpensesPipeline()
    } catch (err) {
      alert('Habonetse ikosa: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteExpense(id) {
    if (!window.confirm('Ese urashaka gusiba iyi expense bidasubirwaho?')) return
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
      if (error) throw error
      await loadExpensesPipeline()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-sm text-ink-soft animate-pulse">Iri gushaka ibitabo by'ama-expenses...</div>
  }

  const totalApprovedExpenses = expenses
    .filter(e => e.status === 'approved')
    .reduce((acc, curr) => acc + curr.amount, 0)

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Fleet Expenses</h1>
          <p className="text-sm text-ink-soft">Track and manage operational costs and maintenance details for your fleet.</p>
        </div>
        <button onClick={loadExpensesPipeline} className="p-2 border border-line rounded-lg text-ink-soft hover:text-ink bg-paper transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* 📊 TOTAL EXPENSES WIDGET */}
      <div className="rounded-2xl border border-line bg-paper-raised p-5 max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Total Approved Expenses</p>
        <p className="mt-2 font-display text-2xl font-bold text-amber-600 dark:text-amber-500">{formatRWF(totalApprovedExpenses)}</p>
      </div>

      {/* ➕ RECORD NEW EXPENSE FORM */}
      <div className="rounded-2xl border border-line bg-paper-raised p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-line pb-2">
          <Plus size={16} className="text-amber-500" />
          <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wide">Record New Fleet Expense</h2>
        </div>
        
        <form onSubmit={handleCreateExpense} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="space-y-1 w-full">
            <label className="text-[11px] font-bold uppercase text-ink-soft">Select Motorcycle *</label>
            <select 
              value={selectedMotoId} 
              onChange={(e) => setSelectedMotoId(e.target.value)}
              className="p-2 text-sm rounded-lg border border-line bg-paper text-ink focus:outline-none w-full h-[38px]"
            >
              <option value="">-- Hitamo Moto --</option>
              {motorcycles.map(m => (
                <option key={m.id} value={m.id}>{m.plate_number}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 w-full">
            <label className="text-[11px] font-bold uppercase text-ink-soft">Category *</label>
            <select 
              value={categoryInput} 
              onChange={(e) => setCategoryInput(e.target.value)}
              className="p-2 text-sm rounded-lg border border-line bg-paper text-ink focus:outline-none w-full h-[38px]"
            >
              <option value="maintenance">Maintenance & Repair</option>
              <option value="fuel">Fuel / Amavuta</option>
              <option value="insurance">Insurance / Ibyangombwa</option>
              <option value="fine">Amande / Traffic Fines</option>
              <option value="other">Other Expenses</option>
            </select>
          </div>

          <div className="space-y-1 w-full">
            <label className="text-[11px] font-bold uppercase text-ink-soft">Amount (RWF) *</label>
            <input 
              type="number" 
              placeholder="Mfano: 15000" 
              value={amountInput} 
              onChange={(e) => setAmountInput(e.target.value)}
              className="p-2 text-sm rounded-lg border border-line bg-paper text-ink focus:outline-none w-full h-[38px]" 
            />
          </div>

          <div className="space-y-1 w-full lg:col-span-1">
            <label className="text-[11px] font-bold uppercase text-ink-soft">Description / Notes</label>
            <input 
              type="text" 
              placeholder="Gusobanura depanse..." 
              value={descInput} 
              onChange={(e) => setDescInput(e.target.value)}
              className="p-2 text-sm rounded-lg border border-line bg-paper text-ink focus:outline-none w-full h-[38px]" 
            />
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={submitting}
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg text-xs font-bold h-[38px] transition-colors w-full"
            >
              {submitting ? 'Iri kubika...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>

      {/* 📋 EXPENSES LEDGER TABLE */}
      <div className="rounded-2xl border border-line bg-paper-raised overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-paper text-xs font-bold uppercase tracking-wider text-ink-soft">
                <th className="p-4">Date</th>
                <th className="p-4">Motorcycle</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm text-ink">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-ink-soft">Nta ma-expenses y'ibitabo byawe yabonetse bwa mbere.</td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-paper/40 transition-colors">
                    <td className="p-4 font-mono text-xs">{formatDate(e.created_at)}</td>
                    <td className="p-4">
                      <span className="plate text-[11px] font-mono">{e.motorcycles?.plate_number || '—'}</span>
                    </td>
                    <td className="p-4 capitalize text-xs font-medium text-ink-soft">{e.category}</td>
                    <td className="p-4 italic text-ink-soft">"{e.description || '—'}"</td>
                    <td className="p-4 font-mono font-bold text-rose-500">-{formatRWF(e.amount)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        e.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                      }`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => handleDeleteExpense(e.id)}
                        className="p-1.5 rounded-lg text-ink-soft hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}