import { LogOut, RefreshCw } from 'lucide-react'
import { Button } from '@voro/ui'
import { useAuth } from '../../hooks/useAuth'
import { useI18n } from '../../i18n/i18n'
import { LanguageSwitch } from './LanguageSwitch'

export function Header() {
  const { logout, user } = useAuth()
  const { t } = useI18n()

  return (
    <header className="flex min-h-16 items-center justify-between gap-3 border-b border-line bg-card px-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{user?.name || 'Admin'}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <LanguageSwitch />
        <Button onClick={() => window.location.reload()} size="sm" type="button" variant="outline">
          <RefreshCw className="size-4" />
          {t('common.refresh')}
        </Button>
        <Button onClick={logout} size="sm" type="button" variant="outline">
          <LogOut className="size-4" />
          {t('common.logout')}
        </Button>
      </div>
    </header>
  )
}
