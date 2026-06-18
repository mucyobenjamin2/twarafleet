import { useState } from 'react'
import { CheckCircle2, Save } from 'lucide-react'
import { useTodayCollections } from '../hooks/useTodayCollections'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { logActivity, formatRWF } from '../lib/format'
import ResourcePage from '../components/ResourcePage'
import { versementConfig } from '../config/entityConfigs'

function QuickRow({ entry, today, onSaved }) {
  const { profile } = useAuth()
  const [amount, setAmount] = useState(entry.existing?.amount ?? entry.motorcycle.daily_target ?? 0)
  const [saving, setSaving] = useState(false)
  const shortfall = Math.max(0, Number(entry.motorcycle.daily_target || 0) - Number(amount || 0))

  async function save() {
    setSaving(true)
    const status = Number(amount) >= Number(entry.motorcycle.daily_target || 0) ? 'paid' : Number(amount) > 0 ? 'partial' : 'unpaid'
    const payload = {
      motorcycle_id: entry.motorcycle.id,
      driver_id: entry.driverId,
      collection_date: today,
      amount: Number(amount),
      status
    }
    const { data, error } = entry.existing
      ? await supabase.from('versements').update(payload).eq('id', entry.existing.id).select().maybeSingle()
      : await supabase.from('versements').insert(payload).select().maybeSingle()
    if (!error) {
      await logActivity({ userId: profile?.id, action: entry.existing ? 'update' : 'create', entityType: 'versements', entityId: data?.id, details: payload })
      onSaved()
    }
    setSaving(false)
  }

  if (entry.isNonWorking) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-line bg-paper px-3.5 py-3 opacity-60">
        <span className="plate text-xs">{entry.motorcycle.plate_number}</span>
        <span className="text-xs text-ink-soft">Marked non-working today</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper px-3.5 py-3">
      <span className="plate text-xs">{entry.motorcycle.plate_number}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">{entry.driver?.full_name ?? 'No driver assigned'}</span>
      <span className="text-xs text-ink-soft">Target {formatRWF(entry.motorcycle.daily_target)}</span>
      <input
        type="number" value={amount} onChange={e => setAmount(e.target.value)}
        className="w-28 rounded-lg border border-line bg-paper-raised px-2.5 py-1.5 font-mono text-sm focus:border-moto-500"
      />
      {shortfall > 0 ? (
        <span className="whitespace-nowrap text-xs text-rust-500">Short {formatRWF(shortfall)}</span>
      ) : (
        <span className="whitespace-nowrap text-xs text-moto-600">Target met</span>
      )}
      <button onClick={save} disabled={saving} className="ml-auto flex items-center gap-1.5 rounded-lg bg-moto-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-moto-600 disabled:opacity-60">
        {entry.existing ? <CheckCircle2 size={14} /> : <Save size={14} />}
        {saving ? 'Saving…' : entry.existing ? 'Recorded' : 'Save'}
      </button>
    </div>
  )
}

export default function Collections() {
  const { rows, loading, refresh, today, saturday } = useTodayCollections()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Collections</h1>
        <p className="text-sm text-ink-soft">Record today's versements, then review the full history below.</p>
      </div>

      <div className="rounded-2xl border border-line bg-paper-raised p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Today's collections</h2>
          <span className="text-xs text-ink-soft">{today}</span>
        </div>
        {saturday ? (
          <p className="rounded-lg bg-moto-50 px-3 py-2.5 text-sm text-moto-700">It's Saturday — no collections are expected fleet-wide today.</p>
        ) : loading ? (
          <p className="py-6 text-center text-sm text-ink-soft">Loading active motorcycles…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">No active motorcycles in the fleet yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(entry => <QuickRow key={entry.motorcycle.id} entry={entry} today={today} onSaved={refresh} />)}
          </div>
        )}
      </div>

      <ResourcePage config={versementConfig} />
    </div>
  )
}
