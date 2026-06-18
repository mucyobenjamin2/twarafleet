import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Bike, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { session, loading, signIn, signUp } = useAuth()
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
    const { error: err } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, fullName)
    if (err) setError(err.message)
    else if (mode === 'signup') setNotice('Account created — check your inbox to confirm your email, then sign in.')
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="relative flex flex-1 flex-col justify-between bg-moto-700 px-8 py-10 text-white sm:px-12 lg:py-14">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 font-display text-base font-bold">T</div>
          <span className="font-display text-lg font-semibold">TwaraFleet</span>
        </div>

        <div className="max-w-sm">
          <p className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Every plate.<br />Every shift.<br />Accounted for.</p>
          <p className="mt-4 text-sm text-moto-50/80">Daily collections, debts, expenses, and documents for your motorcycle fleet — in one ledger.</p>

          <div className="mt-8 rounded-xl border border-white/15 bg-white/5 p-4 font-mono text-sm">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="rounded border border-white/40 px-2 py-0.5 text-xs tracking-wider">RAD 482 K</span>
              <span className="text-xs text-moto-50/70">Today</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-moto-50/80">
              <span>Target 6,000 RWF</span>
              <span className="text-cash-100">Collected 6,000 RWF</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-moto-50/60">Built for fleet owners who reconcile by the day, not the month.</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 text-ink lg:hidden">
            <Bike size={20} className="text-moto-500" />
            <span className="font-display text-lg font-semibold">TwaraFleet</span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink">{mode === 'signin' ? 'Sign in' : 'Create your account'}</h1>
          <p className="mt-1 text-sm text-ink-soft">{mode === 'signin' ? 'Enter your details to access your fleet.' : 'Set up the owner account for your fleet.'}</p>

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
            <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setNotice(null) }} className="font-medium text-moto-600 underline">
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
