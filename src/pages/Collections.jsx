import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatRWF, formatDate } from '../lib/format'
import { DollarSign, CheckCircle, Clock, CalendarOff, Eye, EyeOff, Bike, User, Plus, XCircle, Search, X } from 'lucide-react'

export default function Collections() {
  const [versements, setVersements] = useState([])
  const [dailyMatrix, setDailyMatrix] = useState([])
  const [motorcycles, setMotorcycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Modal State for Manual Collection
  const [showManualModal, setShowManualModal] = useState(false)
  const [selectedMoto, setSelectedMoto] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0])
  const [manualRef, setManualRef] = useState('')

  // Financial Stats Indicators
  const [stats, setStats] = useState({ expected: 0, collected: 0, pending: 0 })
  const [matrixTotals, setMatrixTotals] = useState({ target: 0, paid: 0 })

  async function loadCollectionsData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const todayObj = new Date()
      const todayStr = todayObj.toISOString().split('T')[0]
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const currentDayName = dayNames[todayObj.getDay()]

      // 1. Active Motorcycles
      const { data: activeMotos } = await supabase
        .from('motorcycles')
        .select('id, plate_number, daily_target, off_day')
        .eq('owner_id', user.id)
        .eq('status', 'active')

      setMotorcycles(activeMotos || [])

      // Fetch specific non-working days for TODAY
      const { data: todayOffDays } = await supabase
        .from('non_working_days')
        .select('motorcycle_id')
        .eq('owner_id', user.id)
        .eq('date', todayStr)

      const specificOffMotoIds = new Set(todayOffDays?.map(d => d.motorcycle_id) || [])

      // 2. All Versements
      const { data: vData, error } = await supabase
        .from('versements')
        .select('*, motorcycles(plate_number), drivers(full_name)')
        .eq('owner_id', user.id)
        .order('collection_date', { ascending: false })

      if (error) throw error
      const allVersements = vData || []
      setVersements(allVersements)

      // 3. Active Driver Assignments
      const { data: assignments } = await supabase
        .from('driver_assignments')
        .select('*, drivers(id, full_name)')
        .eq('owner_id', user.id)
        .eq('is_active', true)

      // 4. BARA LIVE DAILY STATUS MATRIX
      let matrixTargetSum = 0
      let matrixPaidSum = 0

      const matrix = activeMotos?.map(moto => {
        const assign = assignments?.find(a => a.motorcycle_id === moto.id)
        const driverName = assign?.drivers?.full_name || 'No Driver Assigned'
        const driverId = assign?.drivers?.id

        // Filter ONLY approved/paid versements for today
        const todayPayments = allVersements.filter(v => 
          v.collection_date === todayStr && 
          v.status === 'paid' &&
          (v.motorcycle_id === moto.id || (driverId && v.driver_id === driverId))
        )

        const totalPaidToday = todayPayments.reduce((acc, curr) => acc + curr.amount, 0)
        
        const motoOffDay = (moto.off_day || 'saturday').toLowerCase()
        const isWeeklyOff = (motoOffDay === currentDayName)
        const isSpecificOff = specificOffMotoIds.has(moto.id)
        const isDayOff = isWeeklyOff || isSpecificOff

        const target = isDayOff ? 0 : (moto.daily_target || 6000)

        matrixTargetSum += target
        matrixPaidSum += totalPaidToday

        let dayStatus = 'UNPAID'
        let glassBg = 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400'
        let badgeBg = 'bg-rose-200 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300'

        if (isDayOff) {
          dayStatus = 'DAY OFF'
          glassBg = 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400'
          badgeBg = 'bg-indigo-200 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300'
        } else if (totalPaidToday >= target && target > 0) {
          dayStatus = 'PAID'
          glassBg = 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
          badgeBg = 'bg-emerald-200 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
        } else if (totalPaidToday > 0) {
          dayStatus = 'PARTIAL'
          glassBg = 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400'
          badgeBg = 'bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
        }

        return {
          id: moto.id,
          plate: moto.plate_number,
          driver: driverName,
          target,
          paid: totalPaidToday,
          status: dayStatus,
          glassBg,
          badgeBg,
          isDayOff
        }
      }) || []

      setDailyMatrix(matrix)
      setMatrixTotals({ target: matrixTargetSum, paid: matrixPaidSum })

      // 5. Financial Stats
      let collectedSum = 0
      let pendingSum = 0
      allVersements.forEach(v => {
        if (v.status === 'paid') collectedSum += v.amount
        if (v.status === 'pending') pendingSum += v.amount
      })

      setStats({
        expected: matrixTargetSum,
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

  // 🛠 SUBMIT MANUAL COLLECTION FROM MODAL FORM
  const handleAddManualCollection = async (e) => {
    e.preventDefault()
    if (!selectedMoto || !manualAmount) {
      alert('Hitamo moto maze wandike amafaranga!')
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

      setShowManualModal(false)
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

  // ✅ APPROVE PENDING QUEUE
  async function handleApproveVersement(id) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('versements')
        .update({ status: 'paid', owner_id: user?.id })
        .eq('id', id)

      if (error) throw error
      await loadCollectionsData()
    } catch (err) {
      alert('Ikosa mu kwemeza versement: ' + err.message)
    }
  }

  // ❌ REJECT PENDING QUEUE
  async function handleRejectVersement(id) {
    if (!window.confirm('Ese urashaka kwanga (Reject) iyi versement? Ibi birahita byandika ideni ry\'uwo munsi ku mu-driver!')) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('versements')
        .update({ status: 'rejected', owner_id: user?.id })
        .eq('id', id)

      if (error) throw error
      await loadCollectionsData()
    } catch (err) {
      alert('Ikosa mu kwanga versement: ' + err.message)
    }
  }

  const filteredVersements = versements.filter(v => {
    const searchString = `${v.drivers?.full_name || ''} ${v.motorcycles?.plate_number || ''} ${v.reference_number || ''}`.toLowerCase()
    return searchString.includes(searchQuery.toLowerCase())
  })

  const pendingQueue = filteredVersements.filter(v => v.status === 'pending')
  const historicalQueue = filteredVersements.filter(v => v.status !== 'pending')

  if (loading) {
    return <div className="p-6 text-center text-sm font-bold text-ink-soft animate-pulse">Iri gushaka ibitabo bya za collections...</div>
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* HEADER WITH SEARCH BAR & ADD BUTTON */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">Collections Hub</h1>
          <p className="text-sm font-bold text-ink-soft">Review expected metrics, verify logs, and approve modern transactions.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={18} className="absolute left-3.5 top-3 text-ink-soft" />
            <input
              type="text"
              placeholder="Shaka moto, driver, ref..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                if (!showHistory && e.target.value.trim() !== '') {
                  setShowHistory(true)
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-line bg-paper text-sm text-ink font-bold focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition whitespace-nowrap"
          >
            <Plus size={18} /> Add Collection Manual
          </button>
        </div>
      </div>

      {/* 📥 1. PENDING APPROVAL QUEUE */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <h2 className="font-display text-sm font-black text-ink uppercase tracking-wide flex items-center gap-2">
              <Clock size={16} className="text-amber-500" /> Pending Approval Queue ({pendingQueue.length})
            </h2>
          </div>
          {pendingQueue.length > 0 && (
            <span className="text-xs font-black text-amber-800 dark:text-amber-200 bg-amber-200 dark:bg-amber-900/50 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-700">
              Ategereje Kwemezwa
            </span>
          )}
        </div>

        {pendingQueue.length === 0 ? (
          <p className="text-sm font-bold text-ink-soft text-center py-4">Nta fomu nshya z'ama-versements zategereje kwemezwa uyu mwanya. 🎉</p>
        ) : (
          <div className="divide-y divide-emerald-500/20">
            {pendingQueue.map((p) => (
              <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="plate text-xs font-mono font-black bg-paper text-ink px-2.5 py-1 rounded border border-line uppercase shadow-sm">
                      {p.motorcycles?.plate_number ?? '—'}
                    </span>
                    <span className="text-ink-soft font-bold">|</span>
                    <span className="font-black text-ink">{p.drivers?.full_name || 'Unknown Driver'}</span>
                    <span className="text-ink-soft font-bold">·</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{formatRWF(p.amount)}</span>
                  </div>
                  <p className="text-xs text-ink-soft font-mono font-bold">
                    Tariki: {formatDate(p.collection_date)} · REF: <span className="text-ink font-black">{p.reference_number || 'N/A'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleApproveVersement(p.id)}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-black shadow-sm transition-all"
                  >
                    <CheckCircle size={14} /> Approve Collection
                  </button>
                  <button 
                    onClick={() => handleRejectVersement(p.id)}
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

      {/* 📊 FINANCIAL METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper-raised p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-ink-soft">Collected Today (Umunsi wa None)</p>
            <span className="rounded-lg p-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle size={16} /></span>
          </div>
          <p className="mt-2 font-display text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatRWF(matrixTotals.paid)}
          </p>
          <div className="mt-3 pt-2 border-t border-line flex justify-between text-xs">
            <span className="text-ink-soft font-bold">Expected Target:</span>
            <span className="font-mono font-black text-ink">{formatRWF(matrixTotals.target)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-paper-raised p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-ink-soft">Total Volume (All-Time Paid)</p>
            <span className="rounded-lg p-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"><DollarSign size={16} /></span>
          </div>
          <p className="mt-2 font-display text-2xl font-black text-ink">{formatRWF(stats.collected)}</p>
          <p className="mt-0.5 text-xs font-bold text-ink-soft">Cumulative platform assets.</p>
        </div>

        <div className="rounded-2xl border border-line bg-paper-raised p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-ink-soft">Pending Approval Volume</p>
            <span className="rounded-lg p-1.5 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"><Clock size={16} /></span>
          </div>
          <p className="mt-2 font-display text-2xl font-black text-amber-500">{formatRWF(stats.pending)}</p>
          <p className="mt-0.5 text-xs font-bold text-ink-soft">Awaiting verification.</p>
        </div>
      </div>

      {/* 🔮 2. GLASSMORPHISM COMPACT COLLECTION MATRIX CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-ink flex items-center gap-2">
            <Bike size={16} className="text-emerald-500" /> Today's Collection Matrix ({dailyMatrix.length} Motorcycles)
          </h2>
          <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatRWF(matrixTotals.paid)} / {formatRWF(matrixTotals.target)}
          </span>
        </div>

        {/* COMPACT GLASSMORPHISM CARDS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {dailyMatrix.map((item) => (
            <div 
              key={item.id} 
              className={`p-3 rounded-2xl border transition-all shadow-sm flex flex-col justify-between space-y-2.5 hover:scale-105 ${item.glassBg}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono font-black text-xs tracking-wider uppercase bg-paper/80 px-2 py-0.5 rounded text-ink border border-line">
                  {item.plate}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${item.badgeBg}`}>
                  {item.status}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-black truncate flex items-center gap-1">
                  <User size={11} className="opacity-70" /> {item.driver}
                </p>
                <div className="mt-1 font-mono">
                  <p className="text-base font-black tracking-tight leading-none">
                    {formatRWF(item.paid)}
                  </p>
                  <p className="text-[10px] opacity-90 font-bold mt-1">
                    Target: {formatRWF(item.target)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🔍 HISTORICAL LEDGER SECTION */}
      <div className="rounded-2xl border border-line bg-paper-raised p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-line pb-3 gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h2 className="font-display text-sm font-black text-ink uppercase tracking-wide">
              Amateka y'Ayemejwe / Historical Ledger ({historicalQueue.length})
            </h2>
          </div>
          
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-paper px-3 py-1.5 border border-line rounded-lg transition-all"
          >
            {showHistory ? (
              <><EyeOff size={14} /> Hisha Amateka (Hide)</>
            ) : (
              <><Eye size={14} /> Reba Amateka Yose (View All)</>
            )}
          </button>
        </div>

        {showHistory && (
          <div className="space-y-3">
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line text-xs font-black uppercase tracking-wider text-ink-soft">
                    <th className="pb-3">Motorcycle</th>
                    <th className="pb-3">Driver</th>
                    <th className="pb-3">Payment Date</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm">
                  {historicalQueue.map((h) => (
                    <tr key={h.id} className="hover:bg-paper/40 transition-colors">
                      <td className="py-3 font-bold text-ink">
                        <span className="plate text-xs font-mono font-black">{h.motorcycles?.plate_number || '—'}</span>
                      </td>
                      <td className="py-3 font-black text-ink">{h.drivers?.full_name || 'Unknown Driver'}</td>
                      <td className="py-3 font-mono font-bold text-ink-soft text-xs">{formatDate(h.collection_date)}</td>
                      <td className="py-3 font-mono font-black text-emerald-600 dark:text-emerald-400">{formatRWF(h.amount)}</td>
                      <td className="py-3 text-right">
                        <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/30">
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 📝 MODAL POPUP FOR ADD MANUAL COLLECTION */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-paper rounded-2xl border border-line w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-lg font-black text-ink flex items-center gap-2">
                <Plus className="text-emerald-600" size={20} /> Add Collection Manual
              </h2>
              <button onClick={() => setShowManualModal(false)} className="text-ink-soft hover:text-ink">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddManualCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Hitamo Ikinyabiziga (Plaque) *
                </label>
                <select
                  value={selectedMoto}
                  onChange={e => setSelectedMoto(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper text-sm font-bold text-ink focus:outline-none focus:border-emerald-500"
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
                  Amafaranga (RWF) *
                </label>
                <input
                  type="number"
                  placeholder="6000"
                  value={manualAmount}
                  onChange={e => setManualAmount(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper text-sm text-ink font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Itariki ya Payment *
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper text-sm text-ink font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Reference / Trans ID (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Urugero: CASH-00912"
                  value={manualRef}
                  onChange={e => setManualRef(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper text-sm text-ink font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-line font-bold text-ink-soft hover:bg-paper-raised transition"
                >
                  Siba
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Iri kubika...' : 'Bika Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}