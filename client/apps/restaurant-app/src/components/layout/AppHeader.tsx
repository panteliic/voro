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
    <header className="flex min-h-[4.25rem] items-center border-b border-line bg-card">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{dashboard?.restaurant.name || user.restaurantName}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground sm:hidden">{user.email}</p>
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
