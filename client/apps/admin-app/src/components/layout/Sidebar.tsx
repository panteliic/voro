import { NavLink } from 'react-router-dom'
import {
  Bike,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Store,
  Users,
} from 'lucide-react'
import { useI18n } from '../../i18n/i18n'

const navItems = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/users', labelKey: 'nav.users', icon: Users },
  { to: '/restaurants', labelKey: 'nav.restaurants', icon: Store },
  { to: '/drivers', labelKey: 'nav.drivers', icon: Bike },
  { to: '/orders', labelKey: 'nav.orders', icon: ClipboardList },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

export function Sidebar() {
  const { t } = useI18n()

  return (
    <aside className="border-b border-line bg-card lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex h-16 items-center gap-3 border-b border-line px-4">
        <img src="/logo.svg" alt="Voro" className="size-9 shrink-0 rounded-voro-lg" />
        <div>
          <p className="font-bold">{t('sidebar.app')}</p>
          <p className="text-xs text-muted-foreground">{t('sidebar.console')}</p>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto p-3 lg:grid lg:overflow-visible">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              className={({ isActive }) =>
                `inline-flex min-h-10 items-center gap-2 rounded-voro-lg px-3 text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-accent text-content'
                    : 'text-muted-foreground hover:bg-muted hover:text-content'
                }`
              }
              end={item.to === '/'}
              key={item.to}
              to={item.to}
            >
              <Icon className="size-4 shrink-0" />
              {t(item.labelKey)}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
