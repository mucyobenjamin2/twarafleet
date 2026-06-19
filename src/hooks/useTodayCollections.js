import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { isSaturday } from '../lib/format'

const todayStr = () => new Date().toISOString().slice(0, 10)

export function useTodayCollections() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const today = todayStr()
  const saturday = isSaturday(today)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Kuyungurura amamoto gusa ukoresheje .eq('owner_id', user.id)
    const [motos, assignments, versements, nonWorking] = await Promise.all([
      supabase.from('motorcycles').select('id, plate_number, daily_target').eq('status', 'active').eq('owner_id', user.id).order('plate_number'),
      supabase.from('driver_assignments').select('motorcycle_id, driver_id, drivers(full_name)').eq('is_active', true),
      supabase.from('versements').select('*').eq('collection_date', today),
      supabase.from('non_working_days').select('motorcycle_id').eq('date', today)
    ])

    const assignmentByMoto = Object.fromEntries((assignments.data ?? []).map(a => [a.motorcycle_id, a]))
    const versementByMoto = Object.fromEntries((versements.data ?? []).map(v => [v.motorcycle_id, v]))
    const nonWorkingSet = new Set((nonWorking.data ?? []).map(n => n.motorcycle_id))

    setRows((motos.data ?? []).map(m => ({
      motorcycle: m,
      driver: assignmentByMoto[m.id]?.drivers ?? null,
      driverId: assignmentByMoto[m.id]?.driver_id ?? null,
      existing: versementByMoto[m.id] ?? null,
      isNonWorking: nonWorkingSet.has(m.id)
    })))
    setLoading(false)
  }, [today])

  useEffect(() => { load() }, [load])

  return { rows, loading, refresh: load, today, saturday }
}