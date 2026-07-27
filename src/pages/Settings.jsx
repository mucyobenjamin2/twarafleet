import { useState } from 'react'
import OneSignal from 'react-onesignal'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Settings() {
  const { profile, user } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone_number ?? '')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)
  
  // States zo gucunga Push Notifications Status
  const [notifStatus, setNotifStatus] = useState(null)
  const [enablingNotif, setEnablingNotif] = useState(false)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setNotice(null)
    const { error } = await supabase.from('users').update({ full_name: fullName, phone_number: phone }).eq('id', profile.id)
    setNotice(error ? error.message : 'Profile updated.')
    setSaving(false)
  }

  // Function yo gufata no gusaba uruhushya rwa Push Notification
  async function handleEnableNotifications() {
    setEnablingNotif(true)
    setNotifStatus(null)
    try {
      // Saba permission ya OneSignal ku buryo buzira amananiza
      const permission = await OneSignal.Notifications.requestPermission()
      
      if (permission) {
        setNotifStatus('✅ Push Notifications zemejwe neza kuri iyi telefone!')
      } else {
        setNotifStatus('⚠️ Uruhushya rwangijwe. Niba bibaye ngombwa, kanda ku kimenyetso cy\'agafuri 🔒 hafi ya URL muri browser uhe notifications uruhushya.')
      }
    } catch (err) {
      console.error('OneSignal permission error:', err)
      setNotifStatus('❌ Harazamo ikosa mu gusesengura notifications. Koresha browser yakiriye PWA.')
    } finally {
      setEnablingNotif(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Settings</h1>
        <p className="text-sm text-ink-soft">Manage your owner profile and app notifications.</p>
      </div>

      {/* Profile Form */}
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-line bg-paper-raised p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Full name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-moto-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Email</label>
          <input disabled value={user?.email ?? ''} className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink-soft" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Phone number</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-moto-500" />
        </div>
        {notice && <p className="text-sm text-moto-700">{notice}</p>}
        <button type="submit" disabled={saving} className="rounded-lg bg-moto-500 px-4 py-2 text-sm font-medium text-white hover:bg-moto-600 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {/* Push Notifications Card */}
      <div className="space-y-3 rounded-2xl border border-line bg-paper-raised p-4">
        <div>
          <h2 className="text-base font-medium text-ink">Mobile & Browser Push Notifications</h2>
          <p className="text-xs text-ink-soft">
            Kanda hano ngo ukoreshe Notifications kuri iyi telefone, ikujye ikuha "🚨 Wait for Approver!" igihe cyose hari Versement nshya.
          </p>
        </div>

        <button
          type="button"
          onClick={handleEnableNotifications}
          disabled={enablingNotif}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          🔔 {enablingNotif ? 'Gusaba Uruhushya…' : 'Enable Push Notifications'}
        </button>

        {notifStatus && (
          <p className="mt-2 text-xs font-medium text-ink">
            {notifStatus}
          </p>
        )}
      </div>
    </div>
  )
}
