import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { X } from 'lucide-react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  // 1. Logic ya Dark Mode: Kureba niba yari isanzwe muri localStorage
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })

  // 2. Guhita ihindura <html> tag buri nshuro darkMode ihindutse
  useEffect(() => {
    const root = window.document.documentElement
    if (darkMode) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  return (
    <div className="flex h-screen bg-paper text-ink">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-paper-raised lg:block">
        <Sidebar />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-paper-raised shadow-xl">
            <button onClick={() => setDrawerOpen(false)} className="absolute right-3 top-4 rounded-full p-1.5 text-ink-soft hover:bg-paper" aria-label="Close menu">
              <X size={18} />
            </button>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Hano twahaye Topbar ubushobozi bwo gukoresha Dark Mode */}
        <Topbar 
          onOpenMenu={() => setDrawerOpen(true)} 
          darkMode={darkMode} 
          setDarkMode={setDarkMode} 
        />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}