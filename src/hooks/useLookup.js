import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useLookup(table, columns = 'id, *') {
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

        // 🔥 Filter lookup options strictly by logged-in admin owner_id
        const { data } = await supabase
          .from(table)
          .select(columns)
          .eq('owner_id', user.id)

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
  }, [table, columns]) // 🔥 Fixed dependency array to prevent infinite re-render loops

  return { options, loading }
}