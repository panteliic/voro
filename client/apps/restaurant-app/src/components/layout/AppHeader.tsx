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
      <div className="mx-auto flex max-w-none items-center justify-between gap-4 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.svg" alt="Voro" className="size-10 shrink-0 rounded-voro-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {dashboard?.restaurant.name || t('restaurant.console')}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <LanguageSwitch />
          <Button disabled={isLoading} onClick={onRefresh} size="sm" type="button" variant="outline">
            <RefreshCw className="size-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={onLogout} size="sm" type="button" variant="outline">
            <LogOut className="size-4" />
            {t('common.logout')}
          </Button>
        </div>
      </div>
    </header>
  )
}
