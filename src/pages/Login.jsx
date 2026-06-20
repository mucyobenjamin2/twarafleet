import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Bike, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const { session, loading, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  if (!loading && session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    
    const { data: authData, error: err } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, fullName)

    if (err) {
      setError(err.message)
      setBusy(false)
      return
    }

    if (mode === 'signin' && authData?.user) {
      // 1. Fata role y'uwo muntu muri table 'users'
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', authData.user.id)
        .single()

      console.log("Logged in user profile:", profile); // Ubu tuzabona role muri Console

      // 2. Redirect bitewe na role
      if (profile?.role === 'driver') {
        navigate('/driver') 
      } else {
        navigate('/') 
      }
    } else if (mode === 'signup') {
      setNotice('Account created — check your inbox to confirm your email, then sign in.')
    }
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="relative flex flex-1 flex-col justify-between bg-moto-700 px-8 py-10 text-white sm:px-12 lg:py-14">
         <div className="flex items-center gap-2 font-display text-2xl font-bold">
            <Bike className="text-moto-300" /> TwaraFleet
         </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-bold text-ink">
            {mode === 'signin' ? 'Welcome back' : 'Create an account'}
          </h2>
          
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
             {mode === 'signup' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Full name</label>
                <input required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm focus:border-moto-500" />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm focus:border-moto-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Password</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm focus:border-moto-500" />
            </div>

            {error && <p className="rounded-lg bg-rust-100/60 px-3 py-2 text-sm text-rust-600">{error}</p>}
            {notice && <p className="rounded-lg bg-moto-50 px-3 py-2 text-sm text-moto-700">{notice}</p>}

            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-moto-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-moto-600 disabled:opacity-60">
              {busy && <Loader2 size={16} className="animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-soft">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }} className="text-moto-600 hover:underline">
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}