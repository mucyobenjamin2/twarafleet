import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useDashboardStats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchStats() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const todayObj = new Date()
      const todayStr = todayObj.toISOString().split('T')[0]

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const currentDayName = dayNames[todayObj.getDay()]

      // 1. Fetch motorcycles
      const { data: motorcycles, error: motoErr } = await supabase
        .from('motorcycles')
        .select('*')
        .eq('owner_id', user.id)

      if (motoErr) throw motoErr

      const fleetCount = motorcycles?.length || 0
      const activeFleet = motorcycles?.filter(m => m.status === 'active') || []
      const activeFleetCount = activeFleet.length

      // 2. Fetch today's non-working days
      const { data: todayOffDays } = await supabase
        .from('non_working_days')
        .select('motorcycle_id')
        .eq('owner_id', user.id)
        .eq('date', todayStr)

      const specificOffMotoIds = new Set(todayOffDays?.map(d => d.motorcycle_id) || [])

      // 3. Calculate Target Total
      const targetTotal = activeFleet.reduce((acc, curr) => {
        const motoOffDay = (curr?.off_day || 'saturday').toLowerCase()
        const isWeeklyOff = (motoOffDay === currentDayName)
        const isSpecificOff = specificOffMotoIds.has(curr.id)

        if (isWeeklyOff || isSpecificOff) {
          return acc
        }
        return acc + (parseFloat(curr?.daily_target) || 0)
      }, 0)

      // 4. Fetch TODAY'S PAID VERSEMENTS ONLY
      const { data: todayVersements } = await supabase
        .from('versements')
        .select('amount, motorcycle_id')
        .eq('owner_id', user.id)
        .eq('status', 'paid')
        .eq('collection_date', todayStr)

      const collectedTotal = todayVersements?.reduce((acc, curr) => acc + (parseFloat(curr?.amount) || 0), 0) || 0
      const uniqueReportedMotos = new Set(todayVersements?.map(v => v.motorcycle_id) || [])
      const motorcyclesReported = uniqueReportedMotos.size

      // 5. Fetch ACTIVE DEBTS ONLY
      const { data: activeDebts } = await supabase
        .from('debts')
        .select('remaining_amount')
        .eq('owner_id', user.id)
        .eq('status', 'active')

      const debtCount = activeDebts?.length || 0
      const debtTotal = activeDebts?.reduce((acc, curr) => acc + (parseFloat(curr?.remaining_amount) || 0), 0) || 0

      const statusMap = {}
      motorcycles?.forEach(m => {
        if (m?.status) {
          statusMap[m.status] = (statusMap[m.status] || 0) + 1
        }
      })
      const statusBreakdown = Object.keys(statusMap).map(k => ({ status: k, count: statusMap[k] }))

      setData({
        fleetCount,
        activeFleetCount,
        targetTotal,
        collectedTotal,
        motorcyclesReported,
        debtCount,
        debtTotal,
        statusBreakdown
      })

    } catch (err) {
      console.error('Error fetching dashboard stats hook:', err.message)
      // Fallback empty stats to prevent white screen crash
      setData({
        fleetCount: 0,
        activeFleetCount: 0,
        targetTotal: 0,
        collectedTotal: 0,
        motorcyclesReported: 0,
        debtCount: 0,
        debtTotal: 0,
        statusBreakdown: []
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return { data, loading, refreshStats: fetchStats }
}
