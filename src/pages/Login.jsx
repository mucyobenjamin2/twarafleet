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

  if (!loading && session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    
    const { data: authData, error: err } = await signIn(email, password)

    if (err) {
      setError(err.message)
      setBusy(false)
      return
    }

    if (authData?.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', authData.user.id)
        .single()

      if (profile?.role === 'driver') {
        navigate('/driver', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    }
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
            <h2 className="text-2xl font-bold">Sign in</h2>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2" placeholder="Email" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full border p-2" placeholder="Password" />
            {error && <p className="text-red-500">{error}</p>}
            <button type="submit" disabled={busy} className="w-full bg-moto-500 text-white p-2">
              {busy ? 'Loading...' : 'Sign in'}
            </button>
        </form>
      </div>
    </div>
  )
}