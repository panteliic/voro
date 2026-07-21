import { CalendarDays, ClipboardList, LayoutDashboard, MapPinned, Utensils, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n/i18n'
import type { AuthUser } from '../../types/auth'

const navItems: Array<{ to: string; labelKey: string; icon: LucideIcon; end?: boolean }> = [
  { to: '/', labelKey: 'nav.activeOrders', icon: ClipboardList, end: true },
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/calendar', labelKey: 'nav.calendar', icon: CalendarDays },
  { to: '/menu', labelKey: 'nav.menu', icon: Utensils },
  { to: '/operations', labelKey: 'nav.operations', icon: MapPinned },
]

export function RestaurantSidebar({ restaurantName, user }: { restaurantName: string; user: AuthUser }) {
  const { t } = useI18n()

  return (
    <>
      <aside className="hidden border-b border-line bg-card lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex h-[4.25rem] items-center gap-3 border-b border-line px-5">
          <img src="/logo.svg" alt="Voro" className="size-8 shrink-0 rounded-voro-md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight">{restaurantName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{t('restaurant.console')}</p>
          </div>
        </div>
        <nav className="grid gap-1 px-3 pb-3 pt-5">
          {navItems.map(({ end, icon: Icon, labelKey, to }) => (
            <NavLink
              className={({ isActive }) =>
                `flex min-h-10 items-center gap-3 rounded-voro-md px-3 text-sm font-bold transition-colors ${
                  isActive ? 'bg-accent text-content shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-content'
                }`
              }
              end={end}
              key={to}
              to={to}
            >
              <Icon className="size-4 shrink-0" />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-voro-md bg-muted/70 p-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-action text-xs font-bold text-white">
              {user.name.slice(0, 1).toUpperCase() || 'R'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-content">{user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-card px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_24px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map(({ end, icon: Icon, labelKey, to }) => (
            <NavLink
              className={({ isActive }) =>
                `flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-voro-md px-1 text-[0.65rem] font-bold leading-none transition ${
                  isActive ? 'bg-accent text-content' : 'text-muted-foreground hover:bg-muted hover:text-content'
                }`
              }
              end={end}
              key={to}
              to={to}
            >
              <Icon className="size-5 shrink-0" />
              <span className="max-w-full truncate">{t(labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
