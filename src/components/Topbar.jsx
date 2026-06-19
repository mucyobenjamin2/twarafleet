import { Menu, Sun, Moon, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext' // Gufata amakuru y'umuser winjiye

export default function Topbar({ onOpenMenu, darkMode, setDarkMode }) {
  const { profile, logout } = useAuth() // profile ikuramo izina, logout igasohora umuser

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-paper-raised px-4 sm:px-6">
      
      {/* IGICE CY'IBUMOSO: Hamburger Menu na Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMenu}
          className="rounded-lg p-1.5 text-ink-soft hover:bg-paper lg:hidden cursor-pointer"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        
        <span className="hidden font-display font-bold text-ink sm:block">
          TwaraFleet
        </span>
      </div>

      {/* IGICE CY'IBURYO: Dark Mode, Izina ry'User, na Log out */}
      <div className="flex items-center gap-4">
        
        {/* Button ya Dark Mode */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="rounded-full border border-line bg-paper p-2 text-ink cursor-pointer hover:bg-paper-raised transition-colors duration-200"
          aria-label="Toggle Dark Mode"
        >
          {darkMode ? <Sun size={18} className="text-cash-500" /> : <Moon size={18} />}
        </button>

        {/* Kwerekana izina n'akanyandiko k'umukoresha winjiye */}
        <div className="flex items-center gap-2 border-l border-line pl-4">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold text-ink">
              {profile?.full_name || profile?.email || 'Boss'}
            </p>
            <p className="text-[10px] text-ink-soft capitalize">
              {profile?.role || 'Owner'}
            </p>
          </div>
          
          <div className="h-8 w-8 rounded-full bg-moto-500 flex items-center justify-center text-white font-semibold text-xs uppercase">
            {profile?.full_name ? profile.full_name.substring(0, 2) : 'TF'}
          </div>
        </div>

        {/* --- BUTTON NSHYA YA LOG OUT --- */}
        <button
          onClick={logout}
          className="rounded-lg border border-rust-200 bg-paper p-2 text-rust-500 cursor-pointer hover:bg-rust-50 hover:text-rust-600 transition-colors duration-200 ml-1"
          title="Log out"
        >
          <LogOut size={18} />
        </button>
        
      </div>
    </header>
  )
}