import { Button } from '@voro/ui'
import { LogOut, RefreshCw } from 'lucide-react'
import { useI18n } from '../../i18n/i18n'
import type { AuthUser } from '../../types/auth'
import type { DashboardResponse } from '../../types/restaurant'
import { LanguageSwitch } from './LanguageSwitch'

type AppHeaderProps = {
  dashboard: DashboardResponse | null
  user: AuthUser
  isLoading: boolean
  onRefresh: () => void
  onLogout: () => void
}

export function AppHeader({
  dashboard,
  isLoading,
  onLogout,
  onRefresh,
  user,
}: AppHeaderProps) {
  const { t } = useI18n()

  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-none items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.svg" alt="Voro" className="hidden size-10 shrink-0 rounded-voro-lg min-[360px]:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {dashboard?.restaurant.name || t('restaurant.console')}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5 sm:gap-2">
          <LanguageSwitch />
          <Button aria-label={t('common.refresh')} className="size-9 p-0 sm:w-auto sm:px-3" disabled={isLoading} onClick={onRefresh} size="sm" type="button" variant="outline">
            <RefreshCw className="size-4" />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
          <Button aria-label={t('common.logout')} className="size-9 p-0 sm:w-auto sm:px-3" onClick={onLogout} size="sm" type="button" variant="outline">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">{t('common.logout')}</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
