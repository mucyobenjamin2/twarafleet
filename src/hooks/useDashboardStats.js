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

      // 1. Fetch motorcycles owned by uyu admin
      const { data: motorcycles } = await supabase
        .from('motorcycles')
        .select('*')
        .eq('owner_id', user.id)

      const fleetCount = motorcycles?.length || 0
      const activeFleet = motorcycles?.filter(m => m.status === 'active') || []
      const activeFleetCount = activeFleet.length

      const targetTotal = activeFleet.reduce((acc, curr) => acc + (parseFloat(curr.daily_target) || 0), 0)

      // 2. Fetch TODAY'S PAID VERSEMENTS ONLY (Tukuyeho iziri pending!)
      const todayStr = new Date().toISOString().split('T')[0]
      
      const { data: todayVersements } = await supabase
        .from('versements')
        .select('amount, motorcycle_id')
        .eq('owner_id', user.id)
        .eq('status', 'paid') // 🔥 SOMA IZEMEWE GUSA (APPROVED)
        .gte('created_at', `${todayStr}T00:00:00`)

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
