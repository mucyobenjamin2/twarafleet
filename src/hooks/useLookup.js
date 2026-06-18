import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const cache = {}

export function useLookup(table, columns = 'id, *') {
  const [options, setOptions] = useState(cache[table] ?? [])
  const [loading, setLoading] = useState(!cache[table])

  useEffect(() => {
    let active = true
    async function load() {
      const { data } = await supabase.from(table).select(columns)
      if (active) {
        cache[table] = data ?? []
        setOptions(data ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [table, columns])

  return { options, loading }
}
