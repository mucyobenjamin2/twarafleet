import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatRWF, formatDate } from '../lib/format'
import { DollarSign, CheckCircle, Clock, Calendar, Eye, EyeOff, Bike, User, Plus } from 'lucide-react'

export default function Collections() {
  const [versements, setVersements] = useState([])
  const [dailyMatrix, setDailyMatrix] = useState([])
  const [motorcycles, setMotorcycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 📝 Form States ya Add Collection Manual
  const [selectedMoto, setSelectedMoto] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0])
  const [manualRef, setManualRef] = useState('')

  // 📊 Financial Stats Indicators
  const [stats, setStats] = useState({ expected: 0, collected: 0, pending: 0 })
  const [matrixTotals, setMatrixTotals] = useState({ target: 0, paid: 0 })

  async function loadCollectionsData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const todayStr = new Date().toISOString().split('T')[0]

      // 1. Soma ama-motorcycles yose ari active ngo ubane Expected Target y'umunsi
      const { data: activeMotos } = await supabase
        .from('motorcycles')
        .select('id, plate_number, daily_target')
        .eq('owner_id', user.id)
        .eq('status', 'active')

      setMotorcycles(activeMotos || [])
      const expectedSum = activeMotos?.reduce((acc, curr) => acc + (curr.daily_target || 6000), 0) || 0

      // 2. Soma ama-versements yose afite isano n'uyu Admin
      const { data: vData, error } = await supabase
        .from('versements')
        .select('*, motorcycles(plate_number), drivers(full_name)')
        .eq('owner_id', user.id)
        .order('collection_date', { ascending: false })

      if (error) throw error
      const allVersements = vData || []
      setVersements(allVersements)

      // 3. Soma active assignments z'abashoferi kuri izo moto
      const { data: assignments } = await supabase
        .from('driver_assignments')
        .select('*, drivers(id, full_name)')
        .eq('owner_id', user.id)
        .eq('is_active', true)

      // 4. BARA LIVE DAILY STATUS MATRIX (Kuri uyu munsi)
      let matrixTargetSum = 0
      let matrixPaidSum = 0

      const matrix = activeMotos?.map(moto => {
        const assign = assignments?.find(a => a.motorcycle_id === moto.id)
        const driverName = assign?.drivers?.full_name || 'No Driver Assigned'
        const driverId = assign?.drivers?.id

        const todayPayments = allVersements.filter(v => 
          v.collection_date === todayStr && 
          (v.motorcycle_id === moto.id || (driverId && v.driver_id === driverId))
        )

        const totalPaidToday = todayPayments.reduce((acc, curr) => acc + curr.amount, 0)
        const target = moto.daily_target || 6000

        matrixTargetSum += target
        matrixPaidSum += totalPaidToday

        let dayStatus = 'Unpaid'
        let statusColor = 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
        
        if (totalPaidToday >= target) {
          dayStatus = 'Paid'
          statusColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        } else if (totalPaidToday > 0) {
          dayStatus = 'Partial'
          statusColor = 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
        }

        return {
          plate: moto.plate_number,
          driver: driverName,
          target: target,
          paid: totalPaidToday,
          status: dayStatus,
          color: statusColor
        }
      }) || []

      setDailyMatrix(matrix)
      setMatrixTotals({ target: matrixTargetSum, paid: matrixPaidSum })

      // 5. Bara amafaranga yose amaze kwinjira muri rusange afite status ya paid na pending
      let collectedSum = 0
      let pendingSum = 0
      allVersements.forEach(v => {
        if (v.status === 'paid') collectedSum += v.amount
        if (v.status === 'pending') pendingSum += v.amount
      })

      setStats({
        expected: expectedSum,
        collected: collectedSum,
        pending: pendingSum
      })

    } catch (err) {
      console.error('Error fetching collections core framework:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCollectionsData()
  }, [])

  // 🛠 * SUBMIT MANUAL COLLECTION FROM FORM
  const handleAddManualCollection = async (e) => {
    e.preventDefault()
    if (!selectedMoto || !manualAmount) {
      alert('Tora moto maze wandike n\'amafaranga!')
      return
    }

    try {
      setSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: assign } = await supabase
        .from('driver_assignments')
        .select('driver_id')
        .eq('motorcycle_id', selectedMoto)
        .eq('is_active', true)
        .maybeSingle()

      const ref = manualRef.trim() || `MANUAL-${Math.floor(100000 + Math.random() * 900000)}`
      const { error } = await supabase.from('versements').insert([{
        owner_id: user.id,
        driver_id: assign?.driver_id || null,
        motorcycle_id: selectedMoto,
        collection_date: manualDate,
        amount: parseFloat(manualAmount),
        payment_method: 'cash',
        reference_number: ref,
        status: 'paid',
        notes: 'Yanditswe n\'intoki na Admin (Manual Collection)'
      }])

      if (error) throw error

      const todayStr = new Date().toISOString().split('T')[0]
      if (manualDate === todayStr && assign?.driver_id) {
        await supabase
          .from('debts')
          .delete()
          .eq('driver_id', assign.driver_id)
          .eq('debt_date', todayStr)
      }

      alert('Manual Collection yashyizwe mu bitabo neza! *')
      setManualAmount('')
      setManualRef('')
      setSelectedMoto('')
      await loadCollectionsData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // 🛠 * APPROVE PENDING QUEUE
  async function handleApproveVersement(id) {
    try {
      const { error } = await supabase
        .from('versements')
        .update({ status: 'paid' })
        .eq('id', id)

      if (error) throw error
      alert('Versement yamezwe neza mu bitabo! *')
      await loadCollectionsData()
    } catch (err) {
      alert(err.message)
    }
  }

  const filteredVersements = versements.filter(v => {
    const searchString = `${v.drivers?.full_name || ''} ${v.motorcycles?.plate_number || ''} ${v.reference_number || ''}`.toLowerCase()
    return searchString.includes(searchQuery.toLowerCase())
  })

  const pendingQueue = filteredVersements.filter(v => v.status === 'pending')
  const historicalQueue = filteredVersements.filter(v => v.status !== 'pending')

  if (loading) {
    return <div className="p-6 text-center text-sm text-ink-soft animate-pulse">Iri gushaka ibitabo bya za collections...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Collections Hub</h1>
        <p className="text-sm text-ink-soft">Review expected metrics, verify logs, and approve modern transactions.</p>
      </div>

      {/* * FINANCIAL METRICS WIDGETS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* * CARD 1: TODAY'S PERFORMANCE SUMMARY (EXPECTED VS PAID TODAY) */}
        <div className="rounded-2xl border border-line bg-paper-raised p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Collected Today (Umunsi wa None)</p>
            <span className="rounded-lg p-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle size={16} /></span>
          </div>
          {/* * PAID TODAY YAGIZWE NINI CYANE HIGHLIGHTED */}
          <p className="mt-2 font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatRWF(matrixTotals.paid)}
          </p>
          <div className="mt-3 pt-2 border-t border-line/60 flex justify-between text-xs">
            <span className="text-ink-soft">Expected Target:</span>
            <span className="font-mono font-bold text-ink">{formatRWF(matrixTotals.target)}</span>
          </div>
        </div>

        {/* * CARD 2: ALL-TIME TOTAL COLLECTED REGISTER */}
        <div className="rounded-2xl border border-line bg-paper-raised p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Total Volume (All-Time Paid)</p>
            <span className="rounded-lg p-1.5 bg-moto-50 text-moto-600 dark:bg-moto-950/40 dark:text-moto-400"><DollarSign size={16} /></span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">{formatRWF(stats.collected)}</p>
          <p className="mt-0.5 text-xs text-ink-soft">Cumulative life-time platform assets.</p>
        </div>

        {/* * CARD 3: PENDING APPROVAL VOLUME */}
        <div className="rounded-2xl border border-line bg-paper-raised p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Pending Approval Volume</p>
            <span className="rounded-lg p-1.5 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"><Clock size={16} /></span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-amber-500">{formatRWF(stats.pending)}</p>
          <p className="mt-0.5 text-xs text-ink-soft">Awaiting physical verification.</p>
        </div>
      </div>

      {/* 🏎* 1. LIVE DAILY STATUS MATRIX */}
      <div className="rounded-2xl border border-line bg-paper-raised p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <Bike size={18} className="text-moto-500" />
          <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wide">
            Today's Fleet Collection Matrix (Umunsi wa None)
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line text-xs font-bold uppercase tracking-wider text-ink-soft bg-paper">
                <th className="p-3">Plate</th>
                <th className="p-3">Driver</th>
                <th className="p-3">Daily Target</th>
                <th className="p-3">Paid Today</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm text-ink">
              {dailyMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-paper/40 transition-colors">
                  <td className="p-3"><span className="plate text-[10px] font-mono">{row.plate}</span></td>
                  <td className="p-3 font-medium flex items-center gap-1.5"><User size={13} className="text-ink-soft" /> {row.driver}</td>
                  <td className="p-3 font-mono text-ink-soft">{formatRWF(row.target)}</td>
                  <td className="p-3 font-mono font-bold text-ink">{formatRWF(row.paid)}</td>
                  <td className="p-3 text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${row.color}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-line bg-paper/60 text-sm font-bold">
              <tr>
                <td colSpan="2" className="p-3 text-ink-soft uppercase text-xs tracking-wider">Total (Umunsi wa None)</td>
                <td className="p-3 font-mono text-ink">{formatRWF(matrixTotals.target)}</td>
                <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">{formatRWF(matrixTotals.paid)}</td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 📥 2. PENDING APPROVAL QUEUE */}
      <div className="rounded-2xl border border-line bg-paper-raised p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wide">
            Ategereje Kwemezwa / Pending Queue ({pendingQueue.length})
          </h2>
        </div>

        {pendingQueue.length === 0 ? (
          <p className="text-sm text-ink-soft text-center py-4">Nta fomu nshya z'ama-versements zategereje kwemezwa uyu mwanya. 🎉</p>
        ) : (
          <div className="divide-y divide-line">
            {pendingQueue.map((p) => (
              <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-ink">
                    <span className="plate text-[10px] font-mono">{p.motorcycles?.plate_number ?? '—'}</span>
                    <span className="font-semibold">{p.drivers?.full_name || 'Unknown Driver'}</span>
                    <span className="text-ink-soft">·</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatRWF(p.amount)}</span>
                  </div>
                  <p className="text-xs text-ink-soft font-mono">
                    Tariki: {formatDate(p.collection_date)} · REF: <span className="text-ink font-bold">{p.reference_number || 'N/A'}</span>
                  </p>
                </div>
                <button 
                  onClick={() => handleApproveVersement(p.id)}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-moto-500 hover:bg-moto-600 text-white px-4 py-2 text-xs font-medium shadow-sm transition-all"
                >
                  <CheckCircle size={14} /> Approve Collection
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ➕ 3. ADD MANUAL COLLECTION FORM (MOVED BELOW PENDING QUEUE) */}
      <div className="rounded-2xl border border-line bg-paper-raised p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-line pb-2">
          <Plus size={18} className="text-moto-500" />
          <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wide">Add Collection Manual</h2>
        </div>
        <form onSubmit={handleAddManualCollection} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-soft">Hitamo Ikinyabiziga *</label>
            <select 
              value={selectedMoto} 
              onChange={(e) => setSelectedMoto(e.target.value)}
              className="w-full p-2 text-sm rounded-lg border border-line bg-paper text-ink focus:outline-none"
            >
              <option value="">-- Tora Moto --</option>
              {motorcycles.map(m => (
                <option key={m.id} value={m.id}>{m.plate_number}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-soft">Amafaranga (RWF) *</label>
            <input 
              type="number" 
              placeholder="6000" 
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              className="w-full p-2 text-sm rounded-lg border border-line bg-paper text-ink focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-soft">Itariki ya Payment</label>
            <input 
              type="date" 
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              className="w-full p-2 text-sm rounded-lg border border-line bg-paper text-ink focus:outline-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-moto-500 hover:bg-moto-600 text-white p-2 rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {submitting ? 'Iri kubika...' : 'Save Collection'}
          </button>
        </form>
      </div>

      {/* 🔍 SEARCH BAR FOR HISTORIES */}
      <div className="bg-paper p-4 rounded-xl border border-line flex items-center">
        <input 
          type="text" 
          placeholder="Shaka mu mateka ya kera (Plate, Driver)..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-80 p-2 rounded-lg border border-line bg-paper-raised text-sm text-ink focus:outline-none"
        />
      </div>

      {/* ⏳ 4. HISTORIES SECTION */}
      <div className="rounded-2xl border border-line bg-paper-raised p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wide">
              Amateka y'Ayemejwe / Historical Ledger ({historicalQueue.length})
            </h2>
          </div>
          
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs font-bold text-moto-600 hover:text-moto-700 bg-paper px-3 py-1.5 border border-line rounded-lg transition-all"
          >
            {showHistory ? (
              <><EyeOff size={14} /> Hisha Amateka (Hide)</>
            ) : (
              <><Eye size={14} /> Reba Amateka Yose (View All)</>
            )}
          </button>
        </div>

        {showHistory && (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line text-xs font-bold uppercase tracking-wider text-ink-soft">
                  <th className="pb-3">Motorcycle</th>
                  <th className="pb-3">Driver</th>
                  <th className="pb-3">Payment Date</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm text-ink">
                {historicalQueue.map((h) => (
                  <tr key={h.id} className="hover:bg-paper/40 transition-colors">
                    <td className="py-3"><span className="plate text-[10px] font-mono">{h.motorcycles?.plate_number || '—'}</span></td>
                    <td className="py-3 font-medium">{h.drivers?.full_name || 'Unknown Driver'}</td>
                    <td className="py-3 font-mono text-xs">{formatDate(h.collection_date)}</td>
                    <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatRWF(h.amount)}</td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 rounded">
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}