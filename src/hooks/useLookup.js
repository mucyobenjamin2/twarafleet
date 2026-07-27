import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useLookup(table, columns = 'id, *', customFilter = null) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (active) setLoading(false)
          return
        }

        let query = supabase.from(table).select(columns)

        // 🔥 FIX NYAYO: Filter lookup options strictly by logged-in admin owner_id
        if (customFilter && typeof customFilter === 'function') {
          query = customFilter(query, user)
        } else {
          query = query.eq('owner_id', user.id)
        }

        const { data } = await query

        if (active) {
          setOptions(data ?? [])
          setLoading(false)
        }
      } catch (err) {
        console.error(`Error in useLookup for ${table}:`, err.message)
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [table, columns, customFilter])

  return { options, loading }
}
