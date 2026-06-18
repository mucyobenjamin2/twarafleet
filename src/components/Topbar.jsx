import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, Bell, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Topbar({ onOpenMenu }) {
  const { profile, signOut } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!profile?.id) return
    let active = true
    async function load() {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
      if (active) setUnread(count ?? 0)
    }
    load()
    const interval = setInterval(load, 60000)
    return () => { active = false; clearInterval(interval) }
  }, [profile])

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper-raised/90 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onOpenMenu} className="rounded-lg p-1.5 text-ink hover:bg-paper lg:hidden" aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div>
          <p className="font-display text-sm font-semibold text-ink sm:text-base">{today}</p>
          <p className="text-xs text-ink-soft">{profile?.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'Welcome back'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/notifications" className="relative rounded-lg p-2 text-ink-soft hover:bg-paper hover:text-ink" aria-label="Notifications">
          <Bell size={19} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rust-500 px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
        <button onClick={signOut} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-ink-soft hover:bg-paper hover:text-ink" aria-label="Sign out">
          <LogOut size={16} className="hidden sm:block" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
