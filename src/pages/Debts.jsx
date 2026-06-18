import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTable } from '../hooks/useTable'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { logActivity, formatRWF, formatDate } from '../lib/format'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { LoadingSpinner, EmptyState } from '../components/Feedback'
import ResourcePage from '../components/ResourcePage'
import { debtConfig } from '../config/entityConfigs'
import { AlertTriangle } from 'lucide-react'

function PaymentForm({ debt, onClose, onSaved }) {
  const { profile } = useAuth()
  const [amount, setAmount] = useState(debt.remaining_amount)
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase.from('debt_payments').insert({
      debt_id: debt.id,
      amount_paid: Number(amount),
      reference_number: reference || null
    }).select().maybeSingle()
    if (err) { setError(err.message); setSaving(false); return }
    await logActivity({ userId: profile?.id, action: 'create', entityType: 'debt_payments', entityId: data?.id, details: { debt_id: debt.id, amount_paid: amount } })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg bg-paper px-3 py-2.5 text-sm">
        <p className="text-ink-soft">Motorcycle <span className="plate ml-1 text-xs">{debt.motorcycles?.plate_number}</span></p>
        <p className="mt-1 text-ink-soft">Remaining: <span className="font-mono text-ink">{formatRWF(debt.remaining_amount)}</span></p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Amount paid (RWF)</label>
        <input type="number" required max={debt.remaining_amount} value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm font-mono focus:border-moto-500" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Reference (optional)</label>
        <input value={reference} onChange={e => setReference(e.target.value)} className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-moto-500" />
      </div>
      {error && <p className="text-sm text-rust-500">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-lg bg-moto-500 px-4 py-2 text-sm font-medium text-white hover:bg-moto-600 disabled:opacity-60">
          {saving ? 'Recording…' : 'Record payment'}
        </button>
      </div>
    </form>
  )
}

export default function Debts() {
  const { rows, loading, refresh } = useTable('debts', { select: '*, motorcycles(plate_number), drivers(full_name)', orderBy: { column: 'debt_date', ascending: false }, filters: [{ column: 'status', value: 'active' }] })
  const [payingDebt, setPayingDebt] = useState(null)

  const totalOutstanding = rows.reduce((sum, d) => sum + Number(d.remaining_amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Debts</h1>
          <p className="text-sm text-ink-soft">Carried-forward shortfalls from missed or partial collections.</p>
        </div>
        <div className="rounded-xl border border-rust-100 bg-rust-100/40 px-4 py-2 text-right">
          <p className="text-xs text-rust-600">Total outstanding</p>
          <p className="font-mono text-lg font-semibold text-rust-600">{formatRWF(totalOutstanding)}</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : rows.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No active debts" message="Every motorcycle is caught up — debts are auto-created when a collection falls short of target." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper-raised scrollbar-thin">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">Motorcycle</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Remaining</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(d => (
                <tr key={d.id} className="border-b border-line last:border-0 hover:bg-paper">
                  <td className="px-4 py-3"><span className="plate text-xs">{d.motorcycles?.plate_number}</span></td>
                  <td className="px-4 py-3 text-ink">{d.drivers?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-soft">{formatDate(d.debt_date)}</td>
                  <td className="px-4 py-3 font-mono text-ink">{formatRWF(d.remaining_amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setPayingDebt(d)} className="flex items-center gap-1 rounded-lg bg-moto-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-moto-600">
                      <Plus size={13} /> Record payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!payingDebt} title="Record debt payment" onClose={() => setPayingDebt(null)}>
        {payingDebt && <PaymentForm debt={payingDebt} onClose={() => setPayingDebt(null)} onSaved={refresh} />}
      </Modal>

      <details className="rounded-2xl border border-line bg-paper-raised p-4">
        <summary className="cursor-pointer font-display text-base font-semibold text-ink">Full debt history (incl. paid &amp; waived)</summary>
        <div className="mt-4">
          <ResourcePage config={debtConfig} />
        </div>
      </details>
    </div>
  )
}
