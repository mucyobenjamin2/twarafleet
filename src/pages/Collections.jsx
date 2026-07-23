import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatRWF, formatDate } from '../lib/format'
import { Wallet, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default function Collections() {
  const [versements, setVersements] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadCollectionsPipeline() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 🔥 ISUKU NYAYO: Soma versements z'uyu Admin wenyine
      const { data: v, error } = await supabase
        .from('versements')
        .select('*, motorcycles(plate_number), drivers(full_name)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setVersements(v || [])
    } catch (err) {
      console.error('Error loading collections:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCollectionsPipeline()
  }, [])

  if (loading) {
    return <div className="p-6 text-center text-sm text-ink-soft animate-pulse">Iri gushaka ibitabo by'ama-collections...</div>
  }

  // 🔥 FIX NYAYO: Bara AMAFARANGA YEMEWE GUSA (status === 'paid')
  const totalApprovedCollected = versements
    .filter(v => v.status === 'paid')
    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)

  const totalPendingAmount = versements
    .filter(v => v.status === 'pending')
    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Collections Hub</h1>
          <p className="text-sm text-ink-soft">Real-time overview of all reported motorcycle collections.</p>
        </div>
        <button onClick={loadCollectionsPipeline} className="p-2 border border-line rounded-lg text-ink-soft hover:text-ink bg-paper transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* 📊 TOTAL STATS WIDGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {/* Approved Collections */}
        <div className="rounded-2xl border border-line bg-paper-raised p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Total Approved Collected</p>
            <span className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle size={16} />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatRWF(totalApprovedCollected)}
          </p>
          <p className="mt-1 text-xs text-ink-soft">Amafaranga yemejwe neza mu bitabo.</p>
        </div>

        {/* Pending Collections (Not added to total) */}
        <div className="rounded-2xl border border-line bg-paper-raised p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Pending Verification</p>
            <span className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Clock size={16} />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-amber-600 dark:text-amber-500">
            {formatRWF(totalPendingAmount)}
          </p>
          <p className="mt-1 text-xs text-ink-soft">Itegereje ko uyishyiraho Approval.</p>
        </div>
      </div>

      {/* 📋 VERSEMENTS TABLE */}
      <div className="rounded-2xl border border-line bg-paper-raised overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-paper text-xs font-bold uppercase tracking-wider text-ink-soft">
                <th className="p-4">Date</th>
                <th className="p-4">Motorcycle</th>
                <th className="p-4">Driver</th>
                <th className="p-4">Reference No</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm text-ink">
              {versements.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-ink-soft">Nta ma-collections y'ibitabo byawe yabonetse bwa mbere.</td>
                </tr>
              ) : (
                versements.map((v) => (
                  <tr key={v.id} className="hover:bg-paper/40 transition-colors">
                    <td className="p-4 font-mono text-xs">{formatDate(v.created_at)}</td>
                    <td className="p-4">
                      <span className="plate text-[11px] font-mono">{v.motorcycles?.plate_number || '—'}</span>
                    </td>
                    <td className="p-4 font-medium">{v.drivers?.full_name || '—'}</td>
                    <td className="p-4 font-mono text-xs text-ink-soft">{v.reference_number || 'N/A'}</td>
                    <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatRWF(v.amount)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit ${
                        v.status === 'paid' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300/40' 
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300/40 animate-pulse'
                      }`}>
                        {v.status === 'paid' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {v.status === 'paid' ? 'Paid (Approved)' : 'Pending Verification'}
                      </span>
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
