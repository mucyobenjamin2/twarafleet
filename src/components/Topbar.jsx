import { Menu, Sun, Moon } from 'lucide-react'

export default function Topbar({ onOpenMenu, darkMode, setDarkMode }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-paper-raised px-4 sm:px-6">
      
      {/* IGICE CY'IBUMOSO: Akaboneka gafungura Menu kuri Terefoni (Hamburger Menu) */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMenu}
          className="rounded-lg p-1.5 text-ink-soft hover:bg-paper lg:hidden cursor-pointer"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        
        {/* Izina ry'urubuga cyangwa paji rugaragara kuri PC */}
        <span className="hidden font-display font-bold text-ink sm:block">
          TwaraFleet
        </span>
      </div>

      {/* IGICE CY'IBURYO: Aho dushize ya Button ya Dark Mode n'ibindi bice */}
      <div className="flex items-center gap-4">
        
        {/* --- IYI NI YO BUTTON YA DARK MODE TWAYIZEHO --- */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="rounded-full border border-line bg-paper p-2 text-ink cursor-pointer hover:bg-paper-raised transition-colors duration-200"
          aria-label="Toggle Dark Mode"
        >
          {darkMode ? <Sun size={18} className="text-cash-500" /> : <Moon size={18} />}
        </button>

        {/* Akanyandiko k'Umukoresha (User Profile Avatar) - Gashobora kuba karemye gutya */}
        <div className="h-8 w-8 rounded-full bg-moto-500 flex items-center justify-center text-white font-semibold text-sm">
          TF
        </div>
        
      </div>
    </header>
  )
}