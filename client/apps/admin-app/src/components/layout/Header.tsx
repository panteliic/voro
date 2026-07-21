import { Bell, LogOut, RefreshCw } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@voro/ui'
import { useAuth } from '../../hooks/useAuth'
import { useI18n } from '../../i18n/i18n'
import { LanguageSwitch } from './LanguageSwitch'

export function Header() {
  const { logout, user } = useAuth()
  const { t } = useI18n()
  const { pathname } = useLocation()
  const pageName = pathname === '/' ? t('nav.dashboard') : t('sidebar.console')

  return (
    <header className="admin-header flex min-h-[4.25rem] items-center justify-between gap-3 border-b border-line bg-card px-4 sm:px-6 lg:px-8">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">Voro / <span className="text-content">{pageName}</span></p>
        <p className="mt-1 truncate text-sm font-bold sm:hidden">{user?.name || t('common.admin')}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <LanguageSwitch />
        <Button aria-label={t('common.refresh')} onClick={() => window.location.reload()} size="icon-sm" title={t('common.refresh')} type="button" variant="ghost">
          <RefreshCw className="size-4" />
        </Button>
        <Button aria-label={t('common.notifications')} className="hidden sm:inline-flex" size="icon-sm" title={t('common.notifications')} type="button" variant="ghost">
          <Bell className="size-4" />
        </Button>
        <Button aria-label={t('common.logout')} onClick={logout} size="icon-sm" title={t('common.logout')} type="button" variant="ghost">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  )
}
