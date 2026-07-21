import { NavLink } from 'react-router-dom'
import {
  Bike,
  ClipboardList,
  LayoutDashboard,
  MapPinned,
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
  { to: '/operations', labelKey: 'nav.operations', icon: MapPinned },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

export function Sidebar() {
  const { t } = useI18n()
  const { user } = useAuth()

  return (
    <>
      <aside className="admin-sidebar hidden border-b border-line bg-card lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
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

      <nav className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-card px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_24px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="grid grid-cols-7 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                className={({ isActive }) =>
                  `flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-voro-md px-1 text-[0.6rem] font-bold leading-none transition ${
                    isActive ? 'bg-accent text-content' : 'text-muted-foreground hover:bg-muted hover:text-content'
                  }`
                }
                end={item.to === '/'}
                key={item.to}
                to={item.to}
              >
                <Icon className="size-4 shrink-0" />
                <span className="max-w-full truncate">{t(item.labelKey)}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </>
  )
}
