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

      // Niba umuser yasohotse (SIGNED_OUT), mumenyeshe window ihite isubira kuri /login
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login'
      }
      // Niba yinjiye (SIGNED_IN), muherekeze kuri dashboard
      if (event === 'SIGNED_IN' && window.location.pathname === '/login') {
        window.location.href = '/'
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signIn = async (email, password) => {
    const res = await supabase.auth.signInWithPassword({ email, password })
    if (!res.error) {
      window.location.href = '/'
    }
    return res
  }

  const signUp = (email, password, fullName) =>
    supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })

  // Twashyizemo byombi: signOut na logout kugira ngo Topbar itazagira ikibazo
  const signOut = () => supabase.auth.signOut()
  const logout = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signIn, signUp, signOut, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}