import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const todayStr = () => new Date().toISOString().slice(0, 10)

export function useDashboardStats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const today = todayStr()
    const horizon = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)

    const [
      motorcycles, todaysVersements, activeDebts, insurance, tax, inspections, reminders, savingsGoals, fleetGoals, recentVersements
    ] = await Promise.all([
      supabase.from('motorcycles').select('id, plate_number, status, daily_target'),
      supabase.from('versements').select('motorcycle_id, amount, status').eq('collection_date', today),
      supabase.from('debts').select('id, motorcycle_id, remaining_amount, status').eq('status', 'active'),
      supabase.from('insurance_records').select('id, expiry_date, motorcycles(plate_number)').lte('expiry_date', horizon).gte('expiry_date', today),
      supabase.from('tax_records').select('id, due_date, motorcycles(plate_number)').neq('status', 'paid').lte('due_date', horizon),
      supabase.from('inspections').select('id, next_due_date, motorcycles(plate_number)').lte('next_due_date', horizon).gte('next_due_date', today),
      supabase.from('reminders').select('id, title, due_date, status').eq('status', 'pending').lte('due_date', horizon),
      supabase.from('savings_goals').select('id, goal_name, current_amount, target_amount, status, motorcycles(plate_number)').eq('status', 'active'),
      supabase.from('fleet_savings_goals').select('id, goal_name, current_amount, target_amount, status').eq('status', 'active'),
      supabase.from('versements').select('id, collection_date, amount, status, motorcycles(plate_number)').order('collection_date', { ascending: false }).limit(8)
    ])

    const fleet = motorcycles.data ?? []
    const activeFleet = fleet.filter(m => m.status === 'active')
    const targetTotal = activeFleet.reduce((sum, m) => sum + Number(m.daily_target || 0), 0)
    const collectedTotal = (todaysVersements.data ?? []).reduce((sum, v) => sum + Number(v.amount || 0), 0)
    const motorcyclesReported = new Set((todaysVersements.data ?? []).map(v => v.motorcycle_id)).size

    setData({
      fleetCount: fleet.length,
      statusBreakdown: ['active', 'garage', 'maintenance', 'sold'].map(s => ({ status: s, count: fleet.filter(m => m.status === s).length })),
      targetTotal,
      collectedTotal,
      motorcyclesReported,
      activeFleetCount: activeFleet.length,
      debtCount: activeDebts.data?.length ?? 0,
      debtTotal: (activeDebts.data ?? []).reduce((sum, d) => sum + Number(d.remaining_amount || 0), 0),
      upcoming: {
        insurance: insurance.data ?? [],
        tax: tax.data ?? [],
        inspections: inspections.data ?? [],
        reminders: reminders.data ?? []
      },
      savingsGoals: savingsGoals.data ?? [],
      fleetGoals: fleetGoals.data ?? [],
      recentVersements: recentVersements.data ?? []
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'versements' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motorcycles' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  return { data, loading, refresh: load }
}
