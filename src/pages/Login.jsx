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

  const handleForgotAlert = () => {
    alert(
      "🎯 KURI DRIVER/USER:\n" +
      "Hamagara cyangwa wandikire Admin kuri WhatsApp ngo aguhindurire password nshya mu bitabo.\n\n" +
      "🛠️ KURI ADMIN (Benjamin):\n" +
      "Injira muri Supabase Dashboard yawe, ujye kuri 'Authentication' -> 'Users', ukande kuri email/phone yawe hanyuma uhitemo 'Reset password' cyangwa 'Change password' ubihhindure n'intoki ako kanya!"
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 transition-colors duration-200 px-4 sm:px-6 py-8">
      <div className="w-full max-w-sm space-y-6">
        
        {/* LOGO & TITLE HEADER */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex items-center justify-center bg-[#003d29] shadow-md">
            <img src={twaraLogo} alt="TwaraFleet Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">TwaraFleet</h1>
          <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">Fleet ledger & Invest platform</p>
        </div>

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-[#1e293b] p-5 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl transition-colors duration-200">
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Sign in to account</h2>
          
          <div className="space-y-1">
            <input 
              type="text" 
              required 
              value={identifier} 
              onChange={e => setIdentifier(e.target.value)} 
              className="w-full border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-sm font-bold bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 transition-colors" 
              placeholder="Phone number or Email"
            />
          </div>

          <div className="space-y-1.5">
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-sm font-bold bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 transition-colors" 
              placeholder="Password"
            />
            
            <div className="flex justify-end pt-1">
              <button 
                type="button" 
                onClick={handleForgotAlert}
                className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#003d29] dark:hover:text-emerald-400 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-rose-500 font-bold">{error}</p>}
          
          <button 
            type="submit" 
            disabled={busy} 
            className="w-full bg-[#003d29] hover:bg-[#00291b] text-white p-3 rounded-xl font-black text-sm transition-colors flex justify-center items-center gap-2 shadow-md active:scale-95"
          >
            {busy ? <Loader2 size={18} className="animate-spin text-white" /> : 'Sign in'}
          </button>
        </form>

      </div>
    </div>
  )
}