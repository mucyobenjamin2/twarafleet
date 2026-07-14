import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatRWF, formatDate } from '../lib/format'
import { AlertTriangle, CheckCircle, Trash2, ShieldAlert, TrendingUp, DollarSign } from 'lucide-react'

export default function Debts() {
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('active')

  // 📊 States z'imibare (Totals)
  const [totals, setTotals] = useState({ active: 0, paid: 0, waived: 0 })

  async function loadDebts() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Soma amadeni yose afite isano n'uyu Admin (owner)
      const { data, error } = await supabase
        .from('debts')
        .select('*, motorcycles(plate_number), drivers(full_name)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const loadedDebts = data || []
      setDebts(loadedDebts)

      // 🔥 AUTO-CALCULATION Y'IMIBARE RUSANGE Y'AMADENI:
      let activeSum = 0
      let paidSum = 0
      let waivedSum = 0

      loadedDebts.forEach(d => {
        const remaining = parseFloat(d.remaining_amount) || 0
        const original = parseFloat(d.original_amount) || 0
        
        // Gufata status tukanayigira lowercase ngo twirinde amakosa y'inyuguti
        const currentStatus = (d.status || '').toLowerCase().trim()

        if (currentStatus === 'active') {
          activeSum += remaining
        } else if (currentStatus === 'paid') {
          paidSum += original
        } else if (currentStatus === 'waived') {
          waivedSum += original
        }
      })

      setTotals({ 
        active: activeSum, 
        paid: paidSum, 
        waived: waivedSum 
      })

    } catch (err) {
      console.error('Error loading debts ledger:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDebts()
  }, [])

  // 🛠️ 1. LOGIC YO KUBABARIRA IDENI (WAIVE DEBT)
  async function handleWaiveDebt(id) {
    if (!window.confirm('Ese urashaka kubabarira iri deni bidasubirwaho?')) return
    try {
      const { error } = await supabase
        .from('debts')
        .update({ status: 'waived', remaining_amount: 0 })
        .eq('id', id)
      
      if (error) throw error
      loadDebts()
    } catch (err) {
      alert(err.message)
    }
  }

  // 🛠️ 2. LOGIC YO KUKURAMO IDENI RYISHYUWE
  async function handleClearDebt(debt) {
    const payAmount = window.prompt(`Injiza amafaranga wishyurwa kuri iri deni (Ideni ryose: ${debt.remaining_amount.toLocaleString()} RWF):`, debt.remaining_amount)
    if (!payAmount || isNaN(payAmount)) return

    const amount = parseFloat(payAmount)
    if (amount <= 0) return

    try {
      const newRemaining = Math.max(0, debt.remaining_amount - amount)
      const finalStatus = newRemaining === 0 ? 'paid' : 'active'

      const { error: debtErr } = await supabase
        .from('debts')
        .update({ remaining_amount: newRemaining, status: finalStatus })
        .eq('id', debt.id)

      if (debtErr) throw debtErr

      await supabase.from('versements').insert([{
        owner_id: debt.owner_id,
        driver_id: debt.driver_id,
        motorcycle_id: debt.motorcycle_id,
        collection_date: debt.debt_date,
        amount: amount,
        payment_method: 'cash',
        reference_number: `DEBT-CLEAR-${debt.id.substring(0,6).toUpperCase()}`,
        status: 'paid',
        notes: `Versement yizanye mu buryo bwa auto-matching mu gukura ideni ryo ku itariki ya ${debt.debt_date}.`
      }])

      alert('Ideni ryagabanyijwe kandi versement yashyizwe mu bitabo neza! 👍')
      loadDebts()
    } catch (err) {
      alert(err.message)
    }
  }

  // 🔥 FIX NYAYO: Yungurura hano akoresheje lowercase ngo status zose zihure 100%!
  const filteredDebts = debts.filter(d => {
    const currentDebtStatus = (d.status || '').toLowerCase().trim()
    const currentFilterStatus = (filterStatus || '').toLowerCase().trim()

    const matchesStatus = currentFilterStatus === 'all' || currentDebtStatus === currentFilterStatus
    
    const searchString = `${d.drivers?.full_name || ''} ${d.motorcycles?.plate_number || ''}`.toLowerCase()
    const matchesSearch = searchString.includes(searchQuery.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  if (loading) {
    return <div className="p-6 text-center text-sm text-ink-soft animate-pulse">Iri gushaka ibitabo by'amadeni...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Debts Ledger</h1>
        <p className="text-sm text-ink-soft">Manage active balances and verify automatic deficits.</p>
      </div>

      {/* 📊 STATS TILES */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper-raised p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Total Active Debts</p>
            <span className="rounded-lg p-1.5 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"><AlertTriangle size={16} /></span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-rose-600 dark:text-rose-400">{formatRWF(totals.active)}</p>
          <p className="mt-0.5 text-xs text-ink-soft">Outstanding money in the field.</p>
        </div>

        <div className="rounded-2xl border border-line bg-paper-raised p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Recovered via Versement</p>
            <span className="rounded-lg p-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"><TrendingUp size={16} /></span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatRWF(totals.paid)}</p>
          <p className="mt-0.5 text-xs text-ink-soft">Successfully cleared back tax.</p>
        </div>

        <div className="rounded-2xl border border-line bg-paper-raised p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Total Waived (Amababarirano)</p>
            <span className="rounded-lg p-1.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"><DollarSign size={16} /></span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-slate-700 dark:text-slate-300">{formatRWF(totals.waived)}</p>
          <p className="mt-0.5 text-xs text-ink-soft">Debts forgiven manually by owner.</p>
        </div>
      </div>

      {/* 🔍 FILTERS BAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-paper p-4 rounded-xl border border-line">
        <input 
          type="text" 
          placeholder="Shakisha umu-driver cyangwa plate..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-72 p-2 rounded-lg border border-line bg-paper-raised text-sm text-ink focus:outline-none"
        />
        
        <div className="flex items-center gap-1.5 border border-line rounded-lg p-1 bg-paper-raised">
          {['active', 'paid', 'waived', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${filterStatus.toLowerCase() === status.toLowerCase() ? 'bg-moto-500 text-white shadow-sm' : 'text-ink-soft hover:text-ink'}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* 📋 LEDGER TABLE */}
      <div className="rounded-2xl border border-line bg-paper-raised overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-paper text-xs font-bold uppercase tracking-wider text-ink-soft">
                <th className="p-4">Motorcycle</th>
                <th className="p-4">Driver</th>
                <th className="p-4">Debt Date</th>
                <th className="p-4">Deficit / Original</th>
                <th className="p-4">Remaining</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm text-ink">
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-ink-soft">Nta madeni active cyangwa ayandi ahuye n'iyi filter yabonetse.</td>
                </tr>
              ) : (
                filteredDebts.map((d) => (
                  <tr key={d.id} className="hover:bg-paper/40 transition-colors">
                    <td className="p-4">
                      <span className="plate text-[11px] font-mono">{d.motorcycles?.plate_number || '—'}</span>
                    </td>
                    <td className="p-4 font-semibold">{d.drivers?.full_name || 'Unknown Driver'}</td>
                    <td className="p-4 font-mono text-xs">{formatDate(d.debt_date)}</td>
                    <td className="p-4 font-mono text-ink-soft">{formatRWF(d.original_amount)}</td>
                    <td className="p-4 font-mono font-bold text-rose-600 dark:text-rose-400">
                      {d.remaining_amount > 0 ? formatRWF(d.remaining_amount) : '—'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        (d.status || '').toLowerCase() === 'active' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400' :
                        (d.status || '').toLowerCase() === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      {(d.status || '').toLowerCase() === 'active' && (
                        <>
                          <button 
                            onClick={() => handleClearDebt(d)}
                            className="flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white shadow-sm transition-all"
                          >
                            <CheckCircle size={13} /> Pay Debt
                          </button>
                          <button 
                            onClick={() => handleWaiveDebt(d.id)}
                            className="flex items-center gap-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-200 px-2.5 py-1 text-xs font-medium transition-all"
                          >
                            Waive
                          </button>
                        </>
                      )}
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