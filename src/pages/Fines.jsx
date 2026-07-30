import { useEffect, useState } from 'react'
import { ShieldAlert, Plus, CheckCircle2, Clock, Trash2, Search, Bike, User, Calendar, AlertTriangle, Check, Layers } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Fines() {
  const [fines, setFines] = useState([])
  const [motorcycles, setMotorcycles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Active Tab State (Yibanda kuri 'pending' mu gutangira)
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'paid' | 'all'

  // Form States
  const [selectedMoto, setSelectedMoto] = useState('')
  const [selectedDriver, setSelectedDriver] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [refNumber, setRefNumber] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: finesData } = await supabase
        .from('fines')
        .select(`
          *,
          motorcycles (id, plate_number),
          drivers (id, full_name)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      const { data: motoData } = await supabase
        .from('motorcycles')
        .select('id, plate_number')
        .eq('owner_id', user.id)
        .order('plate_number', { ascending: true })

      const { data: driverData } = await supabase
        .from('drivers')
        .select('id, full_name')
        .eq('owner_id', user.id)
        .order('full_name', { ascending: true })

      setFines(finesData || [])
      setMotorcycles(motoData || [])
      setDrivers(driverData || [])
    } catch (err) {
      console.error('Error fetching fines data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleMotoChange = async (motoId) => {
    setSelectedMoto(motoId)
    if (!motoId) return

    const { data: assignData } = await supabase
      .from('driver_assignments')
      .select('driver_id')
      .eq('motorcycle_id', motoId)
      .eq('is_active', true)
      .maybeSingle()

    if (assignData?.driver_id) {
      setSelectedDriver(assignData.driver_id)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedMoto || !amount || !reason || !refNumber || !issueDate) {
      alert('Nyamuneka uzuze imyanya yose yitegeko (*)')
      return
    }

    try {
      setSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from('fines').insert([{
        owner_id: user?.id,
        motorcycle_id: selectedMoto,
        driver_id: selectedDriver || null,
        amount: parseFloat(amount),
        reason: reason.trim(),
        reference_number: refNumber.trim(),
        issue_date: issueDate,
        due_date: dueDate || null,
        status: 'pending'
      }])

      if (error) throw error

      setShowModal(false)
      setSelectedMoto('')
      setSelectedDriver('')
      setAmount('')
      setReason('')
      setRefNumber('')
      setIssueDate(new Date().toISOString().split('T')[0])
      setDueDate('')
      fetchData()
    } catch (err) {
      alert('Ikosa mu kubika fine: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprovePayment = async (fineId) => {
    if (!confirm('Emeza ko aya mafaranga y’amande yishyuwe neza?')) return

    const { error } = await supabase
      .from('fines')
      .update({ status: 'approved' })
      .eq('id', fineId)

    if (!error) fetchData()
  }

  const handleDelete = async (fineId) => {
    if (!confirm('Urakataza gusiba iyi fine?')) return

    const { error } = await supabase
      .from('fines')
      .delete()
      .eq('id', fineId)

    if (!error) fetchData()
  }

  // CALCULATE TOTALS
  const totalFinesAmount = fines.reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
  const paidFinesAmount = fines.filter(f => f.status === 'approved').reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
  const pendingFinesAmount = fines.filter(f => f.status !== 'approved').reduce((sum, f) => sum + (Number(f.amount) || 0), 0)

  const pendingApprovals = fines.filter(f => f.status === 'paid_by_driver')

  // FILTER LOGIC: TAB FILTER + SEARCH FILTER
  const filteredFines = fines
    .filter(f => {
      if (activeTab === 'pending') return f.status !== 'approved'
      if (activeTab === 'paid') return f.status === 'approved'
      return true // 'all'
    })
    .filter(f =>
      f.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.motorcycles?.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.drivers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-black text-ink flex items-center gap-2">
            <ShieldAlert className="text-violet-600 dark:text-violet-400" size={28} /> Traffic Fines Manager
          </h1>
          <p className="text-sm font-bold text-ink-soft">Cunga amande y'ibinyabiziga n'abashoferi bawe</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition whitespace-nowrap"
        >
          <Plus size={18} /> Kwandika Fine Nshya
        </button>
      </div>

      {/* 🚨 ALERT SECTION FOR DRIVER PAYMENT APPROVAL REQUESTS */}
      {pendingApprovals.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-amber-700 dark:text-amber-400 flex items-center gap-2 text-sm uppercase tracking-wide">
              <Clock size={18} className="animate-spin text-amber-500" /> Ubwishyu bw'Amande bw'Abashoferi Butegereje Kwemezwa ({pendingApprovals.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingApprovals.map(fine => (
              <div key={fine.id} className="p-4 rounded-xl bg-paper border border-amber-500/30 shadow-sm flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs text-ink">{fine.reference_number}</span>
                    <span className="bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-500/30">
                      {fine.motorcycles?.plate_number || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs font-black text-ink">{fine.drivers?.full_name || 'Umushoferi'}</p>
                  <p className="text-[11px] font-bold text-ink-soft">{fine.reason}</p>
                  {fine.momo_ref && (
                    <p className="text-[10px] font-mono font-black text-emerald-600 dark:text-emerald-400">MoMo Ref: {fine.momo_ref}</p>
                  )}
                </div>

                <div className="text-right space-y-2">
                  <p className="font-mono font-black text-violet-600 dark:text-violet-400 text-sm">
                    {Number(fine.amount).toLocaleString()} RWF
                  </p>
                  <button
                    onClick={() => handleApprovePayment(fine.id)}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-sm transition"
                  >
                    <Check size={14} /> Emeza Ubwishyu
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLICKABLE INTERACTIVE STAT CARDS (PURPLE THEME FOR FINES) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* CARD 1: PENDING FINES (DEFAULT OPEN TAB) */}
        <button
          onClick={() => setActiveTab('pending')}
          className={`p-5 rounded-2xl border transition-all text-left flex items-center justify-between ${
            activeTab === 'pending'
              ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 shadow-md'
              : 'bg-paper border-line hover:border-amber-500/50 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Atarishyurwa (Pending Fines)</p>
            <h3 className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
              {pendingFinesAmount.toLocaleString()} RWF
            </h3>
            <p className="text-[11px] font-bold text-ink-soft mt-0.5">
              {fines.filter(f => f.status !== 'approved').length} Amande agitegereje
            </p>
          </div>
          <div className={`p-3 rounded-xl ${activeTab === 'pending' ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-600'}`}>
            <Clock size={22} />
          </div>
        </button>

        {/* CARD 2: PAID FINES */}
        <button
          onClick={() => setActiveTab('paid')}
          className={`p-5 rounded-2xl border transition-all text-left flex items-center justify-between ${
            activeTab === 'paid'
              ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
              : 'bg-paper border-line hover:border-emerald-500/50 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Amayishyuwe (Paid Fines)</p>
            <h3 className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {paidFinesAmount.toLocaleString()} RWF
            </h3>
            <p className="text-[11px] font-bold text-ink-soft mt-0.5">
              {fines.filter(f => f.status === 'approved').length} Amande yamaze kwemezwa
            </p>
          </div>
          <div className={`p-3 rounded-xl ${activeTab === 'paid' ? 'bg-emerald-600 text-white' : 'bg-emerald-500/10 text-emerald-600'}`}>
            <CheckCircle2 size={22} />
          </div>
        </button>

        {/* CARD 3: TOTAL ALL FINES (PURPLE THEME) */}
        <button
          onClick={() => setActiveTab('all')}
          className={`p-5 rounded-2xl border transition-all text-left flex items-center justify-between ${
            activeTab === 'all'
              ? 'bg-violet-500/10 border-violet-500 ring-2 ring-violet-500/30 shadow-md'
              : 'bg-paper border-line hover:border-violet-500/50 shadow-sm'
          }`}
        >
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">Yose Hamwe (Total Fines)</p>
            <h3 className="text-xl font-black font-mono text-violet-600 dark:text-violet-400 mt-1">
              {totalFinesAmount.toLocaleString()} RWF
            </h3>
            <p className="text-[11px] font-bold text-ink-soft mt-0.5">{fines.length} Amande yose yanditswe</p>
          </div>
          <div className={`p-3 rounded-xl ${activeTab === 'all' ? 'bg-violet-600 text-white' : 'bg-violet-500/10 text-violet-600'}`}>
            <Layers size={22} />
          </div>
        </button>
      </div>

      {/* Search Bar & Active Tab Title */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-2">
          {activeTab === 'pending' && <><Clock size={16} className="text-amber-500" /> Amande Atarishyurwa (Pending)</>}
          {activeTab === 'paid' && <><CheckCircle2 size={16} className="text-emerald-500" /> Amande Yamaze Kwishyurwa (Paid)</>}
          {activeTab === 'all' && <><Layers size={16} className="text-violet-600 dark:text-violet-400" /> Amande Yose Yanditswe (All Fines)</>}
        </h3>

        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3.5 top-3 text-ink-soft" />
          <input
            type="text"
            placeholder="Shakisha ku Plaque, Driver, Ref..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-line bg-paper text-sm text-ink font-bold focus:outline-none focus:border-violet-500 shadow-sm"
          />
        </div>
      </div>

      {/* Table / List */}
      <div className="bg-paper-raised rounded-2xl border border-line overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-ink-soft font-bold animate-pulse">Iri gushaka amande...</div>
        ) : filteredFines.length === 0 ? (
          <div className="p-8 text-center text-ink-soft font-bold">
            Nta mande yabonetse muri iki cyiciro. 🎉
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-paper text-xs font-black uppercase tracking-wider text-ink-soft">
                  <th className="p-4">Ref Number</th>
                  <th className="p-4">Ikinyabiziga</th>
                  <th className="p-4">Umushoferi</th>
                  <th className="p-4">Ubusobanuro</th>
                  <th className="p-4">Itariki y'Ikosa</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Amafaranga</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Igikorwa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {filteredFines.map(fine => (
                  <tr key={fine.id} className="hover:bg-paper/40 transition-colors">
                    <td className="p-4 font-mono font-black text-ink">{fine.reference_number}</td>
                    <td className="p-4 font-black text-ink whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Bike size={16} className="text-ink-soft" />
                        <span className="plate text-xs font-mono font-black">{fine.motorcycles?.plate_number || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-ink font-black whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User size={16} className="text-ink-soft" />
                        {fine.drivers?.full_name || 'Nta mushoferi'}
                      </div>
                    </td>
                    <td className="p-4 text-ink font-bold max-w-xs truncate">{fine.reason}</td>
                    
                    <td className="p-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 bg-paper text-ink px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-line">
                        <Calendar size={12} /> {fine.issue_date || 'N/A'}
                      </span>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      {fine.due_date ? (
                        <span className="inline-flex items-center gap-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-violet-500/20">
                          <AlertTriangle size={12} /> {fine.due_date}
                        </span>
                      ) : (
                        <span className="text-ink-soft text-xs font-mono">-</span>
                      )}
                    </td>

                    <td className="p-4 font-mono font-black text-violet-600 dark:text-violet-400 whitespace-nowrap">
                      {Number(fine.amount).toLocaleString()} RWF
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {fine.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                          <CheckCircle2 size={12} /> Yishyuwe
                        </span>
                      )}
                      {fine.status === 'paid_by_driver' && (
                        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                          <Clock size={12} className="animate-spin" /> Umushoferi yishyuye
                        </span>
                      )}
                      {fine.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                          <Clock size={12} /> Ntirishyurwa
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap space-x-2">
                      {fine.status !== 'approved' && (
                        <button
                          onClick={() => handleApprovePayment(fine.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-sm transition"
                        >
                          Emeza Ubwishyu
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(fine.id)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-500/10 transition"
                        title="Delete record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL FOR NEW FINE (PURPLE THEME) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-paper rounded-2xl border border-line w-full max-w-md p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-black text-ink flex items-center gap-2">
              <ShieldAlert className="text-violet-600 dark:text-violet-400" size={20} /> Wandike Traffic Fine Nshya
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Hitamo Ikinyabiziga (Plaque) *
                </label>
                <select
                  value={selectedMoto}
                  onChange={e => handleMotoChange(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-violet-500"
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
                  Hitamo Umushoferi (Optionnel)
                </label>
                <select
                  value={selectedDriver}
                  onChange={e => setSelectedDriver(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-violet-500"
                >
                  <option value="">-- Hitamo Umushoferi --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Inimero y'Ikosa / Ref Number *
                </label>
                <input
                  type="text"
                  placeholder="Urugero: RNP-2026-9081"
                  value={refNumber}
                  onChange={e => setRefNumber(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm text-ink font-bold focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                    Itariki Fine Yandikiwe *
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm text-ink font-bold focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                    Itariki y'Inshingano (Due Date)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm text-ink font-bold focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Amafaranga y'Amande (RWF) *
                </label>
                <input
                  type="number"
                  placeholder="25000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm text-ink font-bold focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">
                  Ubusobanuro / Impamvu *
                </label>
                <textarea
                  placeholder="Urugero: Kuza nabi mu muhanda / Kutambara casq..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm text-ink font-bold focus:outline-none focus:border-violet-500"
                  rows={2}
                  required
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
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 font-bold text-white hover:bg-violet-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Iri kubika...' : 'Bika Fine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}