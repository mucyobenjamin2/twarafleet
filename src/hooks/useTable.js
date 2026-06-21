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
      
      // ✅ KURAHO FILTERS KURI EXPENSES NA VERSEMENTS Z'ABASHOFERI
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
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    let payload = { ...values, owner_id: currentUser?.id }

    // 🏎️ IGIHE ADMIN AREMA UMUSHOFERI MUSHYA (NEW DRIVER)
    if (tableName === 'drivers') {
      let finalEmail = values.email?.trim()
      let actualPlateNumber = 'N/A'
      let selectedMotorcycleId = values.plate_number; // Iyi ni UUID ya moto yatorewe mu fomu

      // 1. Shaka plate_number nyayo muri motorcycles table
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

      // 2. Rema account muri Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: finalEmail,
        password: values.password,
        options: {
          data: {
            full_name: values.full_name,
            role: 'driver',
            motorcycle_plate: actualPlateNumber
          }
        }
      })

      if (authErr) throw authErr

      if (authData?.user) {
        payload.auth_user_id = authData.user.id
        payload.email = finalEmail

        const { error: userErr } = await supabase.from('users').insert([{
          auth_user_id: authData.user.id,
          email: finalEmail,
          role: 'driver', 
          full_name: values.full_name
        }])
        
        if (userErr) {
          await supabase
            .from('users')
            .update({ role: 'driver' })
            .eq('auth_user_id', authData.user.id)
        }
      }

      // ✅ KOSORA HANO: Fata ya plate_number uyisindike muri drivers table mu buryo bwa branding
      payload.plate_number = actualPlateNumber;

      // 3. Kubika amakuru muri public.drivers
      const { data: insertedDriver, error: err } = await supabase.from('drivers').insert([payload]).select().single()
      if (err) throw err

      // 4. AUTOMATIC ASSIGNMENT: Komeka ya moto kuri uyu mu-driver muri driver_assignments table
      if (insertedDriver && selectedMotorcycleId) {
        await supabase.from('driver_assignments').insert([{
          owner_id: currentUser?.id,
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