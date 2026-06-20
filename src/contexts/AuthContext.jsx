import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (authUserId) => {
    if (!authUserId) { setProfile(null); return }
    const { data } = await supabase.from('users').select('*').eq('auth_user_id', authUserId).maybeSingle()
    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadProfile(data.session?.user?.id).finally(() => setLoading(false))
    })
    
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      loadProfile(newSession?.user?.id)

      if (event === 'SIGNED_OUT') {
        window.location.href = '/login'
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signIn = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  const signUp = (email, password, fullName) =>
    supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signIn, signUp, signOut, logout: signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}