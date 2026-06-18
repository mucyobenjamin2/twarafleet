import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { logActivity } from '../lib/format'

/**
 * Generic list/create/update/delete hook for a Supabase table.
 * select: optional postgrest select string (for joined relation columns)
 */
export function useTable(table, { select = '*', orderBy = { column: 'created_at', ascending: false }, filters = [] } = {}) {
  const { profile } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const orderKey = useMemo(() => JSON.stringify(orderBy), [orderBy])
  const filterKey = useMemo(() => JSON.stringify(filters), [filters])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    let query = supabase.from(table).select(select)
    filters.forEach(f => { query = query.eq(f.column, f.value) })
    if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending })
    const { data, error: err } = await query
    if (err) setError(err.message)
    setRows(data ?? [])
    setLoading(false)
  }, [table, select, orderKey, filterKey])

  useEffect(() => { refresh() }, [refresh])

  const create = useCallback(async (values) => {
    const { data, error: err } = await supabase.from(table).insert(values).select().maybeSingle()
    if (err) throw err
    await logActivity({ userId: profile?.id, action: 'create', entityType: table, entityId: data?.id, details: values })
    await refresh()
    return data
  }, [table, refresh, profile])

  const update = useCallback(async (id, values) => {
    const { data, error: err } = await supabase.from(table).update(values).eq('id', id).select().maybeSingle()
    if (err) throw err
    await logActivity({ userId: profile?.id, action: 'update', entityType: table, entityId: id, details: values })
    await refresh()
    return data
  }, [table, refresh, profile])

  const remove = useCallback(async (id) => {
    const { error: err } = await supabase.from(table).delete().eq('id', id)
    if (err) throw err
    await logActivity({ userId: profile?.id, action: 'delete', entityType: table, entityId: id })
    await refresh()
  }, [table, refresh, profile])

  return { rows, loading, error, refresh, create, update, remove }
}
