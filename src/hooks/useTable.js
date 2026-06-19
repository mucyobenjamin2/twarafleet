import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useTable(tableName, options = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      // 1. Gufata umuser winjiye
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 2. Guhamagara amakuru tuyungurura kuri owner_id y'uyu muser
      let query = supabase.from(tableName).select(options.select || '*')
      
      // Fungura amakuru y'uyu muser gusa niba table ifite owner_id
      query = query.eq('owner_id', user.id)

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
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...values, owner_id: user?.id } // Komeka owner_id ku makuru mashya
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