import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

import twaraLogo from '../assets/logo.png'

export default function Login() {
  const { session, loading, signIn } = useAuth()
  const navigate = useNavigate()
  
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!loading && session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    
    let finalEmail = identifier.trim()

    if (!finalEmail.includes('@')) {
      let cleanPhone = finalEmail.replace(/[\s\+\-]/g, '')
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '250' + cleanPhone.substring(1)
      }
      finalEmail = `${cleanPhone}@twarafleet.com`
    }
    
    const { data: authData, error: err } = await signIn(finalEmail, password)

    if (err) {
      setError("Telefone/Email cyangwa Password ntabwo bishobotse. Ongera ugerageze.")
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
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center bg-[#003d29] shadow-md">
              <img src={twaraLogo} alt="TwaraFleet Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-2">TwaraFleet</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Fleet ledger & Invest platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-200">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sign in to account</h2>
            
            <div className="space-y-1">
              <input 
                type="text" 
                required 
                value={identifier} 
                onChange={e => setIdentifier(e.target.value)} 
                className="w-full border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#003d29] transition-colors" 
                placeholder="Phone number or Email" 
              />
            </div>

            <div className="space-y-1">
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#003d29] transition-colors" 
                placeholder="Password" 
              />
            </div>

            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            
            <button 
              type="submit" 
              disabled={busy} 
              className="w-full bg-[#003d29] hover:bg-[#00291b] text-white p-2.5 rounded-lg font-medium text-sm transition-colors flex justify-center items-center gap-2 shadow-sm"
            >
              {busy ? <Loader2 size={16} className="animate-spin text-white" /> : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}