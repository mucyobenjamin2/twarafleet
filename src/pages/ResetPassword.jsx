import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

import twaraLogo from '../assets/logo.png'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  
  const [validSession, setValidSession] = useState(false)

  // Supabase iba ifite redirectTo inyure neza kugira ngo igire umutekano ku mizi
  useEffect(() => {
    // Kureba niba Supabase yohereje session itunganye hashingiwe ku cyerekezo cy'email
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setValidSession(true)
      } else {
        // Nta session n'isuku n'isuku ntabwo rero waza hano n'intoki
        setError("Habonetse ikosa mu guhindura password (no valid session). Nyamuneka ongera usabe guhindura muri Login.")
        setTimeout(() => navigate('/login', { replace: true }), 4000)
      }
    }
    checkSession()
  }, [navigate])

  async function handleReset(e) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    
    if (password !== confirmPassword) {
      setError("Password zombi ntabwo zihuye.")
      return
    }
    
    if (password.length < 6) {
      setError("Password igomba kugira nibura imibare cyangwa inyuguti 6.")
      return
    }

    setBusy(true)
    
    // Ibyiza bije hano! Supabase iba ifite uburyo bwo guhindura password ifunguye
    const { error: err } = await supabase.auth.updateUser({ password: password })

    if (err) {
      setError(err.message)
      setBusy(false)
    } else {
      setNotice("Password yahindutse neza! 🏁 Turaguhindurira usubire kuri Login.")
      setBusy(false)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          
          <div className="flex flex-col items-center text-center space-y-2 mb-2 lg:mb-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center bg-[#003d29] shadow-md">
              <img src={twaraLogo} alt="TwaraFleet Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-2">TwaraFleet Ledger</h1>
            <p className="text-xs text-ink-soft">Create your new secure password platform</p>
          </div>

          <form onSubmit={handleReset} className="space-y-4 bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-200">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-line pb-1 mb-3">Setup New Password</h2>
            
            <div className="space-y-1">
              <input 
                type="password" 
                required 
                disabled={!validSession}
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#003d29] transition-colors disabled:opacity-50" 
                placeholder="New secure password" 
              />
            </div>

            <div className="space-y-1">
              <input 
                type="password" 
                required 
                disabled={!validSession}
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className="w-full border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-sm bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#003d29] transition-colors disabled:opacity-50" 
                placeholder="Confirm new password" 
              />
            </div>

            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            {notice && <p className="text-xs text-moto-500 font-medium">{notice}</p>}
            
            <button 
              type="submit" 
              disabled={busy || !validSession} 
              className="w-full bg-[#003d29] hover:bg-[#00291b] text-white p-2.5 rounded-lg font-medium text-sm transition-colors flex justify-center items-center gap-2 shadow-sm disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin text-white" /> : 'Set New Password & Platform'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}