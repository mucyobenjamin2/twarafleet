import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Bike, UserRound, Link2, Wallet, AlertTriangle, Receipt,
  CalendarOff, PiggyBank, Target, BellRing, ShieldCheck, Landmark, ClipboardCheck,
  FolderOpen, History, Settings as SettingsIcon
} from 'lucide-react'

const GROUPS = [
  { items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    label: 'Fleet',
    items: [
      { to: '/motorcycles', label: 'Motorcycles', icon: Bike },
      { to: '/drivers', label: 'Drivers', icon: UserRound },
      { to: '/assignments', label: 'Assignments', icon: Link2 }
    ]
  },
  {
    label: 'Money',
    items: [
      { to: '/collections', label: 'Collections', icon: Wallet },
      { to: '/debts', label: 'Debts', icon: AlertTriangle },
      { to: '/expenses', label: 'Expenses', icon: Receipt },
      { to: '/savings', label: 'Savings Goals', icon: PiggyBank },
      { to: '/fleet-savings', label: 'Fleet Savings', icon: Target }
    ]
  },
  {
    label: 'Compliance',
    items: [
      { to: '/reminders', label: 'Reminders', icon: BellRing },
      { to: '/insurance', label: 'Insurance', icon: ShieldCheck },
      { to: '/tax', label: 'Tax Records', icon: Landmark },
      { to: '/inspections', label: 'Inspections', icon: ClipboardCheck },
      { to: '/documents', label: 'Documents', icon: FolderOpen },
      { to: '/non-working-days', label: 'Non-Working Days', icon: CalendarOff }
    ]
  },
  {
    label: 'System',
    items: [
      { to: '/activity', label: 'Activity Log', icon: History },
      { to: '/settings', label: 'Settings', icon: SettingsIcon }
    ]
  }
]

export default function Sidebar({ onNavigate }) {
  return (
    <nav className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-5 scrollbar-thin">
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-moto-500 font-display text-base font-bold text-white">T</div>
        <div>
          <p className="font-display text-base font-semibold leading-tight text-ink">TwaraFleet</p>
          <p className="text-[11px] leading-tight text-ink-soft">Fleet ledger</p>
        </div>
      </div>

      {GROUPS.map((group, i) => (
        <div key={i}>
          {group.label && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{group.label}</p>}
          <div className="space-y-0.5">
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-moto-500 text-white' : 'text-ink-soft hover:bg-moto-50 hover:text-moto-700'
                  }`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
