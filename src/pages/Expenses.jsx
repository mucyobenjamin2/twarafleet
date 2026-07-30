import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatRWF, formatDate } from '../lib/format'
import { Wrench, Plus, RefreshCw, Trash2, Clock, CheckCircle, XCircle, Search, X } from 'lucide-react'

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [motorcycles, setMotorcycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal & Form States
  const [showModal, setShowModal] = useState(false)
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

      // 1. Soma moto z'uyu Admin gusa
      const { data: motos } = await supabase
        .from('motorcycles')
        .select('id, plate_number')
        .eq('owner_id', user.id)
      setMotorcycles(motos || [])

      const myMotoIds = motos?.map(m => m.id) || []

      if (myMotoIds.length > 0) {
        // 2. Soma expenses zose z'ibinyabiziga by'uyu Admin
        const { data: exps, error } = await supabase
          .from('expenses')
          .select('*, motorcycles(plate_number, owner_id)')
          .in('motorcycle_id', myMotoIds)
          .order('created_at', { ascending: false })

        if (error) throw error
        setExpenses(exps || [])
      } else {
        setExpenses([])
      }
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
      setSelectedMotoId('')
      setAmountInput('')
      setDescInput('')
      setShowModal(false)
      await loadExpensesPipeline()
    } catch (err) {
      alert('Habonetse ikosa: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ✅ APPROVE PENDING EXPENSE
  async function handleApproveExpense(id) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'approved', owner_id: user?.id })
        .eq('id', id)

      if (error) throw error
      await loadExpensesPipeline()
    } catch (err) {
      alert('Ikosa mu kwemeza depanse: ' + err.message)
    }
  }

  // ❌ REJECT PENDING EXPENSE
  async function handleRejectExpense(id) {
    if (!window.confirm('Ese urashaka kwanga (Reject) iyi depanse?')) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'rejected', owner_id: user?.id })
        .eq('id', id)

      if (error) throw error
      await loadExpensesPipeline()
    } catch (err) {
      alert('Ikosa mu kwanga depanse: ' + err.message)
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

  const filteredExpenses = expenses.filter(e => {
    const searchString = `${e.motorcycles?.plate_number || ''} ${e.category || ''} ${e.description || ''}`.toLowerCase()
    return searchString.includes(searchQuery.toLowerCase())
  })

  const pendingExpenses = filteredExpenses.filter(e => e.status === 'pending')
  const verifiedExpenses = filteredExpenses.filter(e => e.status !== 'pending')

  const totalApprovedExpenses = expenses
    .filter(e => e.status === 'approved')
    .reduce((acc, curr) => acc + curr.amount, 0)

  if (loading) {
    return <div className="p-6 text-center text-sm font-bold text-ink-soft animate-pulse">Iri gushaka ibitabo by'ama-expenses...</div>
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* HEADER WITH SEARCH & ADD EXPENSE BUTTON */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Fleet Expenses</h1>
          <p className="text-sm font-bold text-ink-soft">Track and manage operational costs, driver claims, and maintenance details.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={18} className="absolute left-3.5 top-3 text-ink-soft" />
            <input
              type="text"
              placeholder="Shaka moto, category, desc..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-line bg-paper text-sm text-ink font-bold focus:outline-none focus:border-amber-500 shadow-sm"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition whitespace-nowrap"
          >
            <Plus size={18} /> Record New Expense
          </button>

          <button onClick={loadExpensesPipeline} className="p-2.5 border border-line rounded-xl text-ink-soft hover:text-ink bg-paper transition-colors shadow-sm">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* 📥 1. PENDING EXPENSES APPROVAL QUEUE */}
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 backdrop-blur-md p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <h2 className="font-display text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-2">
              <Clock size={16} className="text-amber-600 dark:text-amber-400" /> Pending Expenses Approval ({pendingExpenses.length})
            </h2>
          </div>
          {pendingExpenses.length > 0 && (
            <span className="text-xs font-black text-amber-800 dark:text-amber-200 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/40">
              Ategereje Kwemezwa
            </span>
          )}
        </div>

        {pendingExpenses.length === 0 ? (
          <p className="text-sm font-bold text-ink-soft text-center py-4">Nta depanse y'umushoferi igitegereje kwemezwa uyu mwanya. 🎉</p>
        ) : (
          <div className="divide-y divide-amber-500/30">
            {pendingExpenses.map((e) => (
              <div key={e.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="plate text-xs font-mono font-extrabold bg-paper text-ink px-2.5 py-1 rounded border border-line uppercase shadow-sm">
                      {e.motorcycles?.plate_number || 'No Plate'}
                    </span>
                    <span className="text-ink-soft font-bold">|</span>
                    <span className="font-black uppercase text-xs tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-200 px-2.5 py-1 rounded border border-amber-500/40">
                      {e.category}
                    </span>
                    <span className="text-ink font-extrabold italic">"{e.description || 'Nta busobanuro'}"</span>
                    <span className="text-ink-soft font-bold">·</span>
                    <span className="font-mono font-black text-rose-600 dark:text-rose-400">{formatRWF(e.amount)}</span>
                  </div>
                  <p className="text-xs text-ink-soft font-mono font-bold">
                    Tariki: {formatDate(e.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleApproveExpense(e.id)}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-black shadow-sm transition-all"
                  >
                    <CheckCircle size={14} /> Approve Expense
                  </button>
                  <button 
                    onClick={() => handleRejectExpense(e.id)}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 text-xs font-black shadow-sm transition-all"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 📊 TOTAL EXPENSES SUMMARY WIDGET */}
      <div className="rounded-2xl border border-line bg-paper-raised p-5 max-w-sm shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">Total Approved Expenses</p>
        <p className="mt-2 font-display text-2xl font-black text-amber-600 dark:text-amber-400">{formatRWF(totalApprovedExpenses)}</p>
      </div>

      {/* 📋 EXPENSES LEDGER TABLE */}
      <div className="rounded-2xl border border-line bg-paper-raised overflow-hidden shadow-sm">
        <div className="p-4 border-b border-line bg-paper flex items-center justify-between">
          <h2 className="font-display text-sm font-black text-ink uppercase tracking-wide">
            Verified Expenses Ledger ({verifiedExpenses.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-paper text-xs font-extrabold uppercase tracking-wider text-ink-soft">
                <th className="p-4">Date</th>
                <th className="p-4">Motorcycle</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm">
              {verifiedExpenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center font-bold text-ink-soft">Nta ma-expenses y'ibitabo byawe yabonetse bwa mbere.</td>
                </tr>
              ) : (
                verifiedExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-paper/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-ink text-xs">{formatDate(e.created_at)}</td>
                    <td className="p-4">
                      <span className="plate text-xs font-mono font-extrabold">{e.motorcycles?.plate_number || '—'}</span>
                    </td>
                    <td className="p-4 capitalize text-xs font-extrabold text-ink-soft">{e.category}</td>
                    <td className="p-4 italic font-bold text-ink">"{e.description || '—'}"</td>
                    <td className="p-4 font-mono font-black text-rose-600 dark:text-rose-400">-{formatRWF(e.amount)}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        e.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                        'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => handleDeleteExpense(e.id)}
                        className="p-1.5 rounded-lg text-ink-soft hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📝 MODAL POPUP FOR RECORD NEW FLEET EXPENSE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-paper rounded-2xl border border-line w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-lg font-black text-ink flex items-center gap-2">
                <Plus className="text-amber-500" size={20} /> Record New Fleet Expense
              </h2>
              <button onClick={() => setShowModal(false)} className="text-ink-soft hover:text-ink">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Select Motorcycle *
                </label>
                <select
                  value={selectedMotoId}
                  onChange={e => setSelectedMotoId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-amber-500"
                  required
                >
                  <option value="">-- Hitamo Moto --</option>
                  {motorcycles.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.plate_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Category *
                </label>
                <select
                  value={categoryInput}
                  onChange={e => setCategoryInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-amber-500"
                  required
                >
                  <option value="maintenance">Maintenance & Repair</option>
                  <option value="fuel">Fuel / Amavuta</option>
                  <option value="insurance">Insurance / Ibyangombwa</option>
                  <option value="fine">Amande / Traffic Fines</option>
                  <option value="other">Other Expenses</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Amount (RWF) *
                </label>
                <input
                  type="number"
                  placeholder="Mfano: 15000"
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm text-ink font-bold focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Description / Notes
                </label>
                <textarea
                  placeholder="Gusobanura depanse..."
                  value={descInput}
                  onChange={e => setDescInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm text-ink font-bold focus:outline-none focus:border-amber-500"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-line font-bold text-ink-soft hover:bg-paper-raised transition"
                >
                  Siba
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 font-bold text-white hover:bg-amber-600 transition disabled:opacity-50"
                >
                  {submitting ? 'Iri kubika...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}