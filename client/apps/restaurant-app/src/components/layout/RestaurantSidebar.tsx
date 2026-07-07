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
    <aside className="grid self-start rounded-voro-lg border border-line bg-card p-2">
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
  )
}
