import { CalendarDays, ClipboardList, LayoutDashboard, Utensils, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n/i18n'

const navItems: Array<{ to: string; labelKey: string; icon: LucideIcon; end?: boolean }> = [
  { to: '/', labelKey: 'nav.activeOrders', icon: ClipboardList, end: true },
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/calendar', labelKey: 'nav.calendar', icon: CalendarDays },
  { to: '/menu', labelKey: 'nav.menu', icon: Utensils },
]

export function RestaurantSidebar() {
  const { t } = useI18n()

  return (
    <>
      <aside className="hidden self-start rounded-voro-lg border border-line bg-card p-2 lg:grid">
      {navItems.map(({ end, icon: Icon, labelKey, to }) => (
        <NavLink
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-voro-md px-3 py-3 text-sm font-bold ${
              isActive ? 'bg-accent text-content' : 'text-muted-foreground'
            }`
          }
          end={end}
          key={to}
          to={to}
        >
          <Icon className="size-4" />
          {t(labelKey)}
        </NavLink>
      ))}
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-card px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_24px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="grid grid-cols-4 gap-1">
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
