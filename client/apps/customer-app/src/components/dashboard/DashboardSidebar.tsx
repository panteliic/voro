import { Avatar, AvatarFallback, Button } from '@voro/ui'
import { ChevronLeft, ChevronRight, LogOut, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n/i18n'
import { dashboardNavItems } from './data/dashboardData'
import { getInitials } from './utils/dashboardUtils'
import type { ActiveSettingsSection, DashboardView } from './types'

type DashboardSidebarProps = {
  activeSettingsSection: ActiveSettingsSection
  activeView: DashboardView
  className?: string
  isCollapsed: boolean
  isLoggingOut: boolean
  name: string
  onNavigate?: () => void
  userName?: string | null
  onLogout: () => void
  onToggleCollapsed: () => void
}

export function DashboardSidebar({
  activeSettingsSection,
  activeView,
  className = '',
  isCollapsed,
  isLoggingOut,
  name,
  onNavigate,
  onLogout,
  onToggleCollapsed,
  userName,
}: DashboardSidebarProps) {
  const { t } = useI18n()

  return (
    <aside
      className={`z-20 flex h-full flex-col overflow-hidden border-r border-line bg-card px-3 py-4 ${className}`}
    >
      <div
        className={`flex gap-2 px-1 ${
          isCollapsed ? 'flex-col items-center' : 'items-center justify-between'
        }`}
      >
        <div className={`flex min-w-0 items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <img src="/logo.svg" alt="Voro" className="h-9 w-9 shrink-0 object-contain" />
          {!isCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-content">{t('sidebar.appName')}</p>
              <p className="truncate text-xs text-muted-foreground">{t('sidebar.workspace')}</p>
            </div>
          ) : null}
        </div>
        <Button
          aria-label={isCollapsed ? t('sidebar.open') : t('sidebar.close')}
          className="shrink-0"
          onClick={onToggleCollapsed}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          {isCollapsed ? <ChevronRight className="size-8" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>

      <nav className="mt-8 grid gap-1">
        {dashboardNavItems.map(({ icon: Icon, id, path }) => {
          const isActive = activeView === id
          const translatedLabel = t(`nav.${id}`)

          return (
            <NavLink
              className={`flex h-10 cursor-pointer items-center gap-3 rounded-voro-md px-3 text-sm font-bold transition ${
                isActive
                  ? 'bg-accent text-content'
                  : 'text-muted-foreground hover:bg-muted hover:text-content'
              } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              key={id}
              title={isCollapsed ? translatedLabel : undefined}
              to={path}
              onClick={onNavigate}
            >
              <Icon className="size-6 shrink-0" />
              {!isCollapsed ? <span>{translatedLabel}</span> : null}
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-auto grid gap-2">
        <NavLink
          className={`flex cursor-pointer items-center gap-3 rounded-voro-md px-3 py-2 text-left text-sm font-bold transition hover:bg-muted ${
            activeView === 'settings' && activeSettingsSection === 'account'
              ? 'bg-accent text-content'
              : 'text-muted-foreground hover:text-content'
          } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
          title={isCollapsed ? t('sidebar.account') : undefined}
          to="/settings/account"
          onClick={onNavigate}
        >
          <Avatar size="lg">
            <AvatarFallback>{getInitials(userName)}</AvatarFallback>
          </Avatar>
          {!isCollapsed ? (
            <span className="min-w-0">
              <span className="block truncate">{name}</span>
              <span className="block truncate text-xs font-medium text-muted-foreground">
                {t('sidebar.account')}
              </span>
            </span>
          ) : null}
        </NavLink>

        <NavLink
          className={`flex h-10 cursor-pointer items-center gap-3 rounded-voro-md px-3 text-sm font-bold transition ${
            activeView === 'settings'
              ? 'bg-accent text-content'
              : 'text-muted-foreground hover:bg-muted hover:text-content'
          } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
          title={isCollapsed ? t('nav.settings') : undefined}
          to="/settings"
          onClick={onNavigate}
        >
          <Settings className="size-6 shrink-0" />
          {!isCollapsed ? <span>{t('nav.settings')}</span> : null}
        </NavLink>

        <Button
          className={`cursor-pointer w-full gap-3 ${isCollapsed ? 'px-0' : 'px-3'} ${isCollapsed ? 'justify-center' : 'justify-start'}`}
          disabled={isLoggingOut}
          onClick={onLogout}
          size={isCollapsed ? 'icon' : 'default'}
          type="button"
          variant="outline"
        >
          <LogOut className="size-4" />
          {!isCollapsed ? (isLoggingOut ? t('common.loggingOut') : t('common.logout')) : null}
        </Button>
      </div>
    </aside>
  )
}
