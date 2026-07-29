import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useTable(tableName, options = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase.from(tableName).select(options.select || '*')
      
      if (tableName !== 'expenses' && tableName !== 'versements') {
        query = query.eq('owner_id', user.id)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      setRows(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tableName, options.select])

  const create = async (values) => {
    const { data: { user: adminUser } } = await supabase.auth.getUser()
    const adminId = adminUser?.id
    
    let payload = { ...values, owner_id: adminId }

    // 🏎️ IGIHE ADMIN AREMA UMUSHOFERI MUSHYA
    if (tableName === 'drivers') {
      let finalEmail = values.email?.trim()
      let actualPlateNumber = 'N/A'
      let selectedMotorcycleId = values.plate_number;

      if (selectedMotorcycleId) {
        const { data: motoData } = await supabase
          .from('motorcycles')
          .select('plate_number')
          .eq('id', selectedMotorcycleId)
          .single()
        
        if (motoData?.plate_number) {
          actualPlateNumber = motoData.plate_number
        }
      }
      
      if (!finalEmail || !finalEmail.includes('@')) {
        let cleanPhone = (values.phone_number || values.email || '').replace(/[\s\+\-]/g, '')
        if (cleanPhone.startsWith('0')) cleanPhone = '250' + cleanPhone.substring(1)
        finalEmail = `${cleanPhone}@twarafleet.com`
      }

      // 🔥 FIX NYAYO: Direct REST Fetch yirinda touch-ing Auth State ya Browser!
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          email: finalEmail,
          password: values.password,
          data: {
            full_name: values.full_name,
            role: 'driver',
            motorcycle_plate: actualPlateNumber
          }
        })
      })

      const authData = await response.json()

      if (!response.ok) {
        throw new Error(authData.msg || authData.error_description || "Imbere mu kurema account habonetse ikosa.")
      }

      if (authData?.id || authData?.user?.id) {
        const createdUserId = authData.id || authData.user.id
        payload.auth_user_id = createdUserId
        payload.email = finalEmail

        // Gushyira amakuru muri public.users directly
        const { error: userErr } = await supabase.from('users').insert([{
          auth_user_id: createdUserId,
          email: finalEmail,
          role: 'driver', 
          full_name: values.full_name
        }])
        
        if (userErr) {
          await supabase
            .from('users')
            .update({ role: 'driver' })
            .eq('auth_user_id', createdUserId)
        }
      }

      delete payload.plate_number;
      delete payload.password;
      payload.owner_id = adminId;

      const { data: insertedDriver, error: err } = await supabase.from('drivers').insert([payload]).select().single()
      if (err) throw err

      if (insertedDriver && selectedMotorcycleId) {
        await supabase.from('driver_assignments').insert([{
          owner_id: adminId, 
          motorcycle_id: selectedMotorcycleId,
          driver_id: insertedDriver.id,
          assigned_date: new Date().toISOString().split('T')[0],
          is_active: true
        }])
      }
      
      load()
      return;
    }

    const { error: err } = await supabase.from(tableName).insert([payload])
    if (err) throw err
    load()
  }

  const update = async (id, values) => {
    const { error: err } = await supabase.from(tableName).update(values).eq('id', id)
    if (err) throw err
    load()
  }

  const remove = async (id) => {
    const { error: err } = await supabase.from(tableName).delete().eq('id', id)
    if (err) throw err
    load()
  }

  useEffect(() => { load() }, [load])

  return { rows, loading, error, create, update, remove, refresh: load }
}
