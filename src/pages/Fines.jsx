import { useEffect, useState } from 'react'
import { Plus, CheckCircle, Clock, AlertTriangle, ShieldAlert, CreditCard } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import Modal from '../components/Modal'

export default function Fines() {
  const [fines, setFines] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Form States
  const [driverId, setDriverId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [refNumber, setRefNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    // Fetch Fines
    const { data: finesData } = await supabase
      .from('fines')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    // Fetch Drivers list
    const { data: driversData } = await supabase
      .from('drivers')
      .select('id, full_name, plate_number')
      .eq('owner_id', user.id)

    // Map driver information directly
    const driversMap = (driversData || []).reduce((acc, d) => {
      acc[d.id] = d
      return acc
    }, {})

    const mappedFines = (finesData || []).map(f => ({
      ...f,
      driver_name: driversMap[f.driver_id]?.full_name || 'Driver',
      driver_plate: driversMap[f.driver_id]?.plate_number || 'N/A'
    }))

    setFines(mappedFines)
    setDrivers(driversData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleCreateFine = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('fines').insert([{
      owner_id: user.id,
      driver_id: driverId,
      amount: Number(amount),
      reason,
      reference_number: refNumber,
      status: 'pending'
    }])

    if (!error) {
      setIsModalOpen(false)
      setAmount('')
      setReason('')
      setRefNumber('')
      setDriverId('')
      fetchData()
    } else {
      alert("Error: " + error.message)
    }
    setSubmitting(false)
  }

  const handleApprove = async (fineId) => {
    const { error } = await supabase
      .from('fines')
      .update({ status: 'approved', paid_at: new Date().toISOString() })
      .eq('id', fineId)

    if (!error) fetchData()
  }

  const totalPending = fines.filter(f => f.status !== 'approved').reduce((acc, f) => acc + Number(f.amount), 0)
  const awaitingApprovalCount = fines.filter(f => f.status === 'paid_by_driver').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <ShieldAlert className="text-amber-500" size={28} /> Traffic Fines Management
          </h1>
          <p className="text-sm text-ink-soft">Track, notify, and verify drivers' traffic fine payments.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-amber-600 transition"
        >
          <Plus size={18} /> Record New Traffic Fine
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper-raised p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Total Unpaid Amount</p>
          <p className="mt-2 text-2xl font-bold text-rose-600">{totalPending.toLocaleString()} RWF</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper-raised p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Awaiting Admin Confirmation</p>
          <p className="mt-2 text-2xl font-bold text-amber-500">{awaitingApprovalCount} Fine(s)</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper-raised p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Total Fines Logged</p>
          <p className="mt-2 text-2xl font-bold text-ink">{fines.length}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading fines records...</p>
      ) : fines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center">
          <ShieldAlert className="mx-auto mb-2 text-ink-soft" size={32} />
          <p className="font-medium text-ink">No Traffic Fines Logged</p>
          <p className="text-xs text-ink-soft">When a driver is fined, record it here so they can clear it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fines.map(fine => (
            <div 
              key={fine.id} 
              className={`relative flex flex-col justify-between rounded-2xl border p-5 transition shadow-sm ${
                fine.status === 'paid_by_driver' 
                  ? 'border-amber-400 bg-amber-50/30' 
                  : fine.status === 'approved' 
                  ? 'border-emerald-200 bg-emerald-50/20' 
                  : 'border-line bg-paper-raised'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">Ref: {fine.reference_number}</span>
                  {fine.status === 'approved' && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      <CheckCircle size={12} /> Paid & Cleared
                    </span>
                  )}
                  {fine.status === 'paid_by_driver' && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 animate-pulse">
                      <Clock size={12} /> Waiting Approval
                    </span>
                  )}
                  {fine.status === 'pending' && (
                    <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                      <AlertTriangle size={12} /> Unpaid
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-ink text-base">{fine.driver_name}</h3>
                  <p className="text-xs text-ink-soft">{fine.driver_plate}</p>
                </div>

                <div className="rounded-xl bg-paper p-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-soft">Reason:</span>
                    <span className="font-medium text-ink">{fine.reason}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-soft">Amount:</span>
                    <span className="font-bold text-rose-600">{Number(fine.amount).toLocaleString()} RWF</span>
                  </div>
                  {fine.momo_ref && (
                    <div className="flex justify-between text-xs border-t border-line pt-1 mt-1">
                      <span className="text-ink-soft">MoMo Ref:</span>
                      <span className="font-mono text-emerald-600 font-bold">{fine.momo_ref}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-line pt-3">
                {fine.status === 'paid_by_driver' ? (
                  <button
                    onClick={() => handleApprove(fine.id)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                  >
                    <CheckCircle size={14} /> Confirm & Approve Payment
                  </button>
                ) : fine.status === 'approved' ? (
                  <p className="text-center text-xs text-emerald-600 font-medium">Cleared on {new Date(fine.paid_at || fine.created_at).toLocaleDateString()}</p>
                ) : (
                  <p className="text-center text-xs text-ink-soft flex items-center justify-center gap-1">
                    <CreditCard size={12} /> Driver notified to pay
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={isModalOpen} title="Record Traffic Fine" onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleCreateFine} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Select Driver</label>
            <select
              required
              value={driverId}
              onChange={e => setDriverId(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm focus:border-amber-500"
            >
              <option value="">-- Choose Driver --</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.full_name} ({d.plate_number})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">RRA / Traffic Ref Number</label>
            <input
              required
              placeholder="e.g. 24072900891"
              value={refNumber}
              onChange={e => setRefNumber(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Fine Reason (Ikosa)</label>
            <input
              required
              placeholder="e.g. Over-speeding / Red Light"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Amount (RWF)</label>
            <input
              required
              type="number"
              placeholder="10000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Save Traffic Fine'}
          </button>
        </form>
      </Modal>
    </div>
  )
}