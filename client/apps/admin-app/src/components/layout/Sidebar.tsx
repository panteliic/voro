import { NavLink } from 'react-router-dom'
import {
  Bike,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Store,
  Users,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
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
  const { user } = useAuth()

  return (
    <aside className="admin-sidebar border-b border-line bg-card lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
      <div className="flex h-[4.25rem] items-center gap-3 border-b border-line px-5">
        <img src="/logo.svg" alt="Voro" className="size-8 shrink-0 rounded-voro-md" />
        <div>
          <p className="text-sm font-bold tracking-tight">{t('sidebar.app')}</p>
          <p className="text-[11px] text-muted-foreground">{t('sidebar.console')}</p>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto p-3 lg:grid lg:px-3 lg:pt-5 lg:pb-3">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              className={({ isActive }) =>
                `inline-flex min-h-10 items-center gap-2 rounded-voro-md px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-content shadow-sm'
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
      <div className="mt-auto hidden border-t border-line p-3 lg:block">
        <div className="flex items-center gap-3 rounded-voro-md bg-muted/70 p-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-action text-xs font-bold text-white">
            {user?.name?.slice(0, 1).toUpperCase() || 'A'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-content">{user?.name || 'Admin'}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
