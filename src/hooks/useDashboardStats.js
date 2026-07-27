import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useDashboardStats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchStats() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const todayObj = new Date()
      const todayStr = todayObj.toISOString().split('T')[0]

      // Shaka izina ry'umunsi w'uyu munsi mu muvuno w'inguni y'icyumweru
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const currentDayName = dayNames[todayObj.getDay()]

      // 1. Fetch motorcycles owned by uyu admin
      const { data: motorcycles } = await supabase
        .from('motorcycles')
        .select('*')
        .eq('owner_id', user.id)

      const fleetCount = motorcycles?.length || 0
      const activeFleet = motorcycles?.filter(m => m.status === 'active') || []
      const activeFleetCount = activeFleet.length

      // 🔍 Fetch Specific Non-Working Days recorded for TODAY strictly
      const { data: todayOffDays } = await supabase
        .from('non_working_days')
        .select('motorcycle_id')
        .eq('owner_id', user.id)
        .eq('date', todayStr)

      const specificOffMotoIds = new Set(todayOffDays?.map(d => d.motorcycle_id) || [])

      // 🌟 CALCULATE TARGET TOTAL: Kuramo moto zifite Off-Day uyu munsi!
      const targetTotal = activeFleet.reduce((acc, curr) => {
        const motoOffDay = (curr.off_day || 'saturday').toLowerCase()
        
        // A. Niba uyu munsi ari weekly off-day ya moto
        const isWeeklyOff = (motoOffDay === currentDayName)
        // B. Niba moto yanditswe muri non_working_days y'uyu munsi
        const isSpecificOff = specificOffMotoIds.has(curr.id)

        // Niba iri mu kiruhuko, target yayo ya none ni 0 RWF
        if (isWeeklyOff || isSpecificOff) {
          return acc
        }

        return acc + (parseFloat(curr.daily_target) || 0)
      }, 0)

      // 2. Fetch TODAY'S PAID VERSEMENTS ONLY (Strictly collection_date = todayStr)
      const { data: todayVersements } = await supabase
        .from('versements')
        .select('amount, motorcycle_id')
        .eq('owner_id', user.id)
        .eq('status', 'paid') // 🔥 SOMA IZEMEWE GUSA (APPROVED)
        .eq('collection_date', todayStr) // 🔥 FIX NYAYO: Filter strictly by collection_date = YYYY-MM-DD

      const collectedTotal = todayVersements?.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) || 0
      
      const uniqueReportedMotos = new Set(todayVersements?.map(v => v.motorcycle_id))
      const motorcyclesReported = uniqueReportedMotos.size

      // 3. Fetch ACTIVE DEBTS ONLY
      const { data: activeDebts } = await supabase
        .from('debts')
        .select('remaining_amount')
        .eq('owner_id', user.id)
        .eq('status', 'active') // 🔥 SOMA AMADENI ACTIVE GUSA

      const debtCount = activeDebts?.length || 0
      const debtTotal = activeDebts?.reduce((acc, curr) => acc + (parseFloat(curr.remaining_amount) || 0), 0) || 0

      // Status breakdown
      const statusMap = {}
      motorcycles?.forEach(m => {
        statusMap[m.status] = (statusMap[m.status] || 0) + 1
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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return { data, loading, refreshStats: fetchStats }
}
